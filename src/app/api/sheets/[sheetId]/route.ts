import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { calculateFinalBalances, calculatePrivateMatrix, calculateDebts } from '@/services/expenseService';
import { Bill } from '@/types/expense';

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

        const bills: Bill[] = sheet.expenses.map(e => {
            const beneficiaries = e.splits.map(s => s.member.name);
            return {
                id: e.id,
                amount: e.amount,
                payer: e.payer.name,
                type: e.type as 'SHARED' | 'PRIVATE',
                beneficiaries: beneficiaries,
                note: e.description,
                date: e.date, // Map date
                isSettled: e.isSettled
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
        const sheetId = parseInt((await params).sheetId);
        const body = await request.json();
        const { name } = body;

        const sheet = await prisma.sheet.update({
            where: { id: sheetId },
            data: { name }
        });

        return NextResponse.json(sheet);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

// DELETE Sheet (Cascading)
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ sheetId: string }> }
) {
    try {
        const sheetId = parseInt((await params).sheetId);

        // Transaction to delete everything related to sheet
        await prisma.$transaction(async (tx: any) => {
            // 1. Delete all splits of expenses in this sheet
            // We need to find expenses first
            const expenseIds = await tx.expense.findMany({
                where: { sheetId },
                select: { id: true }
            });
            const ids = expenseIds.map((e: any) => e.id);

            if (ids.length > 0) {
                await tx.split.deleteMany({
                    where: { expenseId: { in: ids } }
                });
            }

            // 2. Delete expenses
            await tx.expense.deleteMany({
                where: { sheetId }
            });

            // 3. Delete sheet
            await tx.sheet.delete({
                where: { id: sheetId }
            });
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
