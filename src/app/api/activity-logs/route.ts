import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const logs = await prisma.activityLog.findMany({
            orderBy: { createdAt: 'desc' },
            take: 50 // Limit 50 recent logs
        });
        return NextResponse.json(logs);
    } catch (error) {
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
