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
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const actorId = session.id as number;
        const actorName = session.name as string;

        const sheetId = parseInt((await params).sheetId);

        // Get the sheet to restore
        const sheetToRestore = await prisma.sheet.findUnique({
            where: { id: sheetId }
        });

        if (!sheetToRestore) {
            return NextResponse.json({ error: 'Sheet not found' }, { status: 404 });
        }

        if (sheetToRestore.status !== 'DELETED') {
            return NextResponse.json({ error: 'Sheet is not in trash' }, { status: 400 });
        }

        // Check if there's already an active sheet with the same month/year
        const existingActiveSheet = await prisma.sheet.findFirst({
            where: {
                workspaceId: sheetToRestore.workspaceId,
                month: sheetToRestore.month,
                year: sheetToRestore.year,
                status: { not: 'DELETED' },
                id: { not: sheetId } // Exclude the sheet being restored
            }
        });

        if (existingActiveSheet) {
            return NextResponse.json({
                error: `Không thể khôi phục! Đã tồn tại bảng chi tiêu cho tháng ${sheetToRestore.month}/${sheetToRestore.year}. Vui lòng xóa bảng đó trước.`
            }, { status: 409 });
        }

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
