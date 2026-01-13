import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { logActivity } from '@/lib/logger';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const sessionPayload = await getSession();
        if (!sessionPayload || !sessionPayload.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const actorId = sessionPayload.id as number;
        const actorName = sessionPayload.name as string;

        const { id } = await params;
        const expenseId = parseInt(id);
        const body = await request.json();
        const { isSettled, paymentFor, isPaid } = body;

        // AUTH CHECK: Verify if user is owner of expense or Admin
        const expense = await prisma.expense.findUnique({
            where: { id: expenseId },
            include: { payer: true, sheet: true }
        });

        if (!expense) {
            return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
        }

        const workspaceId = expense.sheet.workspaceId;

        // Check if user is Payer OR Admin
        const userId = String(sessionPayload.id);
        const payerId = String(expense.payerId);

        const isPayer = payerId === userId;
        const isAdmin = sessionPayload.role === 'ADMIN';

        // Check if user is the Beneficiary being settled for
        let isBeneficiary = false;

        if (paymentFor) {
            // Strategy 1: Check by Name from Session (Fastest)
            if (sessionPayload.name && sessionPayload.name === paymentFor) {
                isBeneficiary = true;
            } else {
                // Strategy 2: Check by DB Lookup (Most Reliable)
                const member = await prisma.member.findFirst({
                    where: {
                        name: paymentFor,
                        workspaceId: workspaceId
                    }
                });

                if (member && String(member.id) === userId) {
                    isBeneficiary = true;
                }
            }
        }

        if (!isPayer && !isAdmin && !isBeneficiary) {
            return NextResponse.json({
                error: 'Forbidden',
                details: `User ${sessionPayload.name} (ID: ${userId}) cannot settle for ${paymentFor || 'Global'}`
            }, { status: 403 });
        }


        // CASE 1: Settle for specific beneficiary (Split level)
        if (paymentFor) {
            // Find member ID first
            const member = await prisma.member.findFirst({
                where: {
                    name: paymentFor,
                    workspaceId: workspaceId
                }
            });

            if (!member) {
                return NextResponse.json({ error: 'Member not found' }, { status: 404 });
            }

            // Update specific split
            await prisma.split.updateMany({
                where: {
                    expenseId: expenseId,
                    memberId: member.id
                },
                data: {
                    isPaid: !!isPaid
                }
            });

            // Check if all splits for this expense are now paid
            const allSplits = await prisma.split.findMany({
                where: { expenseId: expenseId }
            });

            const allPaid = allSplits.every(s => s.isPaid);

            // Update the global expense status based on split status
            await prisma.expense.update({
                where: { id: expenseId },
                data: { isSettled: allPaid }
            });

            // Log activity
            await logActivity(
                workspaceId,
                actorId,
                actorName,
                'UPDATE',
                'EXPENSE',
                expenseId,
                `Đã đánh dấu ${isPaid ? 'ĐÃ TRẢ' : 'CHƯA TRẢ'} cho ${paymentFor} trong khoản chi: ${expense.description}`
            );

            return NextResponse.json({
                success: true,
                settledMember: paymentFor,
                isGlobalSettled: allPaid
            });
        }

        // CASE 2: Global Settle (Toggle whole bill)
        await prisma.$transaction([
            prisma.expense.update({
                where: { id: expenseId },
                data: { isSettled: !!isSettled }
            }),
            prisma.split.updateMany({
                where: { expenseId: expenseId },
                data: { isPaid: !!isSettled }
            })
        ]);

        // Log activity
        await logActivity(
            workspaceId,
            actorId,
            actorName,
            'UPDATE',
            'EXPENSE',
            expenseId,
            `Đã đánh dấu ${isSettled ? 'ĐÃ QUYẾT TOÁN' : 'CHƯA QUYẾT TOÁN'} toàn bộ khoản chi: ${expense.description}`
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Settle Expense Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
