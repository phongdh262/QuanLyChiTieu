import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { sheetId, payerId, amount, description, type, beneficiaryIds } = body;

        // 1. Validation
        if (!sheetId || !payerId || !amount || !type) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 2. Determine Splits
        let splitMembers = [];
        if (type === 'SHARED') {
            // Get all members of the workspace this sheet belongs to
            const sheet = await prisma.sheet.findUnique({
                where: { id: sheetId },
                include: { workspace: { include: { members: true } } }
            });
            if (!sheet) return NextResponse.json({ error: 'Sheet not found' }, { status: 404 });
            splitMembers = sheet.workspace.members;
        } else {
            // PRIVATE: User selected beneficiaries
            if (!beneficiaryIds || beneficiaryIds.length === 0) {
                return NextResponse.json({ error: 'Private bills require beneficiaries' }, { status: 400 });
            }
            // Verify members exist
            splitMembers = await prisma.member.findMany({
                where: { id: { in: beneficiaryIds } }
            });
        }

        if (splitMembers.length === 0) {
            return NextResponse.json({ error: 'No beneficiaries found for split' }, { status: 400 });
        }

        const amountPerPerson = amount / splitMembers.length;

        // 3. Transactional Write
        const expense = await prisma.$transaction(async (tx) => {
            // Create Expense
            const newExpense = await tx.expense.create({
                data: {
                    sheetId,
                    payerId,
                    amount,
                    description,
                    type,
                }
            });

            // Create Splits
            await tx.split.createMany({
                data: splitMembers.map(m => ({
                    expenseId: newExpense.id,
                    memberId: m.id,
                    amount: amountPerPerson
                }))
            });

            return newExpense;
        });

        return NextResponse.json(expense);

    } catch (error) {
        console.error('Error creating expense:', error);
        return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 });
    }
}
