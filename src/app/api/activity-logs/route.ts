import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const monthParam = searchParams.get('month');
        const yearParam = searchParams.get('year');

        let whereClause: any = {};

        if (monthParam && yearParam) {
            const month = parseInt(monthParam);
            const year = parseInt(yearParam);

            if (!isNaN(month) && !isNaN(year)) {
                const startDate = new Date(year, month - 1, 1);
                // End date: Last day of the month
                const endDate = new Date(year, month, 0, 23, 59, 59, 999);

                whereClause.createdAt = {
                    gte: startDate,
                    lte: endDate
                };
            }
        }

        const logs = await prisma.activityLog.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            take: 100 // Increased limit to ensure coverage
        });
        return NextResponse.json(logs);
    } catch (error) {
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
