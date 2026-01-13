import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { logActivity } from '@/lib/logger';

export async function POST(request: Request) {
    try {
        const session = await getSession();
        const actorId = session ? (session.id as number) : 0;
        const actorName = session ? (session.name as string) : 'Hệ thống';

        const body = await request.json();
        const { workspaceId, name } = body;

        const member = await prisma.member.create({
            data: {
                name,
                workspaceId: parseInt(workspaceId)
            }
        });

        await logActivity(
            parseInt(workspaceId),
            actorId,
            actorName,
            'CREATE',
            'MEMBER',
            member.id,
            `Đã thêm thành viên mới: ${name}`
        );

        return NextResponse.json(member);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
