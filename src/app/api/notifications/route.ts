import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
    try {
        const sessionPayload = await getSession();
        if (!sessionPayload || !sessionPayload.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = sessionPayload.id as number;

        // 1. Tasks I need to confirm (I am the Payer)
        const pendingPayer = await (prisma.split as any).findMany({
            where: {
                isPending: true,
                isPaid: false,
                expense: {
                    payerId: userId
                }
            },
            include: {
                expense: { include: { payer: true } },
                member: true
            },
            orderBy: {
                paidAt: 'desc'
            }
        });

        // 2. Requests I sent (I am the Debtor - waiting for confirmation)
        const pendingDebtor = await (prisma.split as any).findMany({
            where: {
                isPending: true,
                isPaid: false,
                memberId: userId
            },
            include: {
                expense: { include: { payer: true } },
                member: true
            },
            orderBy: {
                paidAt: 'desc'
            }
        });

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // 3. History: Confirmed splits involving me in the last 30 days
        const history = await (prisma.split as any).findMany({
            where: {
                isPaid: true,
                isPending: false,
                paidAt: { gte: thirtyDaysAgo },
                OR: [
                    { expense: { payerId: userId } },
                    { memberId: userId }
                ]
            },
            include: {
                expense: { include: { payer: true } },
                member: true
            },
            orderBy: {
                paidAt: 'desc'
            },
            take: 50 // Limit to 50 recent items for performance
        });

        return NextResponse.json({
            pendingPayer,
            pendingDebtor,
            totalPending: pendingPayer.length, // For the bell badge
            history: history.map((item: any) => ({
                ...item,
                isPayer: item.expense.payerId === userId
            }))
        });
    } catch (error) {
        console.error('Fetch Notifications Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
