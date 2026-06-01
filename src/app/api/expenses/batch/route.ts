import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { logActivity } from '@/lib/logger';
import { createBatchExpenseSchema } from '@/lib/schemas';
import { getActiveSheetMembers } from '@/lib/sheetMembers';

export async function POST(req: Request) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized: Session required' }, { status: 401 });
        }
        const actorId = session.id as number;
        const actorName = session.name as string;

        const body = await req.json();

        // Validate batch
        const validation = createBatchExpenseSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 });
        }

        const { expenses: expenseInputs } = validation.data;

        // Pre-validate: all expenses must belong to same sheet
        const sheetIds = [...new Set(expenseInputs.map(e => e.sheetId))];
        if (sheetIds.length !== 1) {
            return NextResponse.json({ error: 'All expenses must belong to the same sheet' }, { status: 400 });
        }

        const sheetId = sheetIds[0];

        // Fetch sheet with workspace + members
        const sheet = await prisma.sheet.findUnique({
            where: { id: sheetId },
            include: { workspace: { include: { members: true } } }
        });

        if (!sheet) {
            return NextResponse.json({ error: 'Sheet not found' }, { status: 404 });
        }

        if (sheet.status === 'LOCKED') {
            return NextResponse.json({ error: 'Sheet đã bị khóa, không thể thêm khoản chi' }, { status: 403 });
        }

        // Security: actor must be a member
        const isMember = sheet.workspace.members.some((member) => member.id === actorId);
        if (!isMember) {
            return NextResponse.json({ error: 'Forbidden: You are not a member of this workspace' }, { status: 403 });
        }

        const workspaceId = sheet.workspaceId;
        const activeSheetMembers = await getActiveSheetMembers(prisma, sheetId, workspaceId);
        const activeSheetMemberIds = new Set(activeSheetMembers.map((member) => member.id));

        // Validate payers and private expense beneficiaries against this sheet's active members.
        for (const input of expenseInputs) {
            if (!activeSheetMemberIds.has(input.payerId)) {
                return NextResponse.json(
                    { error: `Người trả tiền của khoản "${input.description}" không thuộc danh sách user tham gia tháng này` },
                    { status: 400 }
                );
            }

            if (input.type === 'PRIVATE') {
                if (!input.beneficiaryIds || input.beneficiaryIds.length === 0) {
                    return NextResponse.json(
                        { error: `Private expense "${input.description}" requires beneficiaries` },
                        { status: 400 }
                    );
                }

                const uniqueBeneficiaryIds = [...new Set(input.beneficiaryIds)];
                const hasInvalidBeneficiary = uniqueBeneficiaryIds.some((id) => !activeSheetMemberIds.has(id));

                if (hasInvalidBeneficiary) {
                    return NextResponse.json(
                        { error: `Người thụ hưởng của khoản "${input.description}" phải thuộc danh sách user tham gia tháng này` },
                        { status: 400 }
                    );
                }
            }
        }

        // Atomic transaction: create all expenses + splits
        const createdExpenses = await prisma.$transaction(async (tx) => {
            const results = [];

            for (const input of expenseInputs) {
                const { payerId, amount, description, type, beneficiaryIds, date } = input;

                // Determine split members
                let splitMembers;
                if (type === 'SHARED') {
                    splitMembers = activeSheetMembers;
                } else {
                    const uniqueBeneficiaryIds = [...new Set(beneficiaryIds!)];
                    splitMembers = activeSheetMembers.filter((member) => uniqueBeneficiaryIds.includes(member.id));
                }

                if (splitMembers.length === 0) {
                    throw new Error(`No beneficiaries found for "${description}"`);
                }

                const amountPerPerson = amount / splitMembers.length;

                // Create expense
                const newExpense = await tx.expense.create({
                    data: {
                        sheetId,
                        payerId,
                        amount,
                        description,
                        type,
                        date: date ? new Date(date) : new Date(),
                    }
                });

                // Create splits
                    await tx.split.createMany({
                        data: splitMembers.map((member) => ({
                            expenseId: newExpense.id,
                            memberId: member.id,
                            amount: amountPerPerson
                        }))
                    });

                results.push(newExpense);
            }

            return results;
        });

        // Log activities (outside transaction for performance)
        for (const expense of createdExpenses) {
            await logActivity(
                workspaceId,
                actorId,
                actorName,
                'CREATE',
                'EXPENSE',
                expense.id,
                `Đã thêm khoản chi: ${expense.description} (${expense.amount.toLocaleString('vi-VN')}đ)`,
                sheetId
            );
        }

        return NextResponse.json({
            expenses: createdExpenses,
            count: createdExpenses.length,
            message: `Đã thêm ${createdExpenses.length} khoản chi thành công`
        });

    } catch (error) {
        console.error('Error creating batch expenses:', error);
        return NextResponse.json({ error: 'Failed to create batch expenses' }, { status: 500 });
    }
}
