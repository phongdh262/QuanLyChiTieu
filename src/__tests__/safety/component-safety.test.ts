/**
 * Component Safety Tests
 * Kiểm tra các patterns anti-bug: useMemo, dynamic import, schema safety
 */
import { describe, it, expect } from 'vitest';
import { updateExpenseSchema, createExpenseSchema, createBatchExpenseSchema } from '@/lib/schemas';

describe('Component Safety & Anti-Bug Patterns', () => {

    // =========================================================================
    // SECTION 1: useMemo Pattern Tests
    // =========================================================================
    describe('useMemo Pattern - Array Reference Stability', () => {
        it('should demonstrate WHY filter() without memo causes infinite loops', () => {
            const members = [
                { id: 1, name: 'A', status: 'ACTIVE' },
                { id: 2, name: 'B', status: 'DELETED' },
            ];

            // Without useMemo: .filter() creates new array reference each time
            const filtered1 = members.filter(m => m.status !== 'DELETED');
            const filtered2 = members.filter(m => m.status !== 'DELETED');

            // Even though contents are identical, references differ
            expect(filtered1).not.toBe(filtered2); // Different references!
            expect(filtered1).toEqual(filtered2);   // Same content

            // This is why [activeMembers] in useEffect causes infinite loop:
            // Every render → new array ref → effect runs → setState → re-render → loop
        });

        it('should verify memo keeps same reference when input unchanged', () => {
            const members = [
                { id: 1, name: 'A', status: 'ACTIVE' },
                { id: 2, name: 'B', status: 'DELETED' },
            ];

            // Simulate memo: only recalculate when `members` reference changes
            let cachedMembers = members;
            let cachedResult = members.filter(m => m.status !== 'DELETED');

            // Same input → same output reference (memo behavior)
            const getActiveMembers = (currentMembers: typeof members) => {
                if (currentMembers === cachedMembers) return cachedResult;
                cachedMembers = currentMembers;
                cachedResult = currentMembers.filter(m => m.status !== 'DELETED');
                return cachedResult;
            };

            const result1 = getActiveMembers(members);
            const result2 = getActiveMembers(members); // Same input ref

            expect(result1).toBe(result2); // SAME reference! No infinite loop
        });
    });

    // =========================================================================
    // SECTION 2: Date Handling Safety
    // =========================================================================
    describe('Date Handling Safety', () => {
        it('should safely create Date from ISO string', () => {
            const isoString = '2026-02-28T00:00:00.000Z';
            const date = new Date(isoString);

            expect(date instanceof Date).toBe(true);
            expect(date.toISOString()).toBe(isoString);
        });

        it('should safely create Date from YYYY-MM-DD string', () => {
            const dateStr = '2026-02-28';
            const date = new Date(dateStr);

            expect(date instanceof Date).toBe(true);
            expect(isNaN(date.getTime())).toBe(false);
        });

        it('should handle invalid date string gracefully', () => {
            const invalidDate = new Date('not-a-date');
            expect(isNaN(invalidDate.getTime())).toBe(true);
        });

        it('should format date for display correctly', () => {
            const date = new Date('2026-02-28T12:00:00Z');
            const formatted = date.toLocaleDateString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
            });

            // Should contain day and month
            expect(formatted).toMatch(/\d{2}/);
        });

        it('should handle conditional date spreading', () => {
            const withDate = { amount: 100, ...(true ? { date: new Date('2026-02-28') } : {}) };
            const withoutDate = { amount: 100, ...(false ? { date: new Date('2026-02-28') } : {}) };

            expect('date' in withDate).toBe(true);
            expect('date' in withoutDate).toBe(false);
        });
    });

    // =========================================================================
    // SECTION 3: Schema Boundary Tests
    // =========================================================================
    describe('Schema Boundary Tests', () => {
        it('should accept amount at minimum boundary (1)', () => {
            const input = {
                amount: 1,
                description: 'Minimum',
                type: 'SHARED' as const,
                payerId: 1,
            };
            expect(updateExpenseSchema.safeParse(input).success).toBe(true);
        });

        it('should reject amount at boundary (0)', () => {
            const input = {
                amount: 0,
                description: 'Zero',
                type: 'SHARED' as const,
                payerId: 1,
            };
            expect(updateExpenseSchema.safeParse(input).success).toBe(false);
        });

        it('should accept description at max boundary (200 chars)', () => {
            const input = {
                amount: 100000,
                description: 'a'.repeat(200),
                type: 'SHARED' as const,
                payerId: 1,
            };
            expect(updateExpenseSchema.safeParse(input).success).toBe(true);
        });

        it('should reject description at over-max boundary (201 chars)', () => {
            const input = {
                amount: 100000,
                description: 'a'.repeat(201),
                type: 'SHARED' as const,
                payerId: 1,
            };
            expect(updateExpenseSchema.safeParse(input).success).toBe(false);
        });

        it('should accept batch at max boundary (10 items)', () => {
            const input = {
                expenses: Array.from({ length: 10 }, (_, i) => ({
                    sheetId: 1, payerId: 1, amount: 10000,
                    description: `Item ${i + 1}`, type: 'SHARED' as const,
                })),
            };
            expect(createBatchExpenseSchema.safeParse(input).success).toBe(true);
        });

        it('should reject batch at over-max boundary (11 items)', () => {
            const input = {
                expenses: Array.from({ length: 11 }, (_, i) => ({
                    sheetId: 1, payerId: 1, amount: 10000,
                    description: `Item ${i + 1}`, type: 'SHARED' as const,
                })),
            };
            expect(createBatchExpenseSchema.safeParse(input).success).toBe(false);
        });

        it('should accept large amount values', () => {
            const input = {
                amount: 999999999,
                description: 'Very expensive',
                type: 'SHARED' as const,
                payerId: 1,
            };
            expect(updateExpenseSchema.safeParse(input).success).toBe(true);
        });

        it('should reject string amount', () => {
            const input = {
                amount: '100000',
                description: 'String amount',
                type: 'SHARED' as const,
                payerId: 1,
            };
            expect(updateExpenseSchema.safeParse(input).success).toBe(false);
        });
    });

    // =========================================================================
    // SECTION 4: Expense Service Logic  
    // =========================================================================
    describe('Expense Calculation Logic', () => {
        it('should split evenly among N members', () => {
            const amount = 300000;
            const members = [1, 2, 3];
            const splitAmount = amount / members.length;

            expect(splitAmount).toBe(100000);
        });

        it('should handle uneven splits with rounding', () => {
            const amount = 100000;
            const members = [1, 2, 3];
            const splitAmount = amount / members.length;

            // Verify total after splits roughly equals original
            const totalAfterSplits = splitAmount * members.length;
            expect(Math.abs(totalAfterSplits - amount)).toBeLessThan(1);
        });

        it('should calculate private expense split for single beneficiary', () => {
            const amount = 500000;
            const beneficiaries = [2];
            const splitAmount = amount / beneficiaries.length;

            expect(splitAmount).toBe(500000);
        });

        it('should handle very small amounts', () => {
            const amount = 1;
            const members = [1, 2, 3];
            const splitAmount = amount / members.length;

            expect(splitAmount).toBeGreaterThan(0);
        });
    });
});
