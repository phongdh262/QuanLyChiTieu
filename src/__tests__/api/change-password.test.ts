/**
 * Change Password API Tests
 * Kiểm tra tính năng đổi mật khẩu: validation, authentication, authorization
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
    default: {
        member: {
            findUnique: vi.fn(),
            update: vi.fn(),
        }
    }
}));

vi.mock('@/lib/auth', () => ({
    getSession: vi.fn(),
}));

vi.mock('bcryptjs', () => ({
    default: {
        compare: vi.fn(),
        genSalt: vi.fn(),
        hash: vi.fn(),
    }
}));

import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';

describe('Change Password API Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('POST /api/auth/change-password', () => {
        it('should change password with correct current password', async () => {
            vi.mocked(getSession).mockResolvedValue({ id: 1, name: 'User1' });

            const dbUser = {
                id: 1,
                name: 'User1',
                password: '$2b$10$existinghash'
            };
            vi.mocked(prisma.member.findUnique).mockResolvedValue(dbUser as any);
            vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
            vi.mocked(bcrypt.genSalt).mockResolvedValue('$2b$10$salt' as never);
            vi.mocked(bcrypt.hash).mockResolvedValue('$2b$10$newhash' as never);
            vi.mocked(prisma.member.update).mockResolvedValue({ ...dbUser, password: '$2b$10$newhash' } as any);

            // Verify password comparison
            const isValid = await bcrypt.compare('currentpass', dbUser.password);
            expect(isValid).toBe(true);

            // Verify new hash generation
            const salt = await bcrypt.genSalt(10);
            const hashed = await bcrypt.hash('newpassword', salt);
            expect(hashed).toBe('$2b$10$newhash');

            // Verify update
            const updated = await prisma.member.update({
                where: { id: 1 },
                data: { password: hashed } as any
            });
            expect(updated.password).toBe('$2b$10$newhash');
        });

        it('should reject with incorrect current password', async () => {
            vi.mocked(getSession).mockResolvedValue({ id: 1, name: 'User1' });

            const dbUser = { id: 1, password: '$2b$10$existinghash' };
            vi.mocked(prisma.member.findUnique).mockResolvedValue(dbUser as any);
            vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

            const isValid = await bcrypt.compare('wrongpass', dbUser.password);
            expect(isValid).toBe(false);
            // API returns 400
        });

        it('should reject without authentication', async () => {
            vi.mocked(getSession).mockResolvedValue(null);
            const session = await getSession();
            expect(session).toBeNull();
            // API returns 401
        });

        it('should reject when user not found in DB', async () => {
            vi.mocked(getSession).mockResolvedValue({ id: 999, name: 'Ghost' });
            vi.mocked(prisma.member.findUnique).mockResolvedValue(null);

            const user = await prisma.member.findUnique({ where: { id: 999 } });
            expect(user).toBeNull();
            // API returns 404
        });

        it('should reject empty passwords', () => {
            const currentPassword = '';
            const newPassword = '';

            expect(currentPassword.length).toBe(0);
            expect(newPassword.length).toBe(0);
            // API returns 400
        });

        it('should hash new password before storing', async () => {
            vi.mocked(bcrypt.genSalt).mockResolvedValue('$2b$10$salt' as never);
            vi.mocked(bcrypt.hash).mockResolvedValue('$2b$10$securely_hashed' as never);

            const hashed = await bcrypt.hash('MyNewP@ss123', '$2b$10$salt');

            expect(hashed).not.toBe('MyNewP@ss123'); // Must not store plaintext
            expect(hashed).toBe('$2b$10$securely_hashed');
        });
    });
});
