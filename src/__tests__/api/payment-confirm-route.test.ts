import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/payments/confirm/route';

vi.mock('@/lib/prisma', () => ({
    default: {
        split: {
            findUnique: vi.fn(),
            findMany: vi.fn(),
            update: vi.fn(),
        },
        expense: {
            update: vi.fn(),
        },
        member: {
            findFirst: vi.fn(),
        },
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

const makeRequest = (body: Record<string, unknown>) => new Request('http://localhost/api/payments/confirm', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
});

describe('Payment Confirm Route Tests', () => {
    const baseSplit = {
        id: 10,
        expenseId: 100,
        memberId: 2,
        isPaid: false,
        isPending: true,
        expense: {
            id: 100,
            payerId: 1,
            description: 'Dinner',
            payer: { id: 1, name: 'Phong' },
            sheet: {
                workspaceId: 7,
                status: 'OPEN'
            }
        },
        member: { id: 2, name: 'Khôi' }
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should reject confirmation from an admin outside the expense workspace', async () => {
        vi.mocked(getSession).mockResolvedValue(asMock({ id: 99, name: 'Other Admin', role: 'ADMIN' }));
        vi.mocked(prisma.split.findUnique).mockResolvedValue(asMock(baseSplit));
        vi.mocked(prisma.member.findFirst).mockResolvedValue(null);

        const res = await POST(makeRequest({ splitId: 10, action: 'confirm' }));

        expect(res.status).toBe(403);
        await expect(res.json()).resolves.toEqual({
            error: 'Forbidden: Not a member of this workspace'
        });
    });

    it('should reject confirmation from a regular member who is neither payer nor admin', async () => {
        vi.mocked(getSession).mockResolvedValue(asMock({ id: 3, name: 'Vân' }));
        vi.mocked(prisma.split.findUnique).mockResolvedValue(asMock(baseSplit));
        vi.mocked(prisma.member.findFirst).mockResolvedValue(asMock({ id: 3, workspaceId: 7, role: 'MEMBER' }));

        const res = await POST(makeRequest({ splitId: 10, action: 'confirm' }));

        expect(res.status).toBe(403);
        await expect(res.json()).resolves.toEqual({
            error: 'Only the original payer or admin can handle this payment'
        });
    });

    it('should allow the payer to confirm payment and settle the expense when all splits are paid', async () => {
        vi.mocked(getSession).mockResolvedValue(asMock({ id: 1, name: 'Phong' }));
        vi.mocked(prisma.split.findUnique).mockResolvedValue(asMock(baseSplit));
        vi.mocked(prisma.member.findFirst).mockResolvedValue(asMock({ id: 1, workspaceId: 7, role: 'MEMBER' }));
        vi.mocked(prisma.split.update).mockResolvedValue(asMock({ ...baseSplit, isPaid: true, isPending: false }));
        vi.mocked(prisma.split.findMany).mockResolvedValue(asMock([{ isPaid: true }, { isPaid: true }]));
        vi.mocked(prisma.expense.update).mockResolvedValue(asMock({ id: 100, isSettled: true }));

        const res = await POST(makeRequest({ splitId: 10, action: 'confirm' }));

        expect(res.status).toBe(200);
        await expect(res.json()).resolves.toEqual({
            success: true,
            isGlobalSettled: true,
            action: 'confirm'
        });
        expect(prisma.split.update).toHaveBeenCalledWith({
            where: { id: 10 },
            data: {
                isPaid: true,
                isPending: false,
                paidAt: undefined
            }
        });
        expect(prisma.expense.update).toHaveBeenCalledWith({
            where: { id: 100 },
            data: { isSettled: true }
        });
    });

    it('should allow an admin in the same workspace to reject payment', async () => {
        vi.mocked(getSession).mockResolvedValue(asMock({ id: 4, name: 'Admin' }));
        vi.mocked(prisma.split.findUnique).mockResolvedValue(asMock(baseSplit));
        vi.mocked(prisma.member.findFirst).mockResolvedValue(asMock({ id: 4, workspaceId: 7, role: 'ADMIN' }));
        vi.mocked(prisma.split.update).mockResolvedValue(asMock({ ...baseSplit, isPaid: false, isPending: false, paidAt: null }));
        vi.mocked(prisma.split.findMany).mockResolvedValue(asMock([{ isPaid: false }, { isPaid: true }]));
        vi.mocked(prisma.expense.update).mockResolvedValue(asMock({ id: 100, isSettled: false }));

        const res = await POST(makeRequest({ splitId: 10, action: 'reject' }));

        expect(res.status).toBe(200);
        await expect(res.json()).resolves.toEqual({
            success: true,
            isGlobalSettled: false,
            action: 'reject'
        });
        expect(prisma.split.update).toHaveBeenCalledWith({
            where: { id: 10 },
            data: {
                isPaid: false,
                isPending: false,
                paidAt: null
            }
        });
    });
});
