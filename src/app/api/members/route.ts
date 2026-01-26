import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession, hashPassword } from '@/lib/auth';
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
        const { workspaceId, name, username, password } = validation.data;

        // AUTHZ CHECK: Ensure actor is capable of adding members
        const requestor = await prisma.member.findFirst({
            where: {
                id: actorId,
                workspaceId: workspaceId,
            }
        });

        if (!requestor) {
            return NextResponse.json({ error: 'Forbidden: You must be a member of this workspace to add others' }, { status: 403 });
        }

        // Check if username already exists if provided
        if (username) {
            const existingUser = await prisma.member.findUnique({
                where: { username }
            });
            if (existingUser) {
                return NextResponse.json({ error: 'Username already exists' }, { status: 400 });
            }
        }

        const hashedPassword = password ? await hashPassword(password) : null;

        const member = await prisma.member.create({
            data: {
                name,
                workspaceId: workspaceId,
                username: username || null,
                password: hashedPassword,
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
            `Đã thêm thành viên mới: ${name} (${username || 'No Acc'})`
        );

        return NextResponse.json(member);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
