import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { workspaceId, month, year } = body;

        const name = `Tháng ${month}/${year}`;

        const sheet = await prisma.sheet.create({
            data: {
                name,
                month: parseInt(month),
                year: parseInt(year),
                workspaceId: parseInt(workspaceId),
                status: 'OPEN'
            }
        });

        return NextResponse.json(sheet);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
