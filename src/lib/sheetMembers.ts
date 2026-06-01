import prisma from '@/lib/prisma';

export const workspaceMemberSelect = {
    id: true,
    name: true,
    email: true,
    username: true,
    role: true,
    status: true,
    workspaceId: true
} as const;

type SheetMemberClient = Pick<typeof prisma, 'member' | 'sheetMember'>;

export function resolveSelectedSheetMemberIds(
    requestedMemberIds: number[] | undefined,
    activeMembers: Array<{ id: number }>
) {
    const fallbackMemberIds = activeMembers.map((member) => member.id);

    if (!requestedMemberIds || requestedMemberIds.length === 0) {
        return {
            memberIds: fallbackMemberIds,
            invalidMemberIds: [] as number[]
        };
    }

    const uniqueRequestedIds = [...new Set(requestedMemberIds)];
    const activeMemberIds = new Set(fallbackMemberIds);

    return {
        memberIds: uniqueRequestedIds.filter((id) => activeMemberIds.has(id)),
        invalidMemberIds: uniqueRequestedIds.filter((id) => !activeMemberIds.has(id))
    };
}

export async function getActiveSheetMembers(
    client: SheetMemberClient,
    sheetId: number,
    workspaceId: number
) {
    const sheetMemberClient = (client as Partial<SheetMemberClient>).sheetMember;

    const configuredSheetMembers = typeof sheetMemberClient?.findMany === 'function'
        ? await sheetMemberClient.findMany({
            where: {
                sheetId,
                member: {
                    status: { not: 'DELETED' }
                }
            },
            select: {
                member: {
                    select: workspaceMemberSelect
                }
            }
        })
        : [];

    if (configuredSheetMembers.length > 0) {
        return configuredSheetMembers.map((item) => item.member);
    }

    return client.member.findMany({
        where: {
            workspaceId,
            status: { not: 'DELETED' }
        },
        select: workspaceMemberSelect
    });
}

export async function getActiveSheetMemberIds(
    client: SheetMemberClient,
    sheetId: number,
    workspaceId: number
) {
    const members = await getActiveSheetMembers(client, sheetId, workspaceId);
    return members.map((member) => member.id);
}
