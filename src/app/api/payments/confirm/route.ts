import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { logActivity } from '@/lib/logger';

export async function POST(request: Request) {
    try {
        const sessionPayload = await getSession();
        if (!sessionPayload || !sessionPayload.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const actorId = sessionPayload.id as number;
        const actorName = sessionPayload.name as string;
        const isAdmin = sessionPayload.role === 'ADMIN';

        const body = await request.json();
        const { splitId, action } = body; // action can be 'confirm' or 'reject'

        if (!splitId) {
            return NextResponse.json({ error: 'Split ID is required' }, { status: 400 });
        }

        // Fetch split with expense and payer info
        const split = await prisma.split.findUnique({
            where: { id: splitId },
            include: {
                expense: {
                    include: {
                        payer: true,
                        sheet: true
                    }
                },
                member: true
            }
        });

        if (!split) {
            return NextResponse.json({ error: 'Payment record not found' }, { status: 404 });
        }

        const isPayer = String(split.expense.payerId) === String(actorId);

        if (!isPayer && !isAdmin) {
            return NextResponse.json({ error: 'Only the original payer or admin can handle this payment' }, { status: 403 });
        }

        const isReject = action === 'reject';

        // Update split status
        await (prisma.split as any).update({
            where: { id: splitId },
            data: {
                isPaid: isReject ? false : true,
                isPending: false,
                paidAt: isReject ? null : undefined
            }
        });

        // Check if all splits for this expense are now paid
        const allSplits = await prisma.split.findMany({
            where: { expenseId: split.expenseId }
        });

        const allPaid = allSplits.every(s => (s as any).isPaid);

        // Update the global expense status
        await (prisma.expense as any).update({
            where: { id: split.expenseId },
            data: { isSettled: allPaid }
        });

        const workspaceId = (split as any).expense.sheet.workspaceId;

        // Log activity
        const logMsg = isReject
            ? `REJECTED payment confirmation for ${split.member.name} in expense: ${split.expense.description}`
            : `Confirmed payment for ${split.member.name} in expense: ${split.expense.description}`;

        await logActivity(
            workspaceId,
            actorId,
            actorName,
            'UPDATE',
            'EXPENSE',
            split.expenseId,
            logMsg
        );

        return NextResponse.json({ success: true, isGlobalSettled: allPaid, action });
    } catch (error) {
        console.error('Confirm Payment Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
