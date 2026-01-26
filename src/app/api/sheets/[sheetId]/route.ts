import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { calculateFinalBalances, calculatePrivateMatrix, calculateDebts } from '@/services/expenseService';
import { Bill } from '@/types/expense';
import { getSession } from '@/lib/auth';
import { logActivity } from '@/lib/logger';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ sheetId: string }> }
) {
    try {
        const sheetId = parseInt((await params).sheetId);

        // 1. Fetch Sheet Data with Relation
        const sheet = await prisma.sheet.findUnique({
            where: { id: sheetId },
            include: {
                expenses: {
                    include: {
                        payer: {
                            select: { id: true, name: true, email: true, username: true, role: true, status: true, workspaceId: true }
                        },
                        splits: {
                            include: {
                                member: {
                                    select: { id: true, name: true, email: true, username: true, role: true, status: true, workspaceId: true }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (!sheet) {
            return NextResponse.json({ error: 'Sheet not found' }, { status: 404 });
        }

        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check if user is member of the workspace
        const isMember = await prisma.member.findFirst({
            where: {
                workspaceId: sheet.workspaceId,
                id: Number(session.id)
            }
        });

        if (!isMember) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // 2. Fetch ALL Workspace Members (including DELETED) for calculations
        // This ensures historical expenses are calculated correctly
        const allMembers = await prisma.member.findMany({
            where: { workspaceId: sheet.workspaceId },
            select: { id: true, name: true, email: true, username: true, role: true, status: true, workspaceId: true }
        });

        // 3. Filter active members for UI (dropdowns, member list)
        const activeMembers = allMembers.filter(m => m.status !== 'DELETED');

        // 4. Transform DB Data to Service Types
        // Use ALL members for calculation to preserve historical data
        const allMemberNames = allMembers.map(m => m.name);

        const bills: Bill[] = sheet.expenses.map((e: any) => {
            const beneficiaries = e.splits.map((s: any) => s.member.name);
            return {
                id: e.id,
                amount: e.amount,
                payer: e.payer.name,
                type: e.type as 'SHARED' | 'PRIVATE',
                beneficiaries: beneficiaries,
                note: e.description,
                date: e.date, // Map date
                isSettled: e.isSettled,
                splits: e.splits.map((s: any) => ({
                    member: { name: s.member.name },
                    isPaid: s.isPaid,
                    isPending: s.isPending,
                    paidAt: s.paidAt,
                    amount: s.amount
                }))
            };
        });

        // 5. Run Calculations with ALL members (preserves historical data)
        const { balances, stats, privateBalances } = calculateFinalBalances(allMemberNames, bills);
        const { matrix, totals: matrixTotals } = calculatePrivateMatrix(allMemberNames, bills);
        const globalDebts = calculateDebts(balances);
        const privateDebts = calculateDebts(privateBalances);

        return NextResponse.json({
            sheet,
            members: activeMembers, // UI only sees active members
            allMembers: allMembers, // Include all members for reference
            calculations: {
                balances,
                stats,
                privateBalances,
                matrix: { matrix, totals: matrixTotals },
                globalDebts,
                privateDebts
            }
        });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
// UPDATE Sheet Name
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ sheetId: string }> }
) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const actorId = session.id as number;
        const actorName = session.name as string;

        const sheetId = parseInt((await params).sheetId);
        const body = await request.json();
        const { name } = body;

        // Check membership/permissions
        const existingSheet = await prisma.sheet.findUnique({
            where: { id: sheetId },
            include: { workspace: true }
        });

        if (!existingSheet) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        const isMember = await prisma.member.findFirst({
            where: {
                workspaceId: existingSheet.workspaceId,
                id: actorId
            }
        });

        if (!isMember) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // CHECK DUPLICATE NAME
        const duplicateSheet = await prisma.sheet.findFirst({
            where: {
                workspaceId: existingSheet.workspaceId,
                name: name,
                status: { not: 'DELETED' },
                id: { not: sheetId }
            }
        });

        if (duplicateSheet) {
            return NextResponse.json({ error: `Tên bảng "${name}" đã tồn tại!` }, { status: 409 });
        }

        const sheet = await prisma.sheet.update({
            where: { id: sheetId },
            data: { name }
        });

        await logActivity(
            sheet.workspaceId,
            actorId,
            actorName,
            'UPDATE',
            'SHEET',
            sheet.id,
            `Đã đổi tên bảng chi tiêu thành: ${name}`,
            sheet.id
        );

        return NextResponse.json(sheet);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

// DELETE Sheet (Soft Delete)
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ sheetId: string }> }
) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const actorId = session.id as number;
        const actorName = session.name as string;

        const sheetId = parseInt((await params).sheetId);

        // Check membership/permissions for DELETE
        const existingSheet = await prisma.sheet.findUnique({
            where: { id: sheetId },
            include: { workspace: true }
        });

        if (!existingSheet) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        const isMember = await prisma.member.findFirst({
            where: {
                workspaceId: existingSheet.workspaceId,
                id: actorId
            }
        });

        if (!isMember) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Update status instead of deleting
        const sheet = await prisma.sheet.update({
            where: { id: sheetId },
            data: { status: 'DELETED' }
        });

        // Log the deletion
        await logActivity(
            sheet.workspaceId,
            actorId,
            actorName,
            'DELETE',
            'SHEET',
            sheet.id,
            `Đã xóa bảng chi tiêu: ${sheet.name}`,
            sheet.id
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
