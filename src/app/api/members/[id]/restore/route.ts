import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { logActivity } from '@/lib/logger';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getSession();
        const actorId = session ? (session.id as number) : 0;
        const actorName = session ? (session.name as string) : 'Hệ thống';

        const id = parseInt((await params).id);

        const member = await prisma.member.update({
            where: { id },
            data: { status: 'ACTIVE' },
            select: { id: true, name: true, email: true, username: true, role: true, status: true, workspaceId: true }
        });

        await logActivity(
            member.workspaceId,
            actorId,
            actorName,
            'UPDATE',
            'MEMBER',
            member.id,
            `Đã khôi phục thành viên: ${member.name}`
        );

        return NextResponse.json({ success: true, member });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
