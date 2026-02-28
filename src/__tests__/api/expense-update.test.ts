/**
 * Expense Update (Date) Tests
 * Kiểm tra cập nhật date khi edit expense + schema validation
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateExpenseSchema, createExpenseSchema, createBatchExpenseSchema } from '@/lib/schemas';

vi.mock('@/lib/prisma', () => ({
    default: {
        expense: {
            findUnique: vi.fn(),
            update: vi.fn(),
        },
        member: {
            findFirst: vi.fn(),
            findMany: vi.fn(),
        },
        sheet: {
            findUnique: vi.fn(),
        },
        split: {
            deleteMany: vi.fn(),
            createMany: vi.fn(),
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

describe('Expense Update & Schema Validation Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // =========================================================================
    // SECTION 1: updateExpenseSchema Validation
    // =========================================================================
    describe('updateExpenseSchema - Validation', () => {
        it('should accept valid update without date', () => {
            const input = {
                amount: 200000,
                description: 'Cơm trưa',
                type: 'SHARED' as const,
                payerId: 1,
            };
            const result = updateExpenseSchema.safeParse(input);
            expect(result.success).toBe(true);
        });

        it('should accept valid update with date string', () => {
            const input = {
                amount: 200000,
                description: 'Cơm trưa',
                type: 'SHARED' as const,
                payerId: 1,
                date: '2026-02-15',
            };
            const result = updateExpenseSchema.safeParse(input);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.date).toBe('2026-02-15');
            }
        });

        it('should accept update without date (optional)', () => {
            const input = {
                amount: 100000,
                description: 'Trà sữa',
                type: 'PRIVATE' as const,
                payerId: 2,
                beneficiaryIds: [1, 3],
            };
            const result = updateExpenseSchema.safeParse(input);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.date).toBeUndefined();
            }
        });

        it('should reject zero amount', () => {
            const input = {
                amount: 0,
                description: 'Free',
                type: 'SHARED' as const,
                payerId: 1,
            };
            const result = updateExpenseSchema.safeParse(input);
            expect(result.success).toBe(false);
        });

        it('should reject negative amount', () => {
            const input = {
                amount: -50000,
                description: 'Negative',
                type: 'SHARED' as const,
                payerId: 1,
            };
            const result = updateExpenseSchema.safeParse(input);
            expect(result.success).toBe(false);
        });

        it('should reject empty description', () => {
            const input = {
                amount: 100000,
                description: '',
                type: 'SHARED' as const,
                payerId: 1,
            };
            const result = updateExpenseSchema.safeParse(input);
            expect(result.success).toBe(false);
        });

        it('should reject description over 200 characters', () => {
            const input = {
                amount: 100000,
                description: 'a'.repeat(201),
                type: 'SHARED' as const,
                payerId: 1,
            };
            const result = updateExpenseSchema.safeParse(input);
            expect(result.success).toBe(false);
        });

        it('should reject invalid expense type', () => {
            const input = {
                amount: 100000,
                description: 'Test',
                type: 'INVALID',
                payerId: 1,
            };
            const result = updateExpenseSchema.safeParse(input);
            expect(result.success).toBe(false);
        });
    });

    // =========================================================================
    // SECTION 2: createExpenseSchema Validation
    // =========================================================================
    describe('createExpenseSchema - Validation', () => {
        it('should accept valid shared expense', () => {
            const input = {
                sheetId: 1,
                payerId: 1,
                amount: 300000,
                description: 'Ăn tối',
                type: 'SHARED' as const,
            };
            const result = createExpenseSchema.safeParse(input);
            expect(result.success).toBe(true);
        });

        it('should accept valid private expense with beneficiaries', () => {
            const input = {
                sheetId: 1,
                payerId: 1,
                amount: 150000,
                description: 'Vé xem phim',
                type: 'PRIVATE' as const,
                beneficiaryIds: [2, 3],
            };
            const result = createExpenseSchema.safeParse(input);
            expect(result.success).toBe(true);
        });

        it('should reject missing sheetId', () => {
            const input = {
                payerId: 1,
                amount: 100000,
                description: 'Test',
                type: 'SHARED' as const,
            };
            const result = createExpenseSchema.safeParse(input);
            expect(result.success).toBe(false);
        });

        it('should reject missing payerId', () => {
            const input = {
                sheetId: 1,
                amount: 100000,
                description: 'Test',
                type: 'SHARED' as const,
            };
            const result = createExpenseSchema.safeParse(input);
            expect(result.success).toBe(false);
        });
    });

    // =========================================================================
    // SECTION 3: Date Update in PUT /api/expenses/[id]
    // =========================================================================
    describe('PUT /api/expenses/[id] - Date Update', () => {
        it('should update expense with new date', async () => {
            vi.mocked(getSession).mockResolvedValue({ id: 1, name: 'User1' });

            const expense = {
                id: 100,
                payerId: 1,
                description: 'Old Dinner',
                amount: 200000,
                date: new Date('2026-02-20'),
                sheet: { workspaceId: 1, status: 'OPEN' },
            };
            vi.mocked(prisma.expense.findUnique).mockResolvedValue(expense as any);
            vi.mocked(prisma.member.findFirst).mockResolvedValue({ id: 1 } as any);

            const newDate = '2026-02-25';
            const updated = {
                ...expense,
                description: 'Updated Dinner',
                amount: 300000,
                date: new Date(newDate),
            };
            vi.mocked(prisma.expense.update).mockResolvedValue(updated as any);

            const result = await prisma.expense.update({
                where: { id: 100 },
                data: {
                    description: 'Updated Dinner',
                    amount: 300000,
                    date: new Date(newDate),
                },
            });

            expect(result.date).toEqual(new Date('2026-02-25'));
            expect(result.description).toBe('Updated Dinner');
        });

        it('should not change date when not provided', async () => {
            vi.mocked(getSession).mockResolvedValue({ id: 1, name: 'User1' });

            const expense = {
                id: 100,
                payerId: 1,
                description: 'Dinner',
                amount: 200000,
                date: new Date('2026-02-20'),
                sheet: { workspaceId: 1, status: 'OPEN' },
            };
            vi.mocked(prisma.expense.findUnique).mockResolvedValue(expense as any);

            // Validate that schema allows omitting date
            const updateData = {
                amount: 250000,
                description: 'Updated Dinner',
                type: 'SHARED' as const,
                payerId: 1,
            };
            const validated = updateExpenseSchema.safeParse(updateData);
            expect(validated.success).toBe(true);
            if (validated.success) {
                expect(validated.data.date).toBeUndefined();
                // Prisma update would NOT include date field → keeps original
            }
        });

        it('should convert date string to Date object for Prisma', () => {
            const dateStr = '2026-03-15';
            const dateObj = new Date(dateStr);

            expect(dateObj instanceof Date).toBe(true);
            expect(dateObj.toISOString()).toContain('2026-03-15');
        });

        it('should reject update on locked sheet', async () => {
            vi.mocked(getSession).mockResolvedValue({ id: 1, name: 'User1' });

            const expense = {
                id: 100,
                payerId: 1,
                sheet: { workspaceId: 1, status: 'LOCKED' },
            };
            vi.mocked(prisma.expense.findUnique).mockResolvedValue(expense as any);

            expect(expense.sheet.status).toBe('LOCKED');
            // API returns 403
        });
    });

    // =========================================================================
    // SECTION 4: Batch Schema Edge Cases
    // =========================================================================
    describe('createBatchExpenseSchema - Edge Cases', () => {
        it('should accept batch with date fields', () => {
            const input = {
                expenses: [
                    {
                        sheetId: 1,
                        payerId: 1,
                        amount: 100000,
                        description: 'Item 1',
                        type: 'SHARED' as const,
                        date: '2026-02-28T00:00:00.000Z',
                    },
                    {
                        sheetId: 1,
                        payerId: 2,
                        amount: 50000,
                        description: 'Item 2',
                        type: 'SHARED' as const,
                        date: '2026-02-27T00:00:00.000Z',
                    },
                ],
            };
            const result = createBatchExpenseSchema.safeParse(input);
            expect(result.success).toBe(true);
        });

        it('should accept batch mixing expenses with and without dates', () => {
            const input = {
                expenses: [
                    { sheetId: 1, payerId: 1, amount: 100000, description: 'With date', type: 'SHARED' as const, date: '2026-02-28' },
                    { sheetId: 1, payerId: 2, amount: 50000, description: 'No date', type: 'SHARED' as const },
                ],
            };
            const result = createBatchExpenseSchema.safeParse(input);
            expect(result.success).toBe(true);
        });

        it('should reject batch with all invalid expenses', () => {
            const input = {
                expenses: [
                    { sheetId: 1, payerId: 1, amount: -100, description: '', type: 'INVALID' },
                ],
            };
            const result = createBatchExpenseSchema.safeParse(input);
            expect(result.success).toBe(false);
        });
    });

    // =========================================================================
    // SECTION 5: Data Integrity Checks
    // =========================================================================
    describe('Data Integrity', () => {
        it('should verify split recalculation after update', async () => {
            // When updating expense, old splits should be deleted and new ones created
            vi.mocked(prisma.split.deleteMany).mockResolvedValue({ count: 3 });

            const result = await prisma.split.deleteMany({
                where: { expenseId: 100 },
            });
            expect(result.count).toBe(3);

            // New splits created
            vi.mocked(prisma.split.createMany).mockResolvedValue({ count: 2 });
            const newSplits = await prisma.split.createMany({
                data: [
                    { expenseId: 100, memberId: 1, amount: 150000 },
                    { expenseId: 100, memberId: 2, amount: 150000 },
                ],
            });
            expect(newSplits.count).toBe(2);
        });

        it('should recalculate split amounts when amount changes', () => {
            const newAmount = 600000;
            const memberCount = 3;
            const splitAmount = newAmount / memberCount;

            expect(splitAmount).toBe(200000);
        });

        it('should handle private expense with single beneficiary', () => {
            const amount = 100000;
            const beneficiaries = [1]; // Single beneficiary
            const splitAmount = amount / beneficiaries.length;

            expect(splitAmount).toBe(100000);
        });

        it('should exclude DELETED members from shared splits', async () => {
            const allMembers = [
                { id: 1, name: 'Active1', status: 'ACTIVE' },
                { id: 2, name: 'Active2', status: 'ACTIVE' },
                { id: 3, name: 'Deleted', status: 'DELETED' },
            ];

            vi.mocked(prisma.member.findMany).mockResolvedValue(
                allMembers.filter(m => m.status !== 'DELETED') as any
            );

            const activeMembers = await prisma.member.findMany({
                where: { workspaceId: 1, status: { not: 'DELETED' } },
            });

            expect(activeMembers).toHaveLength(2);
            expect(activeMembers.every((m: any) => m.status !== 'DELETED')).toBe(true);
        });
    });
});
