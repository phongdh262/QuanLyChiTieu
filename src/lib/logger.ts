import prisma from './prisma';

export async function logActivity(
    workspaceId: number,
    actorId: number,
    actorName: string,
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'OTHER',
    entityType: 'EXPENSE' | 'SHEET' | 'MEMBER' | 'SYSTEM',
    entityId: number | null,
    description: string
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
                description
            }
        });
    } catch (error) {
        console.error("Failed to log activity:", error);
        // Don't throw error to avoid blocking the main action
    }
}
