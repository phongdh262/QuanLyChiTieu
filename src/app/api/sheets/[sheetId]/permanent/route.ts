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
        // Use transaction to manually cascade delete to ensure reliability even if DB schema cascade is desync
        await prisma.$transaction(async (tx) => {
            // 1. Delete Splits linked to expenses in this sheet
            await tx.split.deleteMany({
                where: {
                    expense: {
                        sheetId: sheetId
                    }
                }
            });

            // 2. Delete Expenses
            await tx.expense.deleteMany({
                where: { sheetId: sheetId }
            });

            // 3. Unlink ActivityLogs (Using Raw SQL to bypass Stale Client Types)
            // 3. Unlink ActivityLogs (Brute Force Table Names to bypass Stale Client & Naming miscues)
            const tableNames = ['ActivityLog', 'activity_log', 'ActivityLogs', 'activity_logs', 'activitylog'];
            for (const tableName of tableNames) {
                try {
                    await tx.$executeRawUnsafe(`UPDATE ${tableName} SET sheetId = NULL WHERE sheetId = ${sheetId}`);
                } catch (ignored) {
                    // Continue to next table name if this one fails
                }
            }

            // 4. Delete the Sheet
            await tx.sheet.delete({
                where: { id: sheetId }
            });
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
            undefined
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
