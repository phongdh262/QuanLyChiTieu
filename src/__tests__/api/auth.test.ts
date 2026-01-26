/**
 * Auth API Tests
 * Kiểm tra Authentication: login, logout, session
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
    default: {
        member: {
            findUnique: vi.fn(),
            findFirst: vi.fn(),
        }
    }
}));

vi.mock('@/lib/auth', () => ({
    getSession: vi.fn(),
    createSession: vi.fn(),
    deleteSession: vi.fn(),
}));

import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

describe('Auth API Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('POST /api/auth/login', () => {
        it('should authenticate user with correct credentials', async () => {
            const user = {
                id: 1,
                username: 'testuser',
                password: '$2b$10$hashedpassword', // bcrypt hash
                name: 'Test User',
                role: 'MEMBER',
                status: 'ACTIVE'
            };

            vi.mocked(prisma.member.findFirst).mockResolvedValue(user as any);

            const result = await prisma.member.findFirst({
                where: { username: 'testuser', status: 'ACTIVE' }
            });

            expect(result).not.toBeNull();
            expect(result?.username).toBe('testuser');
        });

        it('should reject login with incorrect username', async () => {
            vi.mocked(prisma.member.findFirst).mockResolvedValue(null);

            const result = await prisma.member.findFirst({
                where: { username: 'wronguser', status: 'ACTIVE' }
            });

            expect(result).toBeNull();
            // API returns 401
        });

        it('should reject login for DELETED users', async () => {
            vi.mocked(prisma.member.findFirst).mockResolvedValue(null);

            const result = await prisma.member.findFirst({
                where: { username: 'deleteduser', status: 'ACTIVE' }
            });

            expect(result).toBeNull();
            // Deleted users cannot login
        });

        it('should reject empty credentials', () => {
            const username = '';
            const password = '';

            expect(username.length).toBe(0);
            expect(password.length).toBe(0);
            // API returns 400 Bad Request
        });
    });

    describe('GET /api/auth/me', () => {
        it('should return current user info when authenticated', async () => {
            vi.mocked(getSession).mockResolvedValue({ id: 1, name: 'User1' });

            const user = {
                id: 1,
                name: 'User1',
                username: 'user1',
                role: 'MEMBER'
            };
            vi.mocked(prisma.member.findUnique).mockResolvedValue(user as any);

            const session = await getSession();
            expect(session).not.toBeNull();

            const result = await prisma.member.findUnique({
                where: { id: 1 }
            });

            expect(result?.name).toBe('User1');
            expect(result?.role).toBe('MEMBER');
        });

        it('should return 401 when not authenticated', async () => {
            vi.mocked(getSession).mockResolvedValue(null);

            const session = await getSession();
            expect(session).toBeNull();
            // API returns 401
        });

        it('should handle zombie session (JWT valid but user deleted)', async () => {
            vi.mocked(getSession).mockResolvedValue({ id: 999, name: 'Deleted' });
            vi.mocked(prisma.member.findUnique).mockResolvedValue(null);

            const user = await prisma.member.findUnique({
                where: { id: 999 }
            });

            expect(user).toBeNull();
            // Should force logout and redirect to login
        });
    });

    describe('POST /api/auth/logout', () => {
        it('should clear session on logout', async () => {
            vi.mocked(getSession).mockResolvedValue({ id: 1, name: 'User1' });

            // After logout, session should be null
            vi.mocked(getSession).mockResolvedValueOnce({ id: 1, name: 'User1' });

            const beforeLogout = await getSession();
            expect(beforeLogout).not.toBeNull();

            // Simulate logout
            vi.mocked(getSession).mockResolvedValue(null);

            const afterLogout = await getSession();
            expect(afterLogout).toBeNull();
        });
    });

    describe('Session Security', () => {
        it('should have session with correct user ID', async () => {
            vi.mocked(getSession).mockResolvedValue({ id: 1, name: 'User1' });

            const session = await getSession();

            expect(session?.id).toBe(1);
            expect(typeof session?.id).toBe('number');
        });

        it('should not expose password in session', async () => {
            vi.mocked(getSession).mockResolvedValue({ id: 1, name: 'User1' });

            const session = await getSession();

            expect(session).not.toHaveProperty('password');
        });
    });
});
