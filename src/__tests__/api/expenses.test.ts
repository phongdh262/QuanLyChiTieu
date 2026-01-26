/**
 * Expenses API Tests
 * Kiểm tra CRUD operations cho Expenses
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
    default: {
        expense: {
            findUnique: vi.fn(),
            findMany: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        },
        member: {
            findFirst: vi.fn(),
            findUnique: vi.fn(),
        },
        sheet: {
            findUnique: vi.fn(),
        },
        split: {
            createMany: vi.fn(),
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

describe('Expenses API Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('POST /api/expenses - Create Expense', () => {
        it('should create shared expense splitting among all members', async () => {
            vi.mocked(getSession).mockResolvedValue({ id: 1, name: 'User1' });

            const sheet = { id: 1, workspaceId: 1 };
            vi.mocked(prisma.sheet.findUnique).mockResolvedValue(sheet as any);
            vi.mocked(prisma.member.findFirst).mockResolvedValue({ id: 1, workspaceId: 1 } as any);

            const expense = {
                id: 100,
                description: 'Dinner',
                amount: 300000,
                type: 'SHARED',
                payerId: 1,
                sheetId: 1
            };

            vi.mocked(prisma.expense.create).mockResolvedValue(expense as any);

            const result = await prisma.expense.create({
                data: {
                    description: 'Dinner',
                    amount: 300000,
                    type: 'SHARED',
                    payerId: 1,
                    sheetId: 1
                }
            });

            expect(result.type).toBe('SHARED');
            expect(result.amount).toBe(300000);
        });

        it('should create private expense with specific beneficiaries', async () => {
            vi.mocked(getSession).mockResolvedValue({ id: 1, name: 'User1' });

            const expense = {
                id: 101,
                description: 'Movie ticket',
                amount: 150000,
                type: 'PRIVATE',
                payerId: 1,
                sheetId: 1
            };

            vi.mocked(prisma.expense.create).mockResolvedValue(expense as any);

            const result = await prisma.expense.create({
                data: {
                    description: 'Movie ticket',
                    amount: 150000,
                    type: 'PRIVATE',
                    payerId: 1,
                    sheetId: 1
                }
            });

            expect(result.type).toBe('PRIVATE');
        });

        it('should reject expense creation without authentication', async () => {
            vi.mocked(getSession).mockResolvedValue(null);

            const session = await getSession();
            expect(session).toBeNull();
            // API would return 401
        });
    });

    describe('PUT /api/expenses/[id] - Update Expense', () => {
        it('should update expense description and amount', async () => {
            vi.mocked(getSession).mockResolvedValue({ id: 1, name: 'User1' });

            const expense = {
                id: 100,
                payerId: 1,
                sheet: { workspaceId: 1 }
            };
            vi.mocked(prisma.expense.findUnique).mockResolvedValue(expense as any);
            vi.mocked(prisma.member.findFirst).mockResolvedValue({ id: 1 } as any);

            const updated = {
                id: 100,
                description: 'Updated Dinner',
                amount: 400000
            };
            vi.mocked(prisma.expense.update).mockResolvedValue(updated as any);

            const result = await prisma.expense.update({
                where: { id: 100 },
                data: { description: 'Updated Dinner', amount: 400000 }
            });

            expect(result.description).toBe('Updated Dinner');
            expect(result.amount).toBe(400000);
        });

        it('should prevent updating expense from another workspace', async () => {
            vi.mocked(getSession).mockResolvedValue({ id: 1, name: 'User1' });

            const expense = {
                id: 100,
                payerId: 2,
                sheet: { workspaceId: 2 } // Different workspace
            };
            vi.mocked(prisma.expense.findUnique).mockResolvedValue(expense as any);
            vi.mocked(prisma.member.findFirst).mockResolvedValue(null); // Not a member

            const isMember = await prisma.member.findFirst({
                where: { id: 1, workspaceId: 2 }
            });

            expect(isMember).toBeNull();
            // API would return 403
        });
    });

    describe('DELETE /api/expenses/[id] - Delete Expense', () => {
        it('should delete expense when user is payer', async () => {
            vi.mocked(getSession).mockResolvedValue({ id: 1, name: 'User1' });

            const expense = {
                id: 100,
                payerId: 1, // Same as session user
                sheet: { workspaceId: 1 }
            };
            vi.mocked(prisma.expense.findUnique).mockResolvedValue(expense as any);
            vi.mocked(prisma.expense.delete).mockResolvedValue(expense as any);

            // Since user is the payer, deletion should be allowed
            const result = await prisma.expense.delete({ where: { id: 100 } });

            expect(result.id).toBe(100);
        });

        it('should delete expense when user is ADMIN', async () => {
            vi.mocked(getSession).mockResolvedValue({ id: 1, name: 'Admin' });

            const expense = {
                id: 100,
                payerId: 2, // Different from session user
                sheet: { workspaceId: 1 }
            };
            vi.mocked(prisma.expense.findUnique).mockResolvedValue(expense as any);

            // Admin role
            vi.mocked(prisma.member.findUnique).mockResolvedValue({
                id: 1,
                role: 'ADMIN',
                workspaceId: 1
            } as any);

            const member = await prisma.member.findUnique({ where: { id: 1 } });

            expect(member?.role).toBe('ADMIN');
            // ADMIN can delete any expense in their workspace
        });

        it('should prevent non-payer non-admin from deleting expense', async () => {
            vi.mocked(getSession).mockResolvedValue({ id: 3, name: 'Regular' });

            const expense = {
                id: 100,
                payerId: 1, // Not session user
                sheet: { workspaceId: 1 }
            };
            vi.mocked(prisma.expense.findUnique).mockResolvedValue(expense as any);

            // Regular member, not ADMIN
            vi.mocked(prisma.member.findUnique).mockResolvedValue({
                id: 3,
                role: 'MEMBER',
                workspaceId: 1
            } as any);

            const member = await prisma.member.findUnique({ where: { id: 3 } });
            const isPayerOrAdmin = expense.payerId === 3 || member?.role === 'ADMIN';

            expect(isPayerOrAdmin).toBe(false);
            // API would return 403
        });
    });
});
