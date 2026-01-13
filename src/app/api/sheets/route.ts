import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { logActivity } from '@/lib/logger';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { workspaceId, month, year } = body;

        const name = `Tháng ${month}/${year}`;

        const session = await getSession();
        const actorId = session ? (session.id as number) : 0;
        const actorName = session ? (session.name as string) : 'Hệ thống';

        const sheet = await prisma.sheet.create({
            data: {
                name,
                month: parseInt(month),
                year: parseInt(year),
                workspaceId: parseInt(workspaceId),
                status: 'OPEN'
            }
        });

        await logActivity(
            parseInt(workspaceId),
            actorId,
            actorName,
            'CREATE',
            'SHEET',
            sheet.id,
            `Đã tạo bảng chi tiết tháng mới: ${name}`
        );

        return NextResponse.json(sheet);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
