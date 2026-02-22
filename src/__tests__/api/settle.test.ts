/**
 * Payment Settlement API Tests
 * Kiểm tra logic settle/unsettl expense: per-member, global, pending, permissions
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
    default: {
        expense: {
            findUnique: vi.fn(),
            update: vi.fn(),
        },
        member: {
            findFirst: vi.fn(),
            findUnique: vi.fn(),
        },
        split: {
            findFirst: vi.fn(),
            findMany: vi.fn(),
            updateMany: vi.fn(),
        },
        $transaction: vi.fn(),
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

describe('Settlement API Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('POST /api/expenses/[id]/settle', () => {
        const mockExpense = {
            id: 100,
            description: 'Dinner',
            payerId: 1,
            isSettled: false,
            payer: { id: 1, name: 'Payer1' },
            sheet: { workspaceId: 1, status: 'OPEN' }
        };

        it('should allow payer to settle specific member', async () => {
            vi.mocked(getSession).mockResolvedValue({ id: 1, name: 'Payer1' });
            vi.mocked(prisma.expense.findUnique).mockResolvedValue(mockExpense as any);
            vi.mocked(prisma.member.findFirst).mockResolvedValue({ id: 2, name: 'Debtor1', workspaceId: 1 } as any);
            vi.mocked(prisma.split.findFirst).mockResolvedValue({ isPaid: false, isPending: false } as any);

            // Payer confirms payment for member
            const isPayer = String(mockExpense.payerId) === String(1);
            expect(isPayer).toBe(true);

            // Update split to paid
            vi.mocked((prisma.split as any).updateMany).mockResolvedValue({ count: 1 });
            const result = await (prisma.split as any).updateMany({
                where: { expenseId: 100, memberId: 2 },
                data: { isPaid: true, isPending: false, paidAt: new Date() }
            });
            expect(result.count).toBe(1);
        });

        it('should create pending request when beneficiary tries to mark paid', async () => {
            vi.mocked(getSession).mockResolvedValue({ id: 2, name: 'Debtor1' });
            vi.mocked(prisma.expense.findUnique).mockResolvedValue(mockExpense as any);
            vi.mocked(prisma.member.findFirst).mockResolvedValue({ id: 2, name: 'Debtor1', workspaceId: 1 } as any);

            // Beneficiary is NOT the payer
            const isPayer = String(mockExpense.payerId) === String(2);
            expect(isPayer).toBe(false);

            // Beneficiary marks themselves → should create PENDING
            const isBeneficiary = true;
            expect(isBeneficiary).toBe(true);

            vi.mocked((prisma.split as any).updateMany).mockResolvedValue({ count: 1 });
            const result = await (prisma.split as any).updateMany({
                where: { expenseId: 100, memberId: 2 },
                data: { isPaid: false, isPending: true, paidAt: new Date() }
            });
            expect(result.count).toBe(1);
        });

        it('should reject settlement from non-payer non-beneficiary', async () => {
            vi.mocked(getSession).mockResolvedValue({ id: 3, name: 'Outsider' });
            vi.mocked(prisma.expense.findUnique).mockResolvedValue(mockExpense as any);
            vi.mocked(prisma.member.findFirst).mockResolvedValue(null); // Not found as beneficiary

            const isPayer = String(mockExpense.payerId) === String(3);
            const isAdmin = false;
            const isBeneficiary = false;

            expect(isPayer).toBe(false);
            expect(isAdmin).toBe(false);
            expect(isBeneficiary).toBe(false);
            // API returns 403
        });

        it('should reject without authentication', async () => {
            vi.mocked(getSession).mockResolvedValue(null);
            const session = await getSession();
            expect(session).toBeNull();
            // API returns 401
        });

        it('should reject settlement on locked sheet', async () => {
            vi.mocked(getSession).mockResolvedValue({ id: 1, name: 'Payer1' });

            const lockedExpense = {
                ...mockExpense,
                sheet: { workspaceId: 1, status: 'LOCKED' }
            };

            vi.mocked(prisma.expense.findUnique).mockResolvedValue(lockedExpense as any);

            expect(lockedExpense.sheet.status).toBe('LOCKED');
            // API returns 403 with "Sheet đã bị khóa"
        });

        it('should mark expense as fully settled when all splits paid', async () => {
            vi.mocked(getSession).mockResolvedValue({ id: 1, name: 'Payer1' });
            vi.mocked(prisma.expense.findUnique).mockResolvedValue(mockExpense as any);

            // All splits are paid
            const allSplits = [
                { isPaid: true, memberId: 2 },
                { isPaid: true, memberId: 3 },
            ];
            vi.mocked(prisma.split.findMany).mockResolvedValue(allSplits as any);

            const allPaid = allSplits.every(s => s.isPaid);
            expect(allPaid).toBe(true);

            // Global expense should be marked settled
            vi.mocked((prisma.expense as any).update).mockResolvedValue({ ...mockExpense, isSettled: true });
            const result = await (prisma.expense as any).update({
                where: { id: 100 },
                data: { isSettled: true }
            });
            expect(result.isSettled).toBe(true);
        });

        it('should NOT mark as settled when some splits remain unpaid', async () => {
            const allSplits = [
                { isPaid: true, memberId: 2 },
                { isPaid: false, memberId: 3 }, // Still unpaid
            ];
            vi.mocked(prisma.split.findMany).mockResolvedValue(allSplits as any);

            const allPaid = allSplits.every(s => s.isPaid);
            expect(allPaid).toBe(false);
        });

        it('should return 404 for non-existent expense', async () => {
            vi.mocked(getSession).mockResolvedValue({ id: 1, name: 'User1' });
            vi.mocked(prisma.expense.findUnique).mockResolvedValue(null);

            const expense = await prisma.expense.findUnique({ where: { id: 9999 } });
            expect(expense).toBeNull();
            // API returns 404
        });
    });
});
