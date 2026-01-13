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

        // Fetch all pending splits where the parent expense was paid by the current user
        const pendingPayments = await prisma.split.findMany({
            where: {
                isPending: true,
                isPaid: false,
                expense: {
                    payerId: userId
                }
            },
            include: {
                expense: true,
                member: true
            },
            orderBy: {
                paidAt: 'desc'
            }
        });

        return NextResponse.json(pendingPayments);
    } catch (error) {
        console.error('Fetch Notifications Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
