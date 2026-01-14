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
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const actorId = session.id as number;
        const actorName = session.name as string;

        const requestor = await prisma.member.findFirst({
            where: { id: actorId, workspaceId: parseInt(workspaceId) }
        });
        if (!requestor) {
            return NextResponse.json({ error: 'Forbidden: You must be a member of this workspace' }, { status: 403 });
        }

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
