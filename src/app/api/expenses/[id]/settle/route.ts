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
        const expense: any = await prisma.expense.findUnique({
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
            // Strategy: Check by DB Lookup (Most Reliable)
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

            // Fetch current split status to prevent illegal transitions
            const existingSplit: any = await prisma.split.findFirst({
                where: { expenseId: expenseId, memberId: member.id }
            });

            if (existingSplit?.isPaid && !isPaid && !isBeneficiary && !isAdmin) {
                return NextResponse.json({ error: 'Status locked. Only the Debtor or Admin can undo after confirmation.' }, { status: 403 });
            }

            let updateData: any = {};
            let logMsg = "";

            if (!isPaid) {
                // If we reach here, it means existingSplit wasn't isPaid. 
                // However, it could be isPending. Cancelling a pending request is allowed for the debtor.
                updateData = { isPaid: false, isPending: false, paidAt: null };
                logMsg = `Marked UNPAID for ${paymentFor} in expense: ${expense.description}`;
            } else {
                // Marking as PAID
                if (isPayer || isAdmin) {
                    // Payer or Admin confirms directly
                    updateData = { isPaid: true, isPending: false, paidAt: new Date() };
                    logMsg = `Confirmed payment for ${paymentFor} in expense: ${expense.description}`;
                } else {
                    // Beneficiary requests confirmation
                    updateData = { isPaid: false, isPending: true, paidAt: new Date() };
                    logMsg = `Sent payment confirmation request for ${paymentFor} in expense: ${expense.description}`;
                }
            }

            // Update specific split
            await (prisma.split as any).updateMany({
                where: {
                    expenseId: expenseId,
                    memberId: member.id
                },
                data: updateData
            });

            // Check if all splits for this expense are now paid (only confirmed ones)
            const allSplits: any[] = await prisma.split.findMany({
                where: { expenseId: expenseId }
            });

            const allPaid = allSplits.every(s => s.isPaid);

            // Update the global expense status based on split status
            await (prisma.expense as any).update({
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
                logMsg
            );

            return NextResponse.json({
                success: true,
                settledMember: paymentFor,
                isGlobalSettled: allPaid,
                isPending: updateData.isPending
            });
        }

        // CASE 2: Global Settle (Toggle whole bill) - Only for Payer/Admin
        if (expense.isSettled && !isSettled) {
            return NextResponse.json({ error: 'Expense is fully settled and locked.' }, { status: 403 });
        }

        await prisma.$transaction([
            (prisma.expense as any).update({
                where: { id: expenseId },
                data: { isSettled: !!isSettled }
            }),
            (prisma.split as any).updateMany({
                where: { expenseId: expenseId },
                data: {
                    isPaid: !!isSettled,
                    isPending: false,
                    paidAt: isSettled ? new Date() : null
                }
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
            `Marked ${isSettled ? 'SETTLED' : 'UNSETTLED'} for expense: ${expense.description}`
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Settle Expense Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
