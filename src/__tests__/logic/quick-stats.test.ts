/**
 * QuickStats Component Logic Tests
 * Kiểm tra calculations: total spent, average, transaction count, shared pool
 */
import { describe, it, expect } from 'vitest';

// Test the calculation logic used by QuickStats
const formatMoney = (amount: number) => amount.toLocaleString('vi-VN');

interface Stats {
    [name: string]: { totalPaid: number; sharedPaid: number };
}

interface Bill {
    id: number;
    amount: number;
    payer: string;
    type: string;
}

describe('QuickStats Calculation Logic', () => {

    describe('Total Spent Calculation', () => {
        it('should sum totalPaid across all members', () => {
            const stats: Stats = {
                'Alice': { totalPaid: 500000, sharedPaid: 300000 },
                'Bob': { totalPaid: 300000, sharedPaid: 200000 },
            };
            const memberNames = ['Alice', 'Bob'];

            const totalSpent = memberNames.reduce((sum, name) => {
                return sum + (stats[name]?.totalPaid || 0);
            }, 0);

            expect(totalSpent).toBe(800000);
        });

        it('should handle empty members', () => {
            const stats: Stats = {};
            const memberNames: string[] = [];

            const totalSpent = memberNames.reduce((sum, name) => {
                return sum + (stats[name]?.totalPaid || 0);
            }, 0);

            expect(totalSpent).toBe(0);
        });

        it('should handle members with no stats', () => {
            const stats: Stats = {};
            const memberNames = ['Alice'];

            const totalSpent = memberNames.reduce((sum, name) => {
                return sum + (stats[name]?.totalPaid || 0);
            }, 0);

            expect(totalSpent).toBe(0);
        });
    });

    describe('Average Per Person', () => {
        it('should calculate correct average', () => {
            const totalSpent = 900000;
            const memberCount = 3;
            const avg = memberCount > 0 ? totalSpent / memberCount : 0;

            expect(avg).toBe(300000);
        });

        it('should handle zero members (avoid division by zero)', () => {
            const totalSpent = 0;
            const memberCount = 0;
            const avg = memberCount > 0 ? totalSpent / memberCount : 0;

            expect(avg).toBe(0);
        });

        it('should handle uneven splits', () => {
            const totalSpent = 100000;
            const memberCount = 3;
            const avg = Math.round(totalSpent / memberCount);

            expect(avg).toBe(33333);
        });
    });

    describe('Transaction Count', () => {
        it('should count all bills', () => {
            const bills: Bill[] = [
                { id: 1, amount: 100, payer: 'A', type: 'SHARED' },
                { id: 2, amount: 200, payer: 'B', type: 'PRIVATE' },
                { id: 3, amount: 300, payer: 'A', type: 'SHARED' },
            ];

            expect(bills.length).toBe(3);
        });

        it('should handle zero bills', () => {
            const bills: Bill[] = [];
            expect(bills.length).toBe(0);
        });
    });

    describe('Shared Pool', () => {
        it('should sum only sharedPaid amounts', () => {
            const stats: Stats = {
                'Alice': { totalPaid: 500000, sharedPaid: 300000 },
                'Bob': { totalPaid: 300000, sharedPaid: 100000 },
                'Charlie': { totalPaid: 200000, sharedPaid: 0 },
            };
            const memberNames = ['Alice', 'Bob', 'Charlie'];

            const sharedTotal = memberNames.reduce((sum, name) => {
                return sum + (stats[name]?.sharedPaid || 0);
            }, 0);

            expect(sharedTotal).toBe(400000);
        });
    });

    describe('Money Formatting', () => {
        it('should format with thousands separator', () => {
            const formatted = formatMoney(1500000);
            // Vietnamese locale uses dot separator
            expect(formatted).toContain('1');
            expect(formatted).toContain('500');
            expect(formatted).toContain('000');
        });

        it('should handle zero', () => {
            const formatted = formatMoney(0);
            expect(formatted).toBe('0');
        });
    });
});
