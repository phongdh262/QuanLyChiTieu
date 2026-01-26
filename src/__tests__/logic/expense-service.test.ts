/**
 * Expense Service Logic Tests
 * Kiểm tra logic tính toán: balance, splits, debts
 */
import { describe, it, expect } from 'vitest';
import {
    calculateFinalBalances,
    calculatePrivateMatrix,
    calculateDebts
} from '@/services/expenseService';
import { Bill } from '@/types/expense';

describe('Expense Service Logic Tests', () => {

    describe('calculateFinalBalances', () => {
        it('should calculate zero balance when no expenses', () => {
            const members = ['Alice', 'Bob'];
            const bills: Bill[] = [];

            const { balances, stats } = calculateFinalBalances(members, bills);

            expect(balances['Alice']).toBe(0);
            expect(balances['Bob']).toBe(0);
            // stats is Record<string, BalanceStats>, check totalPaid instead
            expect(stats['Alice'].totalPaid).toBe(0);
            expect(stats['Bob'].totalPaid).toBe(0);
        });

        it('should calculate correct balance for shared expense', () => {
            const members = ['Alice', 'Bob'];
            const bills: Bill[] = [
                {
                    id: 1,
                    amount: 100000,
                    payer: 'Alice',
                    type: 'SHARED',
                    beneficiaries: ['Alice', 'Bob'],
                    note: 'Dinner',
                    date: new Date().toISOString()
                }
            ];

            const { balances, stats } = calculateFinalBalances(members, bills);

            // Alice paid 100k, should receive 50k (her share is 50k, she paid 100k)
            expect(balances['Alice']).toBe(50000);
            // Bob owes 50k
            expect(balances['Bob']).toBe(-50000);
            expect(stats['Alice'].totalPaid).toBe(100000);
        });

        it('should handle multiple expenses with different payers', () => {
            const members = ['Alice', 'Bob', 'Charlie'];
            const bills: Bill[] = [
                {
                    id: 1,
                    amount: 90000, // 30k each
                    payer: 'Alice',
                    type: 'SHARED',
                    beneficiaries: members,
                    note: 'Lunch',
                    date: new Date().toISOString()
                },
                {
                    id: 2,
                    amount: 60000, // 20k each
                    payer: 'Bob',
                    type: 'SHARED',
                    beneficiaries: members,
                    note: 'Coffee',
                    date: new Date().toISOString()
                }
            ];

            const { balances } = calculateFinalBalances(members, bills);

            // Sum of all balances should be 0 (net zero)
            const sum = Object.values(balances).reduce((a, b) => a + b, 0);
            expect(sum).toBe(0);

            // Alice should have positive balance (she paid 90k, consumed 50k)
            expect(balances['Alice']).toBeGreaterThan(0);
            // Bob should have positive balance (he paid 60k, consumed 50k)
            expect(balances['Bob']).toBeGreaterThan(0);
            // Charlie should have negative balance (he paid 0, consumed 50k)
            expect(balances['Charlie']).toBeLessThan(0);
        });

        it('should correctly handle private expenses', () => {
            const members = ['Alice', 'Bob', 'Charlie'];
            const bills: Bill[] = [
                {
                    id: 1,
                    amount: 60000, // Only Alice and Bob split = 30k each
                    payer: 'Alice',
                    type: 'PRIVATE',
                    beneficiaries: ['Alice', 'Bob'],
                    note: 'Movie',
                    date: new Date().toISOString()
                }
            ];

            const { privateBalances } = calculateFinalBalances(members, bills);

            // Alice paid 60k for herself and Bob, her share is 30k, so +30k
            expect(privateBalances['Alice']).toBe(30000);
            // Bob owes 30k
            expect(privateBalances['Bob']).toBe(-30000);
            // Charlie not involved
            expect(privateBalances['Charlie']).toBe(0);
        });
    });

    describe('calculatePrivateMatrix', () => {
        it('should return empty matrix when no private expenses', () => {
            const members = ['Alice', 'Bob'];
            const bills: Bill[] = [];

            const { matrix } = calculatePrivateMatrix(members, bills);

            expect(matrix['Alice']['Bob']).toBe(0);
            expect(matrix['Bob']['Alice']).toBe(0);
        });

        it('should calculate correct debt between two members with splits', () => {
            const members = ['Alice', 'Bob'];
            const bills: Bill[] = [
                {
                    id: 1,
                    amount: 100000,
                    payer: 'Alice',
                    type: 'PRIVATE',
                    beneficiaries: ['Alice', 'Bob'],
                    note: 'Dinner',
                    date: new Date().toISOString(),
                    // Matrix requires splits to be present
                    splits: [
                        { member: { name: 'Alice' }, isPaid: false, amount: 50000 },
                        { member: { name: 'Bob' }, isPaid: false, amount: 50000 }
                    ]
                }
            ];

            const { matrix } = calculatePrivateMatrix(members, bills);

            // Alice paid for Bob 50k
            expect(matrix['Alice']['Bob']).toBe(50000);
        });
    });

    describe('calculateDebts', () => {
        it('should return empty array when all balances are zero', () => {
            const balances = { Alice: 0, Bob: 0 };

            const debts = calculateDebts(balances);

            expect(debts).toHaveLength(0);
        });

        it('should optimize debts to minimal transactions', () => {
            // Alice is owed 50k, Bob owes 50k
            const balances = { Alice: 50000, Bob: -50000 };

            const debts = calculateDebts(balances);

            expect(debts).toHaveLength(1);
            expect(debts[0].from).toBe('Bob');
            expect(debts[0].to).toBe('Alice');
            expect(debts[0].amount).toBe(50000);
        });

        it('should handle multiple creditors and debtors', () => {
            // Alice +40k, Bob +20k, Charlie -30k, Dave -30k
            const balances = {
                Alice: 40000,
                Bob: 20000,
                Charlie: -30000,
                Dave: -30000
            };

            const debts = calculateDebts(balances);

            // Total debts should equal total credits
            const totalDebt = debts.reduce((sum, d) => sum + d.amount, 0);
            expect(totalDebt).toBe(60000);
        });

        it('should skip very small balances (rounding errors)', () => {
            const balances = { Alice: 0.5, Bob: -0.5 };

            const debts = calculateDebts(balances);

            // Very small amounts should be ignored (threshold is 1)
            expect(debts).toHaveLength(0);
        });
    });

    describe('Edge Cases', () => {
        it('should handle single member scenario', () => {
            const members = ['Alice'];
            const bills: Bill[] = [
                {
                    id: 1,
                    amount: 100000,
                    payer: 'Alice',
                    type: 'SHARED',
                    beneficiaries: ['Alice'],
                    note: 'Solo',
                    date: new Date().toISOString()
                }
            ];

            const { balances } = calculateFinalBalances(members, bills);

            // Alice pays for herself, balance should be 0
            expect(balances['Alice']).toBe(0);
        });

        it('should handle settled expenses - stats still tracked', () => {
            const members = ['Alice', 'Bob'];
            const bills: Bill[] = [
                {
                    id: 1,
                    amount: 100000,
                    payer: 'Alice',
                    type: 'SHARED',
                    beneficiaries: ['Alice', 'Bob'],
                    note: 'Settled',
                    date: new Date().toISOString(),
                    isSettled: true
                }
            ];

            const { stats } = calculateFinalBalances(members, bills);

            // Settled expenses should still be counted in totalPaid
            expect(stats['Alice'].totalPaid).toBe(100000);
        });

        it('should handle large amounts correctly', () => {
            const members = ['Alice', 'Bob'];
            const bills: Bill[] = [
                {
                    id: 1,
                    amount: 1000000000, // 1 billion VND
                    payer: 'Alice',
                    type: 'SHARED',
                    beneficiaries: members,
                    note: 'Big expense',
                    date: new Date().toISOString()
                }
            ];

            const { balances } = calculateFinalBalances(members, bills);

            expect(balances['Alice']).toBe(500000000);
            expect(balances['Bob']).toBe(-500000000);
        });
    });
});
