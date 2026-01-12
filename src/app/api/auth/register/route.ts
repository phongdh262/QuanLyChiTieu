import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword, createSession } from '@/lib/auth';

export async function POST(req: Request) {
    try {
        const { username, password, name } = await req.json();

        if (!username || !password || !name) {
            return NextResponse.json({ error: 'Mising fields' }, { status: 400 });
        }

        // Check if user exists
        const existing = await prisma.member.findUnique({
            where: { username },
        });
        if (existing) {
            return NextResponse.json({ error: 'Username already exists' }, { status: 400 });
        }

        // Default to Workspace 1 (Family) for MVP
        // In production, we would let them create a workspace or join via code
        const workspaceId = 1;

        const hashedPassword = await hashPassword(password);

        // Check if there are ANY users with usernames yet. If not, first one is Admin.
        // OR simply: if username is 'admin', make them Admin.
        const role = username === 'admin' ? 'ADMIN' : 'MEMBER';

        const member = await prisma.member.create({
            data: {
                username,
                password: hashedPassword,
                name,
                workspaceId,
                role
            },
        });

        // Auto login
        await createSession({
            id: member.id,
            name: member.name,
            username: member.username,
            workspaceId: member.workspaceId
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
