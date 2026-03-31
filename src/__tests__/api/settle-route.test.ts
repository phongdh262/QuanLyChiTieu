import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/expenses/[id]/settle/route';

vi.mock('@/lib/prisma', () => ({
    default: {
        expense: {
            findUnique: vi.fn(),
            update: vi.fn(),
        },
        member: {
            findFirst: vi.fn(),
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

const asMock = <T,>(value: T) => value as never;

const makeParams = (id = '100') => ({
    params: Promise.resolve({ id }),
});

const makeRequest = (body: Record<string, unknown>) => new Request('http://localhost/api/expenses/100/settle', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
});

describe('Settle Route Tests', () => {
    const baseExpense = {
        id: 100,
        payerId: 1,
        description: 'Dinner',
        isSettled: false,
        payer: { id: 1, name: 'Phong' },
        sheet: {
            workspaceId: 7,
            status: 'OPEN'
        }
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(prisma.$transaction).mockImplementation(async (input: unknown) => {
            if (Array.isArray(input)) {
                return Promise.all(input as Promise<unknown>[]);
            }
            return input;
        });
    });

    it('should reject settlement changes on a locked sheet', async () => {
        vi.mocked(getSession).mockResolvedValue(asMock({ id: 1, name: 'Phong' }));
        vi.mocked(prisma.expense.findUnique).mockResolvedValue({
            ...baseExpense,
            sheet: { ...baseExpense.sheet, status: 'LOCKED' }
        } as never);

        const res = await POST(makeRequest({ paymentFor: 'Khôi', isPaid: true }), makeParams());

        expect(res.status).toBe(403);
        await expect(res.json()).resolves.toEqual({
            error: 'Sheet đã bị khóa, không thể thay đổi trạng thái thanh toán'
        });
    });

    it('should reject a workspace outsider even if the session claims admin', async () => {
        vi.mocked(getSession).mockResolvedValue(asMock({ id: 99, name: 'Other Admin', role: 'ADMIN' }));
        vi.mocked(prisma.expense.findUnique).mockResolvedValue(asMock(baseExpense));
        vi.mocked(prisma.member.findFirst).mockResolvedValue(null);

        const res = await POST(makeRequest({ paymentFor: 'Khôi', isPaid: true }), makeParams());

        expect(res.status).toBe(403);
        await expect(res.json()).resolves.toEqual({
            error: 'Forbidden: Not a member of this workspace'
        });
    });

    it('should let the beneficiary create a payment confirmation request for themself', async () => {
        vi.mocked(getSession).mockResolvedValue(asMock({ id: 2, name: 'Khôi' }));
        vi.mocked(prisma.expense.findUnique).mockResolvedValue(asMock(baseExpense));
        vi.mocked(prisma.member.findFirst)
            .mockResolvedValueOnce(asMock({ id: 2, workspaceId: 7, role: 'MEMBER' }))
            .mockResolvedValueOnce(asMock({ id: 2, name: 'Khôi', workspaceId: 7 }))
            .mockResolvedValueOnce(asMock({ id: 2, name: 'Khôi', workspaceId: 7 }));
        vi.mocked(prisma.split.findFirst).mockResolvedValue(asMock({ isPaid: false, isPending: false }));
        vi.mocked(prisma.split.updateMany).mockResolvedValue(asMock({ count: 1 }));
        vi.mocked(prisma.split.findMany).mockResolvedValue(asMock([{ isPaid: false }, { isPaid: true }]));
        vi.mocked(prisma.expense.update).mockResolvedValue(asMock({ id: 100, isSettled: false }));

        const res = await POST(makeRequest({ paymentFor: 'Khôi', isPaid: true }), makeParams());

        expect(res.status).toBe(200);
        await expect(res.json()).resolves.toEqual({
            success: true,
            settledMember: 'Khôi',
            isGlobalSettled: false,
            isPending: true
        });
        expect(prisma.split.updateMany).toHaveBeenCalledWith({
            where: {
                expenseId: 100,
                memberId: 2
            },
            data: {
                isPaid: false,
                isPending: true,
                paidAt: expect.any(Date)
            }
        });
    });

    it('should let the payer confirm a beneficiary payment directly', async () => {
        vi.mocked(getSession).mockResolvedValue(asMock({ id: 1, name: 'Phong' }));
        vi.mocked(prisma.expense.findUnique).mockResolvedValue(asMock(baseExpense));
        vi.mocked(prisma.member.findFirst)
            .mockResolvedValueOnce(asMock({ id: 1, workspaceId: 7, role: 'MEMBER' }))
            .mockResolvedValueOnce(asMock({ id: 2, name: 'Khôi', workspaceId: 7 }))
            .mockResolvedValueOnce(asMock({ id: 2, name: 'Khôi', workspaceId: 7 }));
        vi.mocked(prisma.split.findFirst).mockResolvedValue(asMock({ isPaid: false, isPending: true }));
        vi.mocked(prisma.split.updateMany).mockResolvedValue(asMock({ count: 1 }));
        vi.mocked(prisma.split.findMany).mockResolvedValue(asMock([{ isPaid: true }, { isPaid: true }]));
        vi.mocked(prisma.expense.update).mockResolvedValue(asMock({ id: 100, isSettled: true }));

        const res = await POST(makeRequest({ paymentFor: 'Khôi', isPaid: true }), makeParams());

        expect(res.status).toBe(200);
        await expect(res.json()).resolves.toEqual({
            success: true,
            settledMember: 'Khôi',
            isGlobalSettled: true,
            isPending: false
        });
        expect(prisma.split.updateMany).toHaveBeenCalledWith({
            where: {
                expenseId: 100,
                memberId: 2
            },
            data: {
                isPaid: true,
                isPending: false,
                paidAt: expect.any(Date)
            }
        });
    });

    it('should let the payer globally settle the entire expense', async () => {
        vi.mocked(getSession).mockResolvedValue(asMock({ id: 1, name: 'Phong' }));
        vi.mocked(prisma.expense.findUnique).mockResolvedValue(asMock(baseExpense));
        vi.mocked(prisma.member.findFirst).mockResolvedValue(asMock({ id: 1, workspaceId: 7, role: 'MEMBER' }));
        vi.mocked(prisma.expense.update).mockResolvedValue(asMock({ id: 100, isSettled: true }));
        vi.mocked(prisma.split.updateMany).mockResolvedValue(asMock({ count: 2 }));

        const res = await POST(makeRequest({ isSettled: true }), makeParams());

        expect(res.status).toBe(200);
        await expect(res.json()).resolves.toEqual({ success: true });
        expect(prisma.$transaction).toHaveBeenCalledTimes(1);
        expect(prisma.expense.update).toHaveBeenCalledWith({
            where: { id: 100 },
            data: { isSettled: true }
        });
        expect(prisma.split.updateMany).toHaveBeenCalledWith({
            where: { expenseId: 100 },
            data: {
                isPaid: true,
                isPending: false,
                paidAt: expect.any(Date)
            }
        });
    });
});
