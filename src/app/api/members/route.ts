import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { workspaceId, name } = body;

        const member = await prisma.member.create({
            data: {
                name,
                workspaceId: parseInt(workspaceId)
            }
        });

        return NextResponse.json(member);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
