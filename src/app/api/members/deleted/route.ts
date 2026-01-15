import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET() {
    try {
        const session = await getSession();
        if (!session || !session.workspaceId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const deletedMembers = await prisma.member.findMany({
            where: {
                workspaceId: parseInt(session.workspaceId as string),
                status: 'DELETED'
            },
            orderBy: { name: 'asc' },
            select: { id: true, name: true, email: true, username: true, role: true, status: true, workspaceId: true }
        });

        return NextResponse.json(deletedMembers);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
