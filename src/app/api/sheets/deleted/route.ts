import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const deletedSheets = await prisma.sheet.findMany({
            where: {
                status: 'DELETED',
                workspace: {
                    members: {
                        some: {
                            id: Number(session.id)
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json(deletedSheets);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
