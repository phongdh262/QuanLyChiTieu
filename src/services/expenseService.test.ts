import { describe, it, expect } from 'vitest';
import { calculateFinalBalances, calculateDebts, calculatePrivateMatrix } from './expenseService';
import { Bill } from '../types/expense';

describe('Expense Calculator', () => {
    const members = ['A', 'B', 'C'];

    it('Scenario 1: Shared Bill (A pays 90k for A, B, C)', () => {
        const bills: Bill[] = [{
            id: 1,
            payer: 'A',
            amount: 90000,
            type: 'SHARED',
            beneficiaries: ['A', 'B', 'C'],
            note: 'Dinner',
            date: new Date()
        }];

        const { balances } = calculateFinalBalances(members, bills);
        const debts = calculateDebts(balances);

        // A paid 90k. Consumed 30k. Should be +60k.
        // B paid 0. Consumed 30k. Should be -30k.
        // C paid 0. Consumed 30k. Should be -30k.
        expect(balances['A']).toBe(60000);
        expect(balances['B']).toBe(-30000);
        expect(balances['C']).toBe(-30000);

        // Debts: B -> A 30k, C -> A 30k
        expect(debts).toHaveLength(2);
        expect(debts).toContainEqual({ from: 'B', to: 'A', amount: 30000 });
        expect(debts).toContainEqual({ from: 'C', to: 'A', amount: 30000 });
    });

    it('Scenario 2: Private Bill (A pays 100k for B)', () => {
        const bills: Bill[] = [{
            id: 2,
            payer: 'A',
            amount: 100000,
            type: 'PRIVATE',
            beneficiaries: ['B'],
            note: 'Gift',
            date: new Date()
        }];

        const { balances } = calculateFinalBalances(members, bills);
        const debts = calculateDebts(balances);

        // A paid 100k. Consumed 0. Bal +100k.
        // B Consumed 100k. Bal -100k.
        expect(balances['A']).toBe(100000);
        expect(balances['B']).toBe(-100000);
        expect(balances['C']).toBe(0);

        expect(debts).toContainEqual({ from: 'B', to: 'A', amount: 100000 });
    });

    it('Scenario 3: Mixed (A pays 60k Shared, B pays 40k for C)', () => {
        // Shared: 60k / 3 = 20k each.
        // A: +40, B: -20, C: -20
        // Private: B pays 40k for C.
        // B: +40, C: -40
        // Net:
        // A: +40
        // B: -20 + 40 = +20
        // C: -20 - 40 = -60

        const bills: Bill[] = [
            {
                id: 1,
                payer: 'A',
                amount: 60000,
                type: 'SHARED',
                beneficiaries: ['A', 'B', 'C'],
                note: 'Shared',
                date: new Date()
            },
            {
                id: 2,
                payer: 'B',
                amount: 40000,
                type: 'PRIVATE',
                beneficiaries: ['C'],
                note: 'Private',
                date: new Date()
            }
        ];

        const { balances } = calculateFinalBalances(members, bills);
        const debts = calculateDebts(balances);

        expect(balances['A']).toBe(40000);
        expect(balances['B']).toBe(20000);
        expect(balances['C']).toBe(-60000);

        // C owes 60k total. Needs to pay A (40k) and B (20k).
        // The algorithm sorts debtors/creditors.
        // Debtors: C (-60k). Creditors: A (40k), B (20k).
        // 1. C -> A 40k. Remaining C: -20k.
        // 2. C -> B 20k. Remaining C: 0.
        expect(debts).toEqual(expect.arrayContaining([
            { from: 'C', to: 'A', amount: 40000 },
            { from: 'C', to: 'B', amount: 20000 }
        ]));
    });

    it('Scenario 4: Rounding (100k / 3)', () => {
        const bills: Bill[] = [{
            id: 1,
            payer: 'A',
            amount: 100000,
            type: 'SHARED',
            beneficiaries: ['A', 'B', 'C'],
            note: 'Rounding',
            date: new Date()
        }];

        const { balances } = calculateFinalBalances(members, bills);

        // 100000 / 3 = 33333.333
        // A: 100000 - 33333.33 = +66666.66 -> 66667
        // B: -33333.33 -> -33333
        // C: -33333.33 -> -33333
        // Sum: 66667 - 33333 - 33333 = 1 (Off by 1 due to round, acceptable typical splitwise logic)
        // Let's see how our Math.round helper handles it.
        // A: 66667
        // B: -33333
        // C: -33333

        expect(balances['A']).toBeCloseTo(66667, -1); // Allow +/- 10
        expect(balances['B']).toBeCloseTo(-33333, -1);
    });

    it('Scenario 5: Debt matching stays stable with floating balances', () => {
        const balances = {
            A: 100.4,
            B: -40.2,
            C: -60.2
        };

        const debts = calculateDebts(balances);

        expect(debts).toEqual([
            { from: 'C', to: 'A', amount: 60 },
            { from: 'B', to: 'A', amount: 40 }
        ]);
    });

    it('Scenario 6: Private matrix uses split.amount and ignores payer self-split', () => {
        const bills: Bill[] = [{
            id: 6,
            payer: 'A',
            amount: 90000,
            type: 'PRIVATE',
            beneficiaries: ['A', 'B', 'C'],
            note: 'Mixed private split',
            date: new Date(),
            splits: [
                { member: { name: 'A' }, isPaid: false, amount: 10000 },
                { member: { name: 'B' }, isPaid: false, amount: 30000 },
                { member: { name: 'C' }, isPaid: true, amount: 50000 }
            ]
        }];

        const { matrix, totals } = calculatePrivateMatrix(members, bills);

        expect(matrix['A']['A']).toBe(0);
        expect(matrix['A']['B']).toBe(30000);
        expect(matrix['A']['C']).toBe(0);
        expect(totals['A']).toBe(30000);
    });
});
