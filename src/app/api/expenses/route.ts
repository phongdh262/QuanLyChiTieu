import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { logActivity } from '@/lib/logger';

export async function POST(req: Request) {
    try {
        const session = await getSession();
        const actorId = session ? (session.id as number) : 0;
        const actorName = session ? (session.name as string) : 'Unknown';

        const body = await req.json();
        const { sheetId, payerId, amount, description, type, beneficiaryIds } = body;

        // 1. Validation
        if (!sheetId || !payerId || !amount || !type) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 2. Determine Splits
        let splitMembers = [];
        let workspaceId = 0;

        if (type === 'SHARED') {
            const sheet = await prisma.sheet.findUnique({
                where: { id: sheetId },
                include: { workspace: { include: { members: true } } }
            });
            if (!sheet) return NextResponse.json({ error: 'Sheet not found' }, { status: 404 });
            splitMembers = sheet.workspace.members;
            workspaceId = sheet.workspaceId;
        } else {
            // PRIVATE
            if (!beneficiaryIds || beneficiaryIds.length === 0) {
                return NextResponse.json({ error: 'Private bills require beneficiaries' }, { status: 400 });
            }
            // Fetch sheet to get workspaceId
            const sheet = await prisma.sheet.findUnique({ where: { id: sheetId } });
            if (!sheet) return NextResponse.json({ error: 'Sheet not found' }, { status: 404 });
            workspaceId = sheet.workspaceId;

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

        // 4. Log Activity
        await logActivity(
            workspaceId,
            actorId,
            actorName,
            'CREATE',
            'EXPENSE',
            expense.id,
            `Đã thêm khoản chi: ${description} (${amount.toLocaleString('vi-VN')}đ)`
        );

        return NextResponse.json(expense);

    } catch (error) {
        console.error('Error creating expense:', error);
        return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 });
    }
}
