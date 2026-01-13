import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { logActivity } from '@/lib/logger';

// UPDATE Member
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getSession();
        const actorId = session ? (session.id as number) : 0;
        const actorName = session ? (session.name as string) : 'Hệ thống';

        const id = parseInt((await params).id);
        const body = await request.json();
        const { name } = body;

        const member = await prisma.member.update({
            where: { id },
            data: { name }
        });

        await logActivity(
            member.workspaceId,
            actorId,
            actorName,
            'UPDATE',
            'MEMBER',
            member.id,
            `Đã đổi tên thành viên thành: ${name}`
        );

        return NextResponse.json(member);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

// DELETE Member
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getSession();
        const actorId = session ? (session.id as number) : 0;
        const actorName = session ? (session.name as string) : 'Hệ thống';

        const id = parseInt((await params).id);

        const member = await prisma.member.findUnique({ where: { id } });
        if (!member) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        await prisma.member.delete({
            where: { id }
        });

        await logActivity(
            member.workspaceId,
            actorId,
            actorName,
            'DELETE',
            'MEMBER',
            id,
            `Đã xóa thành viên: ${member.name}`
        );

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error(error);
        if (error.code === 'P2003') {
            return NextResponse.json({ error: 'Không thể xóa thành viên đã có giao dịch!' }, { status: 400 });
        }
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
