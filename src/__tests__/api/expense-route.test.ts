import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DELETE, PUT } from '@/app/api/expenses/[id]/route';

vi.mock('@/lib/prisma', () => ({
    default: {
        expense: {
            findUnique: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        },
        member: {
            findFirst: vi.fn(),
            findMany: vi.fn(),
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
import { logActivity } from '@/lib/logger';

const asMock = <T,>(value: T) => value as never;
type TransactionRunner = (tx: typeof prisma) => Promise<unknown>;

const makeParams = (id = '100') => ({
    params: Promise.resolve({ id }),
});

const makePutRequest = (body: Record<string, unknown>) => new Request('http://localhost/api/expenses/100', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
});

const makeDeleteRequest = () => new Request('http://localhost/api/expenses/100', {
    method: 'DELETE',
});

describe('Expense Route Authorization Tests', () => {
    const baseExpense = {
        id: 100,
        payerId: 1,
        amount: 200000,
        description: 'Dinner',
        type: 'SHARED',
        sheetId: 55,
        sheet: {
            workspaceId: 7,
            status: 'OPEN',
        }
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(prisma.$transaction).mockImplementation(async (input: unknown) => {
            if (typeof input === 'function') {
                return (input as TransactionRunner)(prisma);
            }
            return Promise.all(input as Promise<unknown>[]);
        });
    });

    describe('PUT /api/expenses/[id]', () => {
        it('should reject updates from a non-payer workspace member', async () => {
            vi.mocked(getSession).mockResolvedValue(asMock({ id: 2, name: 'Khôi' }));
            vi.mocked(prisma.expense.findUnique).mockResolvedValue(asMock(baseExpense));
            vi.mocked(prisma.member.findFirst).mockResolvedValue(asMock({ id: 2, workspaceId: 7 }));

            const res = await PUT(makePutRequest({
                amount: 300000,
                description: 'Updated Dinner',
                type: 'SHARED',
                payerId: 1,
            }), makeParams());

            expect(res.status).toBe(403);
            await expect(res.json()).resolves.toEqual({
                error: 'Forbidden: Only the payer can edit this expense'
            });
            expect(prisma.expense.update).not.toHaveBeenCalled();
        });

        it('should reject updates when the sheet is locked', async () => {
            vi.mocked(getSession).mockResolvedValue(asMock({ id: 1, name: 'Phong' }));
            vi.mocked(prisma.expense.findUnique).mockResolvedValue({
                ...baseExpense,
                sheet: { ...baseExpense.sheet, status: 'LOCKED' }
            } as never);

            const res = await PUT(makePutRequest({
                amount: 300000,
                description: 'Updated Dinner',
                type: 'SHARED',
                payerId: 1,
            }), makeParams());

            expect(res.status).toBe(403);
            await expect(res.json()).resolves.toEqual({
                error: 'Sheet đã bị khóa, không thể chỉnh sửa khoản chi'
            });
        });

        it('should allow the payer to update and recalculate splits', async () => {
            vi.mocked(getSession).mockResolvedValue(asMock({ id: 1, name: 'Phong' }));
            vi.mocked(prisma.expense.findUnique).mockResolvedValue(asMock(baseExpense));
            vi.mocked(prisma.member.findFirst).mockResolvedValue(asMock({ id: 1, workspaceId: 7 }));
            vi.mocked(prisma.member.findMany).mockResolvedValue(asMock([{ id: 1 }, { id: 2 }, { id: 3 }]));
            vi.mocked(prisma.expense.update).mockResolvedValue(asMock({ ...baseExpense, amount: 300000 }));
            vi.mocked(prisma.split.deleteMany).mockResolvedValue(asMock({ count: 3 }));
            vi.mocked(prisma.split.createMany).mockResolvedValue(asMock({ count: 3 }));

            const res = await PUT(makePutRequest({
                amount: 300000,
                description: 'Updated Dinner',
                type: 'SHARED',
                payerId: 1,
                date: '2026-03-30',
            }), makeParams());

            expect(res.status).toBe(200);
            await expect(res.json()).resolves.toEqual({ success: true });
            expect(prisma.expense.update).toHaveBeenCalledWith({
                where: { id: 100 },
                data: {
                    amount: 300000,
                    description: 'Updated Dinner',
                    type: 'SHARED',
                    payerId: 1,
                    date: new Date('2026-03-30')
                }
            });
            expect(prisma.split.createMany).toHaveBeenCalledWith({
                data: [
                    { expenseId: 100, memberId: 1, amount: 100000 },
                    { expenseId: 100, memberId: 2, amount: 100000 },
                    { expenseId: 100, memberId: 3, amount: 100000 },
                ]
            });
            expect(logActivity).toHaveBeenCalled();
        });
    });

    describe('DELETE /api/expenses/[id]', () => {
        it('should reject delete when actor is not the payer', async () => {
            vi.mocked(getSession).mockResolvedValue(asMock({ id: 2, name: 'Khôi' }));
            vi.mocked(prisma.expense.findUnique).mockResolvedValue(asMock(baseExpense));
            vi.mocked(prisma.member.findFirst).mockResolvedValue(asMock({ id: 2, workspaceId: 7 }));

            const res = await DELETE(makeDeleteRequest(), makeParams());

            expect(res.status).toBe(403);
            await expect(res.json()).resolves.toEqual({
                error: 'Forbidden: Only the payer can delete this expense'
            });
            expect(prisma.expense.delete).not.toHaveBeenCalled();
        });

        it('should allow the payer to delete the expense', async () => {
            vi.mocked(getSession).mockResolvedValue(asMock({ id: 1, name: 'Phong' }));
            vi.mocked(prisma.expense.findUnique).mockResolvedValue(asMock(baseExpense));
            vi.mocked(prisma.member.findFirst).mockResolvedValue(asMock({ id: 1, workspaceId: 7 }));
            vi.mocked(prisma.split.deleteMany).mockResolvedValue(asMock({ count: 3 }));
            vi.mocked(prisma.expense.delete).mockResolvedValue(asMock(baseExpense));

            const res = await DELETE(makeDeleteRequest(), makeParams());

            expect(res.status).toBe(200);
            await expect(res.json()).resolves.toEqual({ success: true });
            expect(prisma.split.deleteMany).toHaveBeenCalledWith({
                where: { expenseId: 100 }
            });
            expect(prisma.expense.delete).toHaveBeenCalledWith({
                where: { id: 100 }
            });
            expect(logActivity).toHaveBeenCalled();
        });
    });
});
