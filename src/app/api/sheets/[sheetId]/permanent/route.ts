import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { logActivity } from '@/lib/logger';

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ sheetId: string }> }
) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const actorId = session.id as number;
        const actorName = session.name as string;

        const sheetId = parseInt((await params).sheetId);

        // Check existence
        const sheet = await prisma.sheet.findUnique({
            where: { id: sheetId }
        });

        if (!sheet) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        // Check permission (Must be workspace member)
        const isMember = await prisma.member.findFirst({
            where: {
                workspaceId: sheet.workspaceId,
                id: actorId
            }
        });

        if (!isMember) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // PERMANENT DELETE
        // Due to Cascade rules in schema, this will delete expenses matches, splits matches. 
        // ActivityLogs for this sheet will have sheetId set to NULL.
        await prisma.sheet.delete({
            where: { id: sheetId }
        });

        // Log the permanent deletion
        await logActivity(
            sheet.workspaceId,
            actorId,
            actorName,
            'DELETE',
            'SHEET',
            null, // Entity is gone
            `Đã xóa VĨNH VIỄN bảng chi tiêu: ${sheet.name}`,
            null
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
