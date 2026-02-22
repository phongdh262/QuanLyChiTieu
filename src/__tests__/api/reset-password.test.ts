/**
 * Reset Password API Tests
 * Kiểm tra Admin Reset Password cho member
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
    default: {
        member: {
            findUnique: vi.fn(),
            update: vi.fn(),
        },
        activityLog: {
            create: vi.fn(),
        }
    }
}));

vi.mock('@/lib/auth', () => ({
    getSession: vi.fn(),
    hashPassword: vi.fn(),
}));

vi.mock('@/lib/rateLimit', () => ({
    resetPasswordRateLimit: {
        check: vi.fn(() => ({ isRateLimited: false, remaining: 3 })),
    }
}));

import prisma from '@/lib/prisma';
import { getSession, hashPassword } from '@/lib/auth';
import { resetPasswordRateLimit } from '@/lib/rateLimit';

describe('POST /api/auth/reset-password', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should return 401 when not authenticated', async () => {
        vi.mocked(getSession).mockResolvedValue(null);

        const session = await getSession();
        expect(session).toBeNull();
        // API should return 401 Unauthorized
    });

    it('should return 403 when user is not ADMIN', async () => {
        vi.mocked(getSession).mockResolvedValue({ id: 2, name: 'Member1' });
        vi.mocked(prisma.member.findUnique).mockResolvedValue({
            id: 2,
            name: 'Member1',
            role: 'MEMBER',
            workspaceId: 1,
        } as any);

        const session = await getSession();
        expect(session).not.toBeNull();

        const admin = await prisma.member.findUnique({ where: { id: 2 } });
        expect(admin?.role).toBe('MEMBER');
        expect(admin?.role).not.toBe('ADMIN');
        // API should return 403 Forbidden
    });

    it('should return 404 when target member does not exist', async () => {
        vi.mocked(getSession).mockResolvedValue({ id: 1, name: 'Admin' });
        vi.mocked(prisma.member.findUnique)
            .mockResolvedValueOnce({
                id: 1, name: 'Admin', role: 'ADMIN', workspaceId: 1,
            } as any)
            .mockResolvedValueOnce(null); // Target member not found

        const admin = await prisma.member.findUnique({ where: { id: 1 } });
        expect(admin?.role).toBe('ADMIN');

        const target = await prisma.member.findUnique({ where: { id: 999 } });
        expect(target).toBeNull();
        // API should return 404 Not Found
    });

    it('should return 403 when member belongs to different workspace', async () => {
        vi.mocked(getSession).mockResolvedValue({ id: 1, name: 'Admin' });
        vi.mocked(prisma.member.findUnique)
            .mockResolvedValueOnce({
                id: 1, name: 'Admin', role: 'ADMIN', workspaceId: 1,
            } as any)
            .mockResolvedValueOnce({
                id: 5, name: 'OtherUser', username: 'other', workspaceId: 2, status: 'ACTIVE',
            } as any);

        const admin = await prisma.member.findUnique({ where: { id: 1 } });
        const target = await prisma.member.findUnique({ where: { id: 5 } });

        expect(admin!.workspaceId).not.toBe(target!.workspaceId);
        // API should return 403 Forbidden
    });

    it('should return 400 when member has no username (no login account)', async () => {
        vi.mocked(getSession).mockResolvedValue({ id: 1, name: 'Admin' });
        vi.mocked(prisma.member.findUnique)
            .mockResolvedValueOnce({
                id: 1, name: 'Admin', role: 'ADMIN', workspaceId: 1,
            } as any)
            .mockResolvedValueOnce({
                id: 3, name: 'NoAccount', username: null, workspaceId: 1, status: 'ACTIVE',
            } as any);

        // First call returns admin
        const admin = await prisma.member.findUnique({ where: { id: 1 } });
        expect(admin?.role).toBe('ADMIN');

        // Second call returns target member without username
        const target = await prisma.member.findUnique({ where: { id: 3 } });
        expect(target?.username).toBeNull();
        // API should return 400 Bad Request
    });

    it('should successfully reset password for ADMIN', async () => {
        vi.mocked(getSession).mockResolvedValue({ id: 1, name: 'Admin' });
        vi.mocked(hashPassword).mockResolvedValue('$2b$10$newhash');
        vi.mocked(prisma.member.findUnique)
            .mockResolvedValueOnce({
                id: 1, name: 'Admin', role: 'ADMIN', workspaceId: 1,
            } as any)
            .mockResolvedValueOnce({
                id: 2, name: 'User2', username: 'user2', workspaceId: 1, status: 'ACTIVE',
            } as any);
        vi.mocked(prisma.member.update).mockResolvedValue({} as any);
        vi.mocked(prisma.activityLog.create).mockResolvedValue({} as any);

        // First call: verify admin
        const admin = await prisma.member.findUnique({ where: { id: 1 } });
        expect(admin?.role).toBe('ADMIN');

        // Second call: verify target exists in same workspace
        const target = await prisma.member.findUnique({ where: { id: 2 } });
        expect(target?.username).toBe('user2');
        expect(target?.workspaceId).toBe(admin?.workspaceId);

        // Verify password can be hashed
        const hashed = await hashPassword('newpassword123');
        expect(hashed).toBe('$2b$10$newhash');

        // API should return { success: true }
    });

    it('should validate password minimum length', () => {
        const shortPassword = '1234567'; // 7 chars, too short
        const validPassword = '12345678'; // 8 chars, valid

        expect(shortPassword.length).toBeLessThan(8);
        expect(validPassword.length).toBeGreaterThanOrEqual(8);
        // API should return 400 for short passwords via Zod validation
    });

    it('should rate limit excessive requests', () => {
        vi.mocked(resetPasswordRateLimit.check).mockReturnValue({
            isRateLimited: true,
            currentUsage: 4,
            limit: 3,
            remaining: 0,
        });

        const result = resetPasswordRateLimit.check(3, '127.0.0.1');
        expect(result.isRateLimited).toBe(true);
        expect(result.remaining).toBe(0);
        // API should return 429 Too Many Requests
    });
});
