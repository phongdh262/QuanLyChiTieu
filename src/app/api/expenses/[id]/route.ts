import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// UPDATE Expense
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const id = parseInt((await params).id);
        const body = await request.json();
        const { amount, description, payerId, type, beneficiaryIds } = body;

        // Transaction: Update expense + Re-do splits
        await prisma.$transaction(async (tx: any) => {
            // 1. Get Expense to find Sheet -> Workspace
            const expense = await tx.expense.findUnique({
                where: { id },
                include: { sheet: true }
            });
            if (!expense) throw new Error('Expense not found');

            // 2. Update Expense Details
            await tx.expense.update({
                where: { id },
                data: {
                    amount,
                    description,
                    type,
                    payerId
                }
            });

            // 3. Delete Old Splits
            await tx.split.deleteMany({
                where: { expenseId: id }
            });

            // 4. Create New Splits
            let splitMembers = [];

            if (type === 'SHARED') {
                // Fetch all members in workspace
                const allMembers = await tx.member.findMany({
                    where: { workspaceId: expense.sheet.workspaceId }
                });
                splitMembers = allMembers.map((m: any) => m.id);
            } else {
                splitMembers = beneficiaryIds;
            }

            if (splitMembers.length > 0) {
                const splitAmount = amount / splitMembers.length;
                await tx.split.createMany({
                    data: splitMembers.map((mId: number) => ({
                        expenseId: id,
                        memberId: mId,
                        amount: splitAmount
                    }))
                });
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

// DELETE Expense
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const id = parseInt((await params).id);

        // Transaction to delete splits then expense
        await prisma.$transaction(async (tx: any) => {
            await tx.split.deleteMany({
                where: { expenseId: id }
            });
            await tx.expense.delete({
                where: { id: id }
            });
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 });
    }
}
