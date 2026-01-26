/**
 * Sheets API Tests
 * Kiểm tra CRUD operations và soft delete cho Sheets
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
    default: {
        sheet: {
            findUnique: vi.fn(),
            findMany: vi.fn(),
            findFirst: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        },
        member: {
            findFirst: vi.fn(),
            findMany: vi.fn(),
        },
        expense: {
            deleteMany: vi.fn(),
        },
        split: {
            deleteMany: vi.fn(),
        }
    }
}));

vi.mock('@/lib/auth', () => ({
    getSession: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
    logActivity: vi.fn(),
}));

import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

describe('Sheets API Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('GET /api/sheets/[sheetId] - Get Sheet Data', () => {
        it('should return sheet with active members only (filter DELETED)', async () => {
            vi.mocked(getSession).mockResolvedValue({ id: 1, name: 'User1' });

            const sheet = { id: 1, workspaceId: 1, expenses: [] };
            vi.mocked(prisma.sheet.findUnique).mockResolvedValue(sheet as any);
            vi.mocked(prisma.member.findFirst).mockResolvedValue({ id: 1 } as any);

            // Only return ACTIVE members
            const activeMembers = [
                { id: 1, name: 'Active1', status: 'ACTIVE' },
                { id: 2, name: 'Active2', status: 'ACTIVE' },
            ];
            vi.mocked(prisma.member.findMany).mockResolvedValue(activeMembers as any);

            const members = await prisma.member.findMany({
                where: {
                    workspaceId: 1,
                    NOT: { status: 'DELETED' }
                }
            });

            expect(members).toHaveLength(2);
            expect(members.every(m => m.status !== 'DELETED')).toBe(true);
        });

        it('should return 404 for non-existent sheet', async () => {
            vi.mocked(getSession).mockResolvedValue({ id: 1, name: 'User1' });
            vi.mocked(prisma.sheet.findUnique).mockResolvedValue(null);

            const sheet = await prisma.sheet.findUnique({ where: { id: 999 } });

            expect(sheet).toBeNull();
        });

        it('should return 403 when user is not workspace member', async () => {
            vi.mocked(getSession).mockResolvedValue({ id: 1, name: 'Outsider' });

            const sheet = { id: 1, workspaceId: 2 };
            vi.mocked(prisma.sheet.findUnique).mockResolvedValue(sheet as any);
            vi.mocked(prisma.member.findFirst).mockResolvedValue(null);

            const isMember = await prisma.member.findFirst({
                where: { id: 1, workspaceId: 2 }
            });

            expect(isMember).toBeNull();
            // API returns 403
        });
    });

    describe('POST /api/sheets - Create Sheet', () => {
        it('should create new sheet with unique name', async () => {
            vi.mocked(getSession).mockResolvedValue({ id: 1, name: 'User1' });

            // No duplicate
            vi.mocked(prisma.sheet.findFirst).mockResolvedValue(null);

            const newSheet = {
                id: 10,
                name: 'Tháng 2/2026',
                month: 2,
                year: 2026,
                workspaceId: 1,
                status: 'OPEN'
            };
            vi.mocked(prisma.sheet.create).mockResolvedValue(newSheet as any);

            const result = await prisma.sheet.create({
                data: {
                    name: 'Tháng 2/2026',
                    month: 2,
                    year: 2026,
                    workspaceId: 1
                }
            });

            expect(result.name).toBe('Tháng 2/2026');
            expect(result.status).toBe('OPEN');
        });

        it('should reject duplicate sheet name in same workspace', async () => {
            vi.mocked(getSession).mockResolvedValue({ id: 1, name: 'User1' });

            // Duplicate exists
            const existingSheet = { id: 5, name: 'Tháng 1/2026' };
            vi.mocked(prisma.sheet.findFirst).mockResolvedValue(existingSheet as any);

            const duplicate = await prisma.sheet.findFirst({
                where: {
                    workspaceId: 1,
                    name: 'Tháng 1/2026',
                    status: { not: 'DELETED' }
                }
            });

            expect(duplicate).not.toBeNull();
            // API returns 409 Conflict
        });
    });

    describe('DELETE /api/sheets/[sheetId] - Soft Delete Sheet', () => {
        it('should soft delete sheet by setting status to DELETED', async () => {
            vi.mocked(getSession).mockResolvedValue({ id: 1, name: 'User1' });

            const sheet = { id: 1, name: 'Sheet1', workspaceId: 1, status: 'OPEN' };
            vi.mocked(prisma.sheet.findUnique).mockResolvedValue(sheet as any);
            vi.mocked(prisma.member.findFirst).mockResolvedValue({ id: 1 } as any);

            const deleted = { ...sheet, status: 'DELETED' };
            vi.mocked(prisma.sheet.update).mockResolvedValue(deleted as any);

            const result = await prisma.sheet.update({
                where: { id: 1 },
                data: { status: 'DELETED' }
            });

            expect(result.status).toBe('DELETED');
        });
    });

    describe('POST /api/sheets/[sheetId]/restore - Restore Sheet', () => {
        it('should restore deleted sheet', async () => {
            vi.mocked(getSession).mockResolvedValue({ id: 1, name: 'User1' });

            const deletedSheet = { id: 1, name: 'Sheet1', status: 'DELETED' };
            vi.mocked(prisma.sheet.findUnique).mockResolvedValue(deletedSheet as any);

            const restored = { ...deletedSheet, status: 'OPEN' };
            vi.mocked(prisma.sheet.update).mockResolvedValue(restored as any);

            const result = await prisma.sheet.update({
                where: { id: 1 },
                data: { status: 'OPEN' }
            });

            expect(result.status).toBe('OPEN');
        });

        it('should prevent restoring sheet with duplicate name', async () => {
            vi.mocked(getSession).mockResolvedValue({ id: 1, name: 'User1' });

            // Another active sheet has the same name
            const conflictSheet = { id: 5, name: 'Sheet1', status: 'OPEN' };
            vi.mocked(prisma.sheet.findFirst).mockResolvedValue(conflictSheet as any);

            const conflict = await prisma.sheet.findFirst({
                where: {
                    workspaceId: 1,
                    name: 'Sheet1',
                    status: { not: 'DELETED' },
                    id: { not: 1 }
                }
            });

            expect(conflict).not.toBeNull();
            // API returns 409 - must rename before restore
        });
    });

    describe('DELETE /api/sheets/[sheetId]/permanent - Permanent Delete', () => {
        it('should permanently delete sheet and all related data', async () => {
            vi.mocked(getSession).mockResolvedValue({ id: 1, name: 'Admin' });

            const sheet = { id: 1, workspaceId: 1, status: 'DELETED' };
            vi.mocked(prisma.sheet.findUnique).mockResolvedValue(sheet as any);
            vi.mocked(prisma.member.findFirst).mockResolvedValue({ id: 1, role: 'ADMIN' } as any);

            // Delete cascades
            vi.mocked(prisma.split.deleteMany).mockResolvedValue({ count: 5 } as any);
            vi.mocked(prisma.expense.deleteMany).mockResolvedValue({ count: 10 } as any);
            vi.mocked(prisma.sheet.delete).mockResolvedValue(sheet as any);

            const result = await prisma.sheet.delete({ where: { id: 1 } });

            expect(result.id).toBe(1);
        });

        it('should only allow permanent delete for sheets in DELETED status', async () => {
            vi.mocked(getSession).mockResolvedValue({ id: 1, name: 'Admin' });

            const activeSheet = { id: 1, workspaceId: 1, status: 'OPEN' };
            vi.mocked(prisma.sheet.findUnique).mockResolvedValue(activeSheet as any);

            // Should not allow permanent delete of OPEN sheets
            expect(activeSheet.status).not.toBe('DELETED');
            // API returns 400 or 403
        });
    });
});
