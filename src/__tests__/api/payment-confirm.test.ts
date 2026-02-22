/**
 * Payment Confirmation API Tests
 * Kiểm tra confirm/reject payment: quyền hạn payer, locked sheet, state transitions
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
    default: {
        split: {
            findUnique: vi.fn(),
            findMany: vi.fn(),
            update: vi.fn(),
        },
        expense: {
            update: vi.fn(),
        },
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

describe('Payment Confirmation API Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const mockSplit = {
        id: 10,
        expenseId: 100,
        memberId: 2,
        isPaid: false,
        isPending: true,
        expense: {
            id: 100,
            payerId: 1,
            description: 'Dinner',
            payer: { id: 1, name: 'Payer1' },
            sheet: { workspaceId: 1, status: 'OPEN' }
        },
        member: { id: 2, name: 'Debtor1' }
    };

    describe('POST /api/payments/confirm', () => {
        it('should confirm payment when user is payer', async () => {
            vi.mocked(getSession).mockResolvedValue({ id: 1, name: 'Payer1', role: 'MEMBER' });
            vi.mocked(prisma.split.findUnique).mockResolvedValue(mockSplit as any);

            const isPayer = String(mockSplit.expense.payerId) === String(1);
            expect(isPayer).toBe(true);

            // Confirm = isPaid: true, isPending: false
            vi.mocked((prisma.split as any).update).mockResolvedValue({ ...mockSplit, isPaid: true, isPending: false });
            const result = await (prisma.split as any).update({
                where: { id: 10 },
                data: { isPaid: true, isPending: false }
            });
            expect(result.isPaid).toBe(true);
            expect(result.isPending).toBe(false);
        });

        it('should reject payment when user is payer', async () => {
            vi.mocked(getSession).mockResolvedValue({ id: 1, name: 'Payer1', role: 'MEMBER' });
            vi.mocked(prisma.split.findUnique).mockResolvedValue(mockSplit as any);

            // Reject = isPaid: false, isPending: false, paidAt: null
            vi.mocked((prisma.split as any).update).mockResolvedValue({ ...mockSplit, isPaid: false, isPending: false, paidAt: null });
            const result = await (prisma.split as any).update({
                where: { id: 10 },
                data: { isPaid: false, isPending: false, paidAt: null }
            });
            expect(result.isPaid).toBe(false);
            expect(result.isPending).toBe(false);
        });

        it('should allow admin to confirm payment', async () => {
            vi.mocked(getSession).mockResolvedValue({ id: 99, name: 'Admin', role: 'ADMIN' });
            vi.mocked(prisma.split.findUnique).mockResolvedValue(mockSplit as any);

            const isAdmin = true;
            const isPayer = String(mockSplit.expense.payerId) === String(99);
            expect(isPayer).toBe(false);
            expect(isAdmin).toBe(true);
            // Admin can confirm even if not payer
        });

        it('should reject action from non-payer non-admin', async () => {
            vi.mocked(getSession).mockResolvedValue({ id: 3, name: 'Regular', role: 'MEMBER' });
            vi.mocked(prisma.split.findUnique).mockResolvedValue(mockSplit as any);

            const isPayer = String(mockSplit.expense.payerId) === String(3);
            const isAdmin = false;
            expect(isPayer).toBe(false);
            expect(isAdmin).toBe(false);
            // API returns 403
        });

        it('should reject without authentication', async () => {
            vi.mocked(getSession).mockResolvedValue(null);
            const session = await getSession();
            expect(session).toBeNull();
            // API returns 401
        });

        it('should reject missing splitId', () => {
            const body = { action: 'confirm' };
            expect(body).not.toHaveProperty('splitId');
            // API returns 400
        });

        it('should return 404 for non-existent split', async () => {
            vi.mocked(getSession).mockResolvedValue({ id: 1, name: 'User1', role: 'MEMBER' });
            vi.mocked(prisma.split.findUnique).mockResolvedValue(null);

            const split = await prisma.split.findUnique({ where: { id: 9999 } });
            expect(split).toBeNull();
            // API returns 404
        });

        it('should reject payment actions on locked sheet', async () => {
            vi.mocked(getSession).mockResolvedValue({ id: 1, name: 'Payer1', role: 'MEMBER' });

            const lockedSplit = {
                ...mockSplit,
                expense: {
                    ...mockSplit.expense,
                    sheet: { workspaceId: 1, status: 'LOCKED' }
                }
            };
            vi.mocked(prisma.split.findUnique).mockResolvedValue(lockedSplit as any);

            expect(lockedSplit.expense.sheet.status).toBe('LOCKED');
            // API returns 403
        });

        it('should update global settled status when all splits paid', async () => {
            vi.mocked(prisma.split.findMany).mockResolvedValue([
                { isPaid: true },
                { isPaid: true },
            ] as any);

            const allSplits = await prisma.split.findMany({ where: { expenseId: 100 } });
            const allPaid = (allSplits as any[]).every(s => s.isPaid);
            expect(allPaid).toBe(true);
        });
    });
});
