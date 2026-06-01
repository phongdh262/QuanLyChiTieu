import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { logActivity } from '@/lib/logger';
import { createExpenseSchema } from '@/lib/schemas';
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

        // Zod Validation
        const validation = createExpenseSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 });
        }
        const { sheetId, payerId, amount, description, type, beneficiaryIds, date } = validation.data;

        // 2. Determine Splits and Verify Access
        let splitMembers = [];

        const sheet = await prisma.sheet.findUnique({
            where: { id: sheetId },
            include: { workspace: { include: { members: true } } }
        });
        if (!sheet) return NextResponse.json({ error: 'Sheet not found' }, { status: 404 });

        if (sheet.status === 'LOCKED') {
            return NextResponse.json({ error: 'Sheet đã bị khóa, không thể thêm khoản chi' }, { status: 403 });
        }

        const isMember = sheet.workspace.members.some((member) => member.id === actorId);
        if (!isMember) {
            return NextResponse.json({ error: 'Forbidden: You are not a member of this workspace' }, { status: 403 });
        }

        const workspaceId = sheet.workspaceId;
        const activeSheetMembers = await getActiveSheetMembers(prisma, sheetId, workspaceId);
        const activeSheetMemberIds = new Set(activeSheetMembers.map((member) => member.id));

        if (!activeSheetMemberIds.has(payerId)) {
            return NextResponse.json({ error: 'Người trả tiền không thuộc danh sách user tham gia tháng này' }, { status: 400 });
        }

        if (type === 'SHARED') {
            splitMembers = activeSheetMembers;
        } else {
            if (!beneficiaryIds || beneficiaryIds.length === 0) {
                return NextResponse.json({ error: 'Private bills require beneficiaries' }, { status: 400 });
            }

            const uniqueBeneficiaryIds = [...new Set(beneficiaryIds)];
            const hasInvalidBeneficiary = uniqueBeneficiaryIds.some((id) => !activeSheetMemberIds.has(id));

            if (hasInvalidBeneficiary) {
                return NextResponse.json({ error: 'Người thụ hưởng phải thuộc danh sách user tham gia tháng này' }, { status: 400 });
            }

            splitMembers = activeSheetMembers.filter((member) => uniqueBeneficiaryIds.includes(member.id));
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
                    date: date ? new Date(date) : new Date(),
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
            `Đã thêm khoản chi: ${description} (${amount.toLocaleString('vi-VN')}đ)`,
            sheetId
        );

        return NextResponse.json(expense);

    } catch (error) {
        console.error('Error creating expense:', error);
        return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 });
    }
}
