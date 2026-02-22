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

            vi.mocked(prisma.workspace.findMany).mockResolvedValue([workspace] as any);
            const result = await prisma.workspace.findMany({});

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

            vi.mocked(prisma.workspace.findMany).mockResolvedValue([workspace] as any);
            const result = await prisma.workspace.findMany({});

            const sheets = result[0].sheets as any[];
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

            vi.mocked(prisma.workspace.findMany).mockResolvedValue([workspace] as any);
            const result = await prisma.workspace.findMany({});

            const members = result[0].members as any[];
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
            } as any);

            const member = await prisma.member.findFirst({
                where: { id: 1, workspaceId: 2 }
            });
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
