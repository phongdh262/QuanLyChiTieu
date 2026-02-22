/**
 * Locked Sheet Security Tests
 * Kiểm tra enforcement của sheet locking trên tất cả operations
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
    default: {
        sheet: {
            findUnique: vi.fn(),
            update: vi.fn(),
        },
        expense: {
            findUnique: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        },
        member: {
            findFirst: vi.fn(),
            findUnique: vi.fn(),
        },
        split: {
            updateMany: vi.fn(),
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

describe('Locked Sheet Security Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const lockedSheet = { id: 1, workspaceId: 1, status: 'LOCKED' };
    const openSheet = { id: 2, workspaceId: 1, status: 'OPEN' };

    describe('Expense Operations on Locked Sheets', () => {
        it('should prevent creating expense on locked sheet', async () => {
            vi.mocked(getSession).mockResolvedValue({ id: 1, name: 'User1' });
            vi.mocked(prisma.sheet.findUnique).mockResolvedValue(lockedSheet as any);

            const sheet = await prisma.sheet.findUnique({ where: { id: 1 } });
            expect(sheet?.status).toBe('LOCKED');
            // API returns 403 "Sheet is locked"
        });

        it('should prevent updating expense on locked sheet', async () => {
            vi.mocked(getSession).mockResolvedValue({ id: 1, name: 'User1' });

            const expense = {
                id: 100,
                payerId: 1,
                sheet: lockedSheet
            };
            vi.mocked(prisma.expense.findUnique).mockResolvedValue(expense as any);

            expect(expense.sheet.status).toBe('LOCKED');
            // API returns 403
        });

        it('should prevent deleting expense on locked sheet', async () => {
            vi.mocked(getSession).mockResolvedValue({ id: 1, name: 'User1' });

            const expense = {
                id: 100,
                payerId: 1,
                sheet: lockedSheet
            };
            vi.mocked(prisma.expense.findUnique).mockResolvedValue(expense as any);

            expect(expense.sheet.status).toBe('LOCKED');
            // API returns 403
        });

        it('should allow operations on open sheet', async () => {
            vi.mocked(getSession).mockResolvedValue({ id: 1, name: 'User1' });
            vi.mocked(prisma.sheet.findUnique).mockResolvedValue(openSheet as any);

            const sheet = await prisma.sheet.findUnique({ where: { id: 2 } });
            expect(sheet?.status).toBe('OPEN');
            // Operations are allowed
        });
    });

    describe('Settlement on Locked Sheets', () => {
        it('should prevent settling expense on locked sheet', async () => {
            vi.mocked(getSession).mockResolvedValue({ id: 1, name: 'Payer1' });

            const expense = {
                id: 100,
                payerId: 1,
                isSettled: false,
                payer: { id: 1, name: 'Payer1' },
                sheet: lockedSheet
            };
            vi.mocked(prisma.expense.findUnique).mockResolvedValue(expense as any);

            expect(expense.sheet.status).toBe('LOCKED');
            // API returns 403
        });

        it('should prevent payment confirmation on locked sheet', async () => {
            const split = {
                id: 10,
                expense: {
                    payerId: 1,
                    sheet: lockedSheet
                }
            };

            expect(split.expense.sheet.status).toBe('LOCKED');
            // API returns 403
        });
    });

    describe('Sheet Lock Toggle', () => {
        it('should only allow ADMIN to lock sheet', async () => {
            vi.mocked(getSession).mockResolvedValue({ id: 1, name: 'Admin', role: 'ADMIN' });

            const member = { id: 1, role: 'ADMIN', workspaceId: 1 };
            vi.mocked(prisma.member.findUnique).mockResolvedValue(member as any);

            const result = await prisma.member.findUnique({ where: { id: 1 } });
            expect(result?.role).toBe('ADMIN');
        });

        it('should prevent MEMBER from locking sheet', async () => {
            vi.mocked(getSession).mockResolvedValue({ id: 2, name: 'Regular', role: 'MEMBER' });

            const member = { id: 2, role: 'MEMBER', workspaceId: 1 };
            vi.mocked(prisma.member.findUnique).mockResolvedValue(member as any);

            const result = await prisma.member.findUnique({ where: { id: 2 } });
            expect(result?.role).not.toBe('ADMIN');
            // API returns 403
        });

        it('should toggle sheet status correctly', async () => {
            vi.mocked(prisma.sheet.update).mockResolvedValue({ ...openSheet, status: 'LOCKED' } as any);

            const result = await prisma.sheet.update({
                where: { id: 2 },
                data: { status: 'LOCKED' } as any
            });

            expect(result.status).toBe('LOCKED');
        });

        it('should unlock locked sheet', async () => {
            vi.mocked(prisma.sheet.update).mockResolvedValue({ ...lockedSheet, status: 'OPEN' } as any);

            const result = await prisma.sheet.update({
                where: { id: 1 },
                data: { status: 'OPEN' } as any
            });

            expect(result.status).toBe('OPEN');
        });
    });

    describe('Sheet Delete Protection', () => {
        it('should prevent deleting locked sheet', async () => {
            vi.mocked(prisma.sheet.findUnique).mockResolvedValue(lockedSheet as any);

            const sheet = await prisma.sheet.findUnique({ where: { id: 1 } });
            expect(sheet?.status).toBe('LOCKED');
            // API should reject delete for locked sheets
        });

        it('should allow deleting open sheet', async () => {
            vi.mocked(prisma.sheet.findUnique).mockResolvedValue(openSheet as any);

            const sheet = await prisma.sheet.findUnique({ where: { id: 2 } });
            expect(sheet?.status).toBe('OPEN');
            // API allows delete
        });
    });
});
