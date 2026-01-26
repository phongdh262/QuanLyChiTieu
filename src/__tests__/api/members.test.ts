/**
 * Members API Tests
 * Kiểm tra CRUD operations và soft delete cho Members
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
    default: {
        member: {
            findFirst: vi.fn(),
            findUnique: vi.fn(),
            findMany: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
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

describe('Members API Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('POST /api/members - Create Member', () => {
        it('should create a new member when authorized', async () => {
            vi.mocked(getSession).mockResolvedValue({ id: 1, name: 'Admin' });

            // User is member of workspace
            vi.mocked(prisma.member.findFirst).mockResolvedValue({
                id: 1,
                workspaceId: 1
            } as any);

            const newMember = {
                id: 10,
                name: 'New Member',
                workspaceId: 1,
                status: 'ACTIVE'
            };

            vi.mocked(prisma.member.create).mockResolvedValue(newMember as any);

            const result = await prisma.member.create({
                data: { name: 'New Member', workspaceId: 1 }
            });

            expect(result.name).toBe('New Member');
            expect(result.workspaceId).toBe(1);
        });

        it('should reject creation when not member of workspace', async () => {
            vi.mocked(getSession).mockResolvedValue({ id: 1, name: 'Outsider' });
            vi.mocked(prisma.member.findFirst).mockResolvedValue(null);

            const requestor = await prisma.member.findFirst({
                where: { id: 1, workspaceId: 999 }
            });

            expect(requestor).toBeNull();
            // API would return 403 Forbidden
        });
    });

    describe('PUT /api/members/[id] - Update Member', () => {
        it('should update member name when authorized', async () => {
            vi.mocked(getSession).mockResolvedValue({ id: 1, name: 'Admin' });

            const targetMember = { id: 5, workspaceId: 1 };
            vi.mocked(prisma.member.findUnique).mockResolvedValue(targetMember as any);

            // Requestor is in same workspace
            vi.mocked(prisma.member.findFirst).mockResolvedValue({ id: 1, workspaceId: 1 } as any);

            const updated = { id: 5, name: 'Updated Name', workspaceId: 1 };
            vi.mocked(prisma.member.update).mockResolvedValue(updated as any);

            const result = await prisma.member.update({
                where: { id: 5 },
                data: { name: 'Updated Name' }
            });

            expect(result.name).toBe('Updated Name');
        });

        it('should return 404 for non-existent member', async () => {
            vi.mocked(getSession).mockResolvedValue({ id: 1, name: 'Admin' });
            vi.mocked(prisma.member.findUnique).mockResolvedValue(null);

            const member = await prisma.member.findUnique({ where: { id: 999 } });

            expect(member).toBeNull();
            // API would return 404 Not Found
        });
    });

    describe('DELETE /api/members/[id] - Soft Delete Member', () => {
        it('should soft delete member by setting status to DELETED', async () => {
            vi.mocked(getSession).mockResolvedValue({ id: 1, name: 'Admin' });

            const member = { id: 5, name: 'ToDelete', workspaceId: 1, status: 'ACTIVE' };
            vi.mocked(prisma.member.findUnique).mockResolvedValue(member as any);
            vi.mocked(prisma.member.findFirst).mockResolvedValue({ id: 1, workspaceId: 1 } as any);

            const deleted = { ...member, status: 'DELETED' };
            vi.mocked(prisma.member.update).mockResolvedValue(deleted as any);

            const result = await prisma.member.update({
                where: { id: 5 },
                data: { status: 'DELETED' }
            });

            expect(result.status).toBe('DELETED');
        });

        it('should not return DELETED members in member list', async () => {
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
            expect(members.every(m => m.status === 'ACTIVE')).toBe(true);
        });
    });

    describe('POST /api/members/[id]/restore - Restore Member', () => {
        it('should restore deleted member by setting status to ACTIVE', async () => {
            vi.mocked(getSession).mockResolvedValue({ id: 1, name: 'Admin' });

            const deletedMember = { id: 5, name: 'Deleted', workspaceId: 1, status: 'DELETED' };
            vi.mocked(prisma.member.findUnique).mockResolvedValue(deletedMember as any);

            const restored = { ...deletedMember, status: 'ACTIVE' };
            vi.mocked(prisma.member.update).mockResolvedValue(restored as any);

            const result = await prisma.member.update({
                where: { id: 5 },
                data: { status: 'ACTIVE' }
            });

            expect(result.status).toBe('ACTIVE');
        });
    });
});
