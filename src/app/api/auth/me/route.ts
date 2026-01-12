import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch fresh data from DB to get latest role
    const user = await prisma.member.findUnique({
        where: { id: Number(session.id) },
        select: { id: true, name: true, username: true, role: true }
    });

    return NextResponse.json({ user });
}
