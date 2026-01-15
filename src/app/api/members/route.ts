import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { logActivity } from '@/lib/logger';
import { createMemberSchema } from '@/lib/schemas';

export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const actorId = session.id as number;
        const actorName = session.name as string;

        const body = await request.json();

        // Zod Validation
        const validation = createMemberSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 });
        }
        const { workspaceId, name } = validation.data;

        // AUTHZ CHECK: Ensure actor is capable of adding members (e.g. is existing member of workspace)
        // Ideally should be ADMIN, but for now let's minimal check membership.
        // Actually, let's enforce ADMIN role if possible, or at least membership.
        const requestor = await prisma.member.findFirst({
            where: {
                id: actorId,
                workspaceId: workspaceId,
                // role: 'ADMIN' // Uncomment this if we want strict ADMIN only
            }
        });

        if (!requestor) {
            return NextResponse.json({ error: 'Forbidden: You must be a member of this workspace to add others' }, { status: 403 });
        }

        const member = await prisma.member.create({
            data: {
                name,
                workspaceId: workspaceId
            },
            select: { id: true, name: true, email: true, username: true, role: true, status: true, workspaceId: true }
        });

        await logActivity(
            workspaceId,
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
