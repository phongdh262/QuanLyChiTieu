import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ sheetId: string }> }
) {
    try {
        const sheetId = parseInt((await params).sheetId);

        const sheet = await prisma.sheet.update({
            where: { id: sheetId },
            data: { status: 'OPEN' }
        });

        // Log restoration
        await prisma.activityLog.create({
            data: {
                action: 'UPDATE',
                entityType: 'SHEET',
                entityId: sheet.id,
                description: `Đã khôi phục bảng chi tiêu: ${sheet.name}`,
                actorId: 0,
                actorName: 'Hệ thống',
                workspaceId: sheet.workspaceId
            }
        });

        return NextResponse.json({ success: true, sheet });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
