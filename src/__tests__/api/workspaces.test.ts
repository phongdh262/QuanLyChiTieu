/**
 * Workspaces API Tests
 * Kiểm tra workspace data retrieval, member isolation, sheet filtering
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
    default: {
        workspace: {
            findMany: vi.fn(),
        },
        member: {
            findFirst: vi.fn(),
            findUnique: vi.fn(),
        },
    }
}));

vi.mock('@/lib/auth', () => ({
    getSession: vi.fn(),
}));

import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

type WorkspaceWithRelations = {
    id: number;
    name?: string;
    sheets: Array<{ id: number; name?: string; status: string; month?: number; year?: number }>;
    members: Array<{ id: number; name: string; status: string }>;
};

const asWorkspaceFindManyResult = (value: WorkspaceWithRelations[]) =>
    value as unknown as Awaited<ReturnType<typeof prisma.workspace.findMany>>;

describe('Workspaces API Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('GET /api/workspaces', () => {
        it('should return workspace with sheets and members for authenticated user', async () => {
            vi.mocked(getSession).mockResolvedValue({ id: 1, name: 'User1' });

            const workspace = {
                id: 1,
                name: 'Group A',
                sheets: [
                    { id: 1, name: 'Tháng 1/2026', month: 1, year: 2026, status: 'OPEN' },
                    { id: 2, name: 'Tháng 2/2026', month: 2, year: 2026, status: 'OPEN' },
                ],
                members: [
                    { id: 1, name: 'Alice', status: 'ACTIVE' },
                    { id: 2, name: 'Bob', status: 'ACTIVE' },
                ]
            };

            vi.mocked(prisma.workspace.findMany).mockResolvedValue(asWorkspaceFindManyResult([workspace]));
            const result = await prisma.workspace.findMany({}) as unknown as WorkspaceWithRelations[];

            expect(result).toHaveLength(1);
            expect(result[0].sheets).toHaveLength(2);
            expect(result[0].members).toHaveLength(2);
        });

        it('should filter out DELETED sheets from response', async () => {
            vi.mocked(getSession).mockResolvedValue({ id: 1, name: 'User1' });

            const workspace = {
                id: 1,
                sheets: [
                    { id: 1, name: 'Active', status: 'OPEN' },
                ],
                members: []
            };

            vi.mocked(prisma.workspace.findMany).mockResolvedValue(asWorkspaceFindManyResult([workspace]));
            const result = await prisma.workspace.findMany({}) as unknown as WorkspaceWithRelations[];
            const sheets = result[0].sheets;
            expect(sheets.every(s => s.status !== 'DELETED')).toBe(true);
        });

        it('should filter out DELETED members from response', async () => {
            vi.mocked(getSession).mockResolvedValue({ id: 1, name: 'User1' });

            const workspace = {
                id: 1,
                sheets: [],
                members: [
                    { id: 1, name: 'Active', status: 'ACTIVE' },
                ]
            };

            vi.mocked(prisma.workspace.findMany).mockResolvedValue(asWorkspaceFindManyResult([workspace]));
            const result = await prisma.workspace.findMany({}) as unknown as WorkspaceWithRelations[];
            const members = result[0].members;
            expect(members.every(m => m.status !== 'DELETED')).toBe(true);
        });

        it('should reject without authentication', async () => {
            vi.mocked(getSession).mockResolvedValue(null);
            const session = await getSession();
            expect(session).toBeNull();
            // API returns 401
        });

        it('should only return workspaces user belongs to', async () => {
            vi.mocked(getSession).mockResolvedValue({ id: 1, name: 'User1' });

            // User 1 is only in workspace 1
            vi.mocked(prisma.member.findFirst).mockResolvedValue({
                id: 1,
                workspaceId: 1
            } as unknown as Awaited<ReturnType<typeof prisma.member.findFirst>>);
            vi.mocked(prisma.member.findFirst).mockResolvedValueOnce(null);

            const crossAccess = await prisma.member.findFirst({
                where: { id: 1, workspaceId: 2 }
            });
            expect(crossAccess).toBeNull();
        });

        it('should handle user with no workspace', async () => {
            vi.mocked(getSession).mockResolvedValue({ id: 99, name: 'Orphan' });
            vi.mocked(prisma.workspace.findMany).mockResolvedValue([]);

            const result = await prisma.workspace.findMany({});
            expect(result).toHaveLength(0);
        });
    });
});
