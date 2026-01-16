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
        const sheetIdParam = searchParams.get('sheetId');

        let whereClause: any = {};

        // Calculate Date Range
        let startDate, endDate;
        if (monthParam && yearParam) {
            const month = parseInt(monthParam);
            const year = parseInt(yearParam);
            if (!isNaN(month) && !isNaN(year)) {
                startDate = new Date(year, month - 1, 1);
                endDate = new Date(year, month, 0, 23, 59, 59, 999);
            }
        }

        if (sheetIdParam) {
            const sheetId = parseInt(sheetIdParam);
            if (!startDate) {
                whereClause.sheetId = sheetId;
            } else {
                // Combine: either specifically linked to this sheet OR (link is null AND date matches)
                // This ensures we pick up legacy logs by date, but don't accidentally pick up logs 
                // that are linked to OTHER sheets even if they happened in this time (unlikely, but safer).
                whereClause = {
                    OR: [
                        { sheetId: sheetId },
                        {
                            sheetId: null,
                            createdAt: { gte: startDate, lte: endDate }
                        }
                    ]
                };
            }
        } else if (startDate && endDate) {
            // Fallback to just date if no sheetId
            whereClause.createdAt = { gte: startDate, lte: endDate };
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
