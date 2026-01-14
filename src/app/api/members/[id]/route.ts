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
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const actorId = session.id as number;
        const actorName = session.name as string;

        const id = parseInt((await params).id);
        const body = await request.json();
        const { name } = body;

        // 1. Fetch target member to check workspace ownership
        const targetMember = await prisma.member.findUnique({ where: { id } });
        if (!targetMember) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        // 2. Verify actor has rights (must be in same workspace)
        // Ideally should be ADMIN or Self, but minimal check is membership of same workspace
        const requestor = await prisma.member.findFirst({
            where: { id: actorId, workspaceId: targetMember.workspaceId }
        });
        if (!requestor) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

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

// DELETE Member (Soft Delete)
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const actorId = session.id as number;
        const actorName = session.name as string;

        const id = parseInt((await params).id);

        const member = await prisma.member.findUnique({ where: { id } });
        if (!member) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        // Access Check
        const requestor = await prisma.member.findFirst({
            where: { id: actorId, workspaceId: member.workspaceId }
        });
        if (!requestor) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Soft delete
        await prisma.member.update({
            where: { id },
            data: { status: 'DELETED' }
        });

        await logActivity(
            member.workspaceId,
            actorId,
            actorName,
            'DELETE',
            'MEMBER',
            id,
            `Đã chuyển thành viên vào thùng rác: ${member.name}`
        );

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error(error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
