import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { logActivity } from '@/lib/logger';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ sheetId: string }> }
) {
    try {
        const session = await getSession();
        const actorId = session ? (session.id as number) : 0;
        const actorName = session ? (session.name as string) : 'Hệ thống';

        const sheetId = parseInt((await params).sheetId);

        const sheet = await prisma.sheet.update({
            where: { id: sheetId },
            data: { status: 'OPEN' }
        });

        // Log restoration
        await logActivity(
            sheet.workspaceId,
            actorId,
            actorName,
            'UPDATE',
            'SHEET',
            sheet.id,
            `Đã khôi phục bảng chi tiêu: ${sheet.name}`
        );

        return NextResponse.json({ success: true, sheet });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
