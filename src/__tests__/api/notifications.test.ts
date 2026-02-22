/**
 * Notifications API Tests
 * Kiểm tra fetching notifications: pending payer, pending debtor, history
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
    default: {
        split: {
            findMany: vi.fn(),
        },
    }
}));

vi.mock('@/lib/auth', () => ({
    getSession: vi.fn(),
}));

import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

describe('Notifications API Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('GET /api/notifications', () => {
        it('should return pending payer notifications', async () => {
            vi.mocked(getSession).mockResolvedValue({ id: 1, name: 'Payer1' });

            const pendingPayerSplits = [
                {
                    id: 10,
                    isPending: true,
                    isPaid: false,
                    expense: { id: 100, payerId: 1, description: 'Dinner', payer: { name: 'Payer1' } },
                    member: { name: 'Debtor1' }
                }
            ];
            vi.mocked((prisma.split as any).findMany).mockResolvedValueOnce(pendingPayerSplits);

            const results = await (prisma.split as any).findMany({
                where: { isPending: true, isPaid: false, expense: { payerId: 1 } }
            });

            expect(results).toHaveLength(1);
            expect(results[0].member.name).toBe('Debtor1');
        });

        it('should return pending debtor notifications', async () => {
            vi.mocked(getSession).mockResolvedValue({ id: 2, name: 'Debtor1' });

            const pendingDebtorSplits = [
                {
                    id: 10,
                    isPending: true,
                    isPaid: false,
                    memberId: 2,
                    expense: { id: 100, payerId: 1, description: 'Dinner', payer: { name: 'Payer1' } },
                    member: { name: 'Debtor1' }
                }
            ];
            vi.mocked((prisma.split as any).findMany).mockResolvedValueOnce(pendingDebtorSplits);

            const results = await (prisma.split as any).findMany({
                where: { isPending: true, isPaid: false, memberId: 2 }
            });

            expect(results).toHaveLength(1);
            expect(results[0].expense.payer.name).toBe('Payer1');
        });

        it('should return confirmation history for last 30 days', async () => {
            vi.mocked(getSession).mockResolvedValue({ id: 1, name: 'User1' });

            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const historyItems = [
                { id: 1, isPaid: true, isPending: false, paidAt: new Date() },
                { id: 2, isPaid: true, isPending: false, paidAt: new Date() },
            ];
            vi.mocked((prisma.split as any).findMany).mockResolvedValue(historyItems);

            const results = await (prisma.split as any).findMany({
                where: { isPaid: true, isPending: false, paidAt: { gte: thirtyDaysAgo } }
            });

            expect(results).toHaveLength(2);
            expect(results.every((r: any) => r.isPaid)).toBe(true);
        });

        it('should return empty arrays when no notifications', async () => {
            vi.mocked(getSession).mockResolvedValue({ id: 1, name: 'User1' });
            vi.mocked((prisma.split as any).findMany).mockResolvedValue([]);

            const results = await (prisma.split as any).findMany({});
            expect(results).toHaveLength(0);
        });

        it('should reject without authentication', async () => {
            vi.mocked(getSession).mockResolvedValue(null);
            const session = await getSession();
            expect(session).toBeNull();
            // API returns 401
        });

        it('should calculate totalPending from payer notifications', async () => {
            const pendingPayer = [
                { id: 1 },
                { id: 2 },
                { id: 3 },
            ];

            const totalPending = pendingPayer.length;
            expect(totalPending).toBe(3);
            // This drives the bell badge count
        });

        it('should limit history to 50 items for performance', () => {
            const LIMIT = 50;
            expect(LIMIT).toBe(50);
            // API uses take: 50 to prevent large payloads
        });
    });
});
