import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { logActivity } from '@/lib/logger';
import { createExpenseSchema } from '@/lib/schemas';

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
        let workspaceId = 0;

        if (type === 'SHARED') {
            const sheet = await prisma.sheet.findUnique({
                where: { id: sheetId },
                include: { workspace: { include: { members: true } } }
            });
            if (!sheet) return NextResponse.json({ error: 'Sheet not found' }, { status: 404 });

            // SECURITY CHECK: Ensure actor belongs to workspace
            const isMember = sheet.workspace.members.some((m: any) => m.id === actorId);
            // Note: Since member.id is distinct from User ID in this schema (Member table has auth fields), 
            // we must assume session.id refers to Member.id as per login route logic.
            // However, looking at schema, Member has ownerId (string) but session stores Member ID (int).
            // Let's verify login route. Login creates session with member.id. 
            // So session.id == Member.id.

            if (!isMember) {
                return NextResponse.json({ error: 'Forbidden: You are not a member of this workspace' }, { status: 403 });
            }

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
            `Đã thêm khoản chi: ${description} (${amount.toLocaleString('vi-VN')}đ)`
        );

        return NextResponse.json(expense);

    } catch (error) {
        console.error('Error creating expense:', error);
        return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 });
    }
}
