import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const sessionPayload = await getSession();
        if (!sessionPayload || !sessionPayload.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const expenseId = parseInt(id);
        const body = await request.json();
        const { isSettled, paymentFor, isPaid } = body;

        // CASE 1: Settle for specific beneficiary (Split level)
        if (paymentFor) {
            // Find member ID first
            const member = await prisma.member.findFirst({
                where: {
                    name: paymentFor,
                    workspaceId: parseInt(sessionPayload.workspaceId as string)
                }
            });

            if (!member) {
                return NextResponse.json({ error: 'Member not found' }, { status: 404 });
            }

            // Update specific split
            // Note: We need to find the split associated with this expense and member
            // Since we don't have composite ID, we use findFirst/updateMany or find split ID first

            // Safe approach: updateMany (should be unique per expense/member combo)
            await prisma.split.updateMany({
                where: {
                    expenseId: expenseId,
                    memberId: member.id
                },
                data: {
                    isPaid: !!isPaid
                }
            });

            return NextResponse.json({ success: true, settledMember: paymentFor });
        }

        // CASE 2: Legacy Global Settle (Toggle whole bill)
        // Ideally we should mark all splits as paid too?
        // For now, keep legacy behavior impacting 'isSettled' flag on Expense, 
        // OR better: Update ALL splits to match isSettled status.

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

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Settle Expense Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
