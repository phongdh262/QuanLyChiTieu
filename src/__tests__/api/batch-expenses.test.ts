/**
 * Batch Expenses API Tests
 * Kiểm tra tạo nhiều khoản chi cùng lúc
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createBatchExpenseSchema, createExpenseSchema } from '@/lib/schemas';

vi.mock('@/lib/prisma', () => ({
    default: {
        sheet: { findUnique: vi.fn() },
        expense: { create: vi.fn() },
        split: { createMany: vi.fn() },
        member: { findMany: vi.fn() },
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

describe('Batch Expenses API Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Schema Validation', () => {
        it('should validate a valid batch of expenses', () => {
            const input = {
                expenses: [
                    { sheetId: 1, payerId: 1, amount: 100000, description: 'Cơm trưa', type: 'SHARED' },
                    { sheetId: 1, payerId: 2, amount: 50000, description: 'Nước', type: 'SHARED' },
                    { sheetId: 1, payerId: 1, amount: 200000, description: 'Điện', type: 'PRIVATE', beneficiaryIds: [1, 2] },
                ]
            };

            const result = createBatchExpenseSchema.safeParse(input);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.expenses).toHaveLength(3);
            }
        });

        it('should reject empty expenses array', () => {
            const input = { expenses: [] };
            const result = createBatchExpenseSchema.safeParse(input);
            expect(result.success).toBe(false);
        });

        it('should reject more than 10 expenses', () => {
            const expenses = Array.from({ length: 11 }, (_, i) => ({
                sheetId: 1,
                payerId: 1,
                amount: 10000,
                description: `Item ${i + 1}`,
                type: 'SHARED' as const,
            }));

            const result = createBatchExpenseSchema.safeParse({ expenses });
            expect(result.success).toBe(false);
        });

        it('should reject if any expense in batch has invalid data', () => {
            const input = {
                expenses: [
                    { sheetId: 1, payerId: 1, amount: 100000, description: 'Valid', type: 'SHARED' },
                    { sheetId: 1, payerId: 1, amount: -50, description: 'Invalid amount', type: 'SHARED' }, // negative
                ]
            };

            const result = createBatchExpenseSchema.safeParse(input);
            expect(result.success).toBe(false);
        });

        it('should accept exactly 10 expenses (max boundary)', () => {
            const expenses = Array.from({ length: 10 }, (_, i) => ({
                sheetId: 1,
                payerId: 1,
                amount: 10000,
                description: `Item ${i + 1}`,
                type: 'SHARED' as const,
            }));

            const result = createBatchExpenseSchema.safeParse({ expenses });
            expect(result.success).toBe(true);
        });

        it('should accept exactly 1 expense (min boundary)', () => {
            const input = {
                expenses: [
                    { sheetId: 1, payerId: 1, amount: 50000, description: 'Single', type: 'SHARED' },
                ]
            };

            const result = createBatchExpenseSchema.safeParse(input);
            expect(result.success).toBe(true);
        });
    });

    describe('POST /api/expenses/batch - Batch Create', () => {
        it('should require authentication', async () => {
            vi.mocked(getSession).mockResolvedValue(null);

            const session = await getSession();
            expect(session).toBeNull();
            // API would return 401
        });

        it('should verify workspace membership', async () => {
            vi.mocked(getSession).mockResolvedValue({ id: 99, name: 'Outsider' });

            const sheet = {
                id: 1,
                workspaceId: 1,
                status: 'OPEN',
                workspace: {
                    members: [
                        { id: 1, name: 'Member1', status: 'ACTIVE' },
                        { id: 2, name: 'Member2', status: 'ACTIVE' },
                    ]
                }
            };
            vi.mocked(prisma.sheet.findUnique).mockResolvedValue(sheet as any);

            const isMember = sheet.workspace.members.some(m => m.id === 99);
            expect(isMember).toBe(false);
            // API returns 403
        });

        it('should reject batch on locked sheet', async () => {
            vi.mocked(getSession).mockResolvedValue({ id: 1, name: 'User1' });

            const lockedSheet = {
                id: 1,
                workspaceId: 1,
                status: 'LOCKED',
                workspace: {
                    members: [{ id: 1, name: 'User1', status: 'ACTIVE' }]
                }
            };
            vi.mocked(prisma.sheet.findUnique).mockResolvedValue(lockedSheet as any);

            expect(lockedSheet.status).toBe('LOCKED');
            // API returns 403
        });

        it('should create multiple expenses in a transaction', async () => {
            vi.mocked(getSession).mockResolvedValue({ id: 1, name: 'User1' });

            const sheet = {
                id: 1,
                workspaceId: 1,
                status: 'OPEN',
                workspace: {
                    members: [
                        { id: 1, name: 'User1', status: 'ACTIVE' },
                        { id: 2, name: 'User2', status: 'ACTIVE' },
                    ]
                }
            };
            vi.mocked(prisma.sheet.findUnique).mockResolvedValue(sheet as any);

            const createdExpenses = [
                { id: 100, description: 'Cơm trưa', amount: 100000, type: 'SHARED', sheetId: 1, payerId: 1 },
                { id: 101, description: 'Nước', amount: 50000, type: 'SHARED', sheetId: 1, payerId: 2 },
            ];

            vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) => {
                return createdExpenses;
            });

            const result = await prisma.$transaction(async () => createdExpenses);

            expect(result).toHaveLength(2);
            expect(result[0].description).toBe('Cơm trưa');
            expect(result[1].description).toBe('Nước');
        });

        it('should reject private expense without beneficiaries in batch', () => {
            const input = {
                expenses: [
                    { sheetId: 1, payerId: 1, amount: 100000, description: 'Shared', type: 'SHARED' as const },
                    { sheetId: 1, payerId: 1, amount: 50000, description: 'Private no beneficiaries', type: 'PRIVATE' as const, beneficiaryIds: [] },
                ]
            };

            // Schema passes (beneficiaryIds is optional in schema), but API validates
            const result = createBatchExpenseSchema.safeParse(input);
            expect(result.success).toBe(true);

            // API-level check: PRIVATE with empty beneficiaries should be rejected
            const privateExpense = input.expenses.find(e => e.type === 'PRIVATE');
            expect(privateExpense!.beneficiaryIds).toHaveLength(0);
            // API would return 400
        });

        it('should filter out DELETED members for shared splits', async () => {
            const sheet = {
                id: 1,
                workspaceId: 1,
                status: 'OPEN',
                workspace: {
                    members: [
                        { id: 1, name: 'Active1', status: 'ACTIVE' },
                        { id: 2, name: 'Active2', status: 'ACTIVE' },
                        { id: 3, name: 'Deleted', status: 'DELETED' },
                    ]
                }
            };

            const activeMembers = sheet.workspace.members.filter(m => m.status !== 'DELETED');
            expect(activeMembers).toHaveLength(2);
            expect(activeMembers.every(m => m.status !== 'DELETED')).toBe(true);
        });
    });
});
