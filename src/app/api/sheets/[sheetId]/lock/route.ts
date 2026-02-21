import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { logActivity } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// PATCH: Toggle lock/unlock sheet (ADMIN only)
export async function PATCH(
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

        // Fetch sheet
        const sheet = await prisma.sheet.findUnique({
            where: { id: sheetId },
        });

        if (!sheet) {
            return NextResponse.json({ error: 'Sheet not found' }, { status: 404 });
        }

        // Cannot lock/unlock a DELETED sheet
        if (sheet.status === 'DELETED') {
            return NextResponse.json({ error: 'Cannot lock/unlock a deleted sheet' }, { status: 400 });
        }

        // ADMIN permission check
        const member = await prisma.member.findFirst({
            where: {
                workspaceId: sheet.workspaceId,
                id: actorId,
            }
        });

        if (!member) {
            return NextResponse.json({ error: 'Forbidden: Not a member' }, { status: 403 });
        }

        if (member.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden: Only ADMIN can lock/unlock sheets' }, { status: 403 });
        }

        // Toggle: OPEN → LOCKED, LOCKED → OPEN
        const newStatus = sheet.status === 'LOCKED' ? 'OPEN' : 'LOCKED';

        await prisma.sheet.update({
            where: { id: sheetId },
            data: { status: newStatus }
        });

        const actionVerb = newStatus === 'LOCKED' ? 'khóa' : 'mở khóa';
        await logActivity(
            sheet.workspaceId,
            actorId,
            actorName,
            'UPDATE',
            'SHEET',
            sheet.id,
            `Đã ${actionVerb} bảng chi tiêu: ${sheet.name}`,
            sheet.id
        );

        return NextResponse.json({ success: true, status: newStatus });
    } catch (error) {
        console.error('Lock/Unlock Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
