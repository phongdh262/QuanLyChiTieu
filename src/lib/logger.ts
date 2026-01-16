import prisma from './prisma';

export async function logActivity(
    workspaceId: number,
    actorId: number,
    actorName: string,
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'OTHER',
    entityType: 'EXPENSE' | 'SHEET' | 'MEMBER' | 'SYSTEM',
    entityId: number | null,
    description: string,
    sheetId?: number // Optional context
) {
    try {
        await prisma.activityLog.create({
            data: {
                workspaceId,
                actorId,
                actorName,
                action,
                entityType,
                entityId: entityId || null,
                description,
                sheetId: sheetId || null
            }
        });
    } catch (error) {
        console.error("Failed to log activity:", error);
        // Don't throw error to avoid blocking the main action
    }
}
