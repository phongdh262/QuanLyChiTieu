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
                        payer: true,
                        splits: { include: { member: true } }
                    }
                }
            }
        });

        if (!sheet) {
            return NextResponse.json({ error: 'Sheet not found' }, { status: 404 });
        }

        // 2. Fetch Workspace Members
        const members = await prisma.member.findMany({
            where: { workspaceId: sheet.workspaceId }
        });

        // 3. Transform DB Data to Service Types
        const memberNames = members.map(m => m.name);

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

        // 4. Run Calculations
        const { balances, stats, privateBalances } = calculateFinalBalances(memberNames, bills);
        const { matrix, totals: matrixTotals } = calculatePrivateMatrix(memberNames, bills);
        const globalDebts = calculateDebts(balances);
        const privateDebts = calculateDebts(privateBalances);

        return NextResponse.json({
            sheet,
            members,
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
        const actorId = session ? (session.id as number) : 0;
        const actorName = session ? (session.name as string) : 'Hệ thống';

        const sheetId = parseInt((await params).sheetId);
        const body = await request.json();
        const { name } = body;

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
            `Đã đổi tên bảng chi tiêu thành: ${name}`
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
        const actorId = session ? (session.id as number) : 0;
        const actorName = session ? (session.name as string) : 'Hệ thống';

        const sheetId = parseInt((await params).sheetId);

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
            `Đã xóa bảng chi tiêu: ${sheet.name}`
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
