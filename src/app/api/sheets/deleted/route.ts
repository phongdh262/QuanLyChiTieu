import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
    try {
        const deletedSheets = await prisma.sheet.findMany({
            where: { status: 'DELETED' },
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json(deletedSheets);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
