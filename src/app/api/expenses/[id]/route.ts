import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { logActivity } from '@/lib/logger';

import { updateExpenseSchema } from '@/lib/schemas';

const ERROR_EXPENSE_NOT_FOUND = 'EXPENSE_NOT_FOUND';
const ERROR_LOCKED = 'LOCKED';
const ERROR_FORBIDDEN_WORKSPACE = 'FORBIDDEN_WORKSPACE';
const ERROR_FORBIDDEN_PAYER_EDIT = 'FORBIDDEN_PAYER_EDIT';

const getErrorMessage = (error: unknown) => error instanceof Error ? error.message : '';
type PrismaTransaction = Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

// UPDATE Expense
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const actorId = session.id as number;
        const actorName = session.name as string;

        const id = parseInt((await params).id);
        const body = await request.json();

        // VALDIATION:
        const validation = updateExpenseSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 });
        }
        const { amount, description, payerId, type, beneficiaryIds, date } = validation.data;

        let workspaceId = 0;
        let sheetId = 0;

        // Transaction: Update expense + Re-do splits
        await prisma.$transaction(async (tx: PrismaTransaction) => {
            // 1. Get Expense to find Sheet -> Workspace
            const expense = await tx.expense.findUnique({
                where: { id },
                include: { sheet: true }
            });
            if (!expense) throw new Error(ERROR_EXPENSE_NOT_FOUND);

            // LOCK CHECK
            if (expense.sheet.status === 'LOCKED') {
                throw new Error(ERROR_LOCKED);
            }

            workspaceId = expense.sheet.workspaceId;
            sheetId = expense.sheetId;

            // CHECK PERMISSION
            const isMember = await tx.member.findFirst({
                where: {
                    workspaceId: workspaceId,
                    id: actorId
                }
            });
            if (!isMember) throw new Error(ERROR_FORBIDDEN_WORKSPACE);

            if (expense.payerId !== actorId) {
                throw new Error(ERROR_FORBIDDEN_PAYER_EDIT);
            }

            // 2. Update Expense Details
            await tx.expense.update({
                where: { id },
                data: {
                    amount,
                    description,
                    type,
                    payerId,
                    ...(date ? { date: new Date(date) } : {})
                }
            });

            // 3. Delete Old Splits
            await tx.split.deleteMany({
                where: { expenseId: id }
            });

            // 4. Create New Splits
            let splitMembers = [];

            if (type === 'SHARED') {
                // Fetch only ACTIVE members in workspace (exclude DELETED)
                const activeMembers = await tx.member.findMany({
                    where: {
                        workspaceId: expense.sheet.workspaceId,
                        status: { not: 'DELETED' }
                    }
                });
                splitMembers = activeMembers.map((member) => member.id);
            } else {
                splitMembers = beneficiaryIds || [];
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

        // Log Activity
        await logActivity(
            workspaceId,
            actorId,
            actorName,
            'UPDATE',
            'EXPENSE',
            id,
            `Đã cập nhật khoản chi: ${description} (${amount.toLocaleString('vi-VN')}đ)`,
            sheetId
        );

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        const errorMessage = getErrorMessage(error);

        if (errorMessage === ERROR_EXPENSE_NOT_FOUND) {
            return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
        }
        if (errorMessage === ERROR_LOCKED) {
            return NextResponse.json({ error: 'Sheet đã bị khóa, không thể chỉnh sửa khoản chi' }, { status: 403 });
        }
        if (errorMessage === ERROR_FORBIDDEN_WORKSPACE) {
            return NextResponse.json({ error: 'Forbidden: Not a member of this workspace' }, { status: 403 });
        }
        if (errorMessage === ERROR_FORBIDDEN_PAYER_EDIT) {
            return NextResponse.json({ error: 'Forbidden: Only the payer can edit this expense' }, { status: 403 });
        }
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
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const actorId = session.id as number;
        const actorName = session.name as string;

        const id = parseInt((await params).id);

        // Fetch details before delete for logging
        const expense = await prisma.expense.findUnique({
            where: { id },
            include: { sheet: true }
        });

        if (!expense) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        // LOCK CHECK: Block deletion on locked sheets
        if (expense.sheet.status === 'LOCKED') {
            return NextResponse.json({ error: 'Sheet đã bị khóa, không thể xóa khoản chi' }, { status: 403 });
        }

        // VERIFY MEMBERSHIP
        const isMember = await prisma.member.findFirst({
            where: {
                workspaceId: expense.sheet.workspaceId,
                id: actorId
            }
        });
        if (!isMember) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // VERIFY PAYER PERMISSION - Only the payer who created the expense can delete it
        if (expense.payerId !== actorId) {
            return NextResponse.json({ error: 'Forbidden: Only the payer can delete this expense' }, { status: 403 });
        }

        // Transaction to delete splits then expense
        await prisma.$transaction(async (tx: PrismaTransaction) => {
            await tx.split.deleteMany({
                where: { expenseId: id }
            });
            await tx.expense.delete({
                where: { id: id }
            });
        });

        // Log Activity
        await logActivity(
            expense.sheet.workspaceId,
            actorId,
            actorName,
            'DELETE',
            'EXPENSE',
            expense.id,
            `Đã xóa khoản chi: ${expense.description} (${expense.amount.toLocaleString('vi-VN')}đ)`,
            expense.sheetId
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 });
    }
}
