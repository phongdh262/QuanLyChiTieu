import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PATCH } from '@/app/api/sheets/[sheetId]/lock/route';

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
    default: {
        sheet: {
            findUnique: vi.fn(),
            update: vi.fn(),
        },
        member: {
            findFirst: vi.fn(),
        },
    },
}));

vi.mock('@/lib/auth', () => ({
    getSession: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
    logActivity: vi.fn(),
}));

import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

describe('PATCH /api/sheets/[sheetId]/lock', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    const makeRequest = (sheetId: string) => {
        return new Request('http://localhost/api/sheets/' + sheetId + '/lock', {
            method: 'PATCH',
        });
    };

    const makeParams = (sheetId: string) => ({
        params: Promise.resolve({ sheetId }),
    });

    it('should return 401 if not authenticated', async () => {
        vi.mocked(getSession).mockResolvedValue(null);

        const res = await PATCH(makeRequest('1'), makeParams('1'));
        expect(res.status).toBe(401);
    });

    it('should return 404 if sheet does not exist', async () => {
        vi.mocked(getSession).mockResolvedValue({ id: 1, name: 'Admin' });
        vi.mocked(prisma.sheet.findUnique).mockResolvedValue(null);

        const res = await PATCH(makeRequest('999'), makeParams('999'));
        expect(res.status).toBe(404);
    });

    it('should return 400 if sheet is DELETED', async () => {
        vi.mocked(getSession).mockResolvedValue({ id: 1, name: 'Admin' });
        vi.mocked(prisma.sheet.findUnique).mockResolvedValue({
            id: 1, name: 'Jan 2026', status: 'DELETED', workspaceId: 1
        } as any);

        const res = await PATCH(makeRequest('1'), makeParams('1'));
        expect(res.status).toBe(400);
    });

    it('should return 403 if user is not a member', async () => {
        vi.mocked(getSession).mockResolvedValue({ id: 1, name: 'Admin' });
        vi.mocked(prisma.sheet.findUnique).mockResolvedValue({
            id: 1, name: 'Jan 2026', status: 'OPEN', workspaceId: 1
        } as any);
        vi.mocked(prisma.member.findFirst).mockResolvedValue(null);

        const res = await PATCH(makeRequest('1'), makeParams('1'));
        expect(res.status).toBe(403);
    });

    it('should return 403 if user is MEMBER (not ADMIN)', async () => {
        vi.mocked(getSession).mockResolvedValue({ id: 2, name: 'User' });
        vi.mocked(prisma.sheet.findUnique).mockResolvedValue({
            id: 1, name: 'Jan 2026', status: 'OPEN', workspaceId: 1
        } as any);
        vi.mocked(prisma.member.findFirst).mockResolvedValue({
            id: 2, name: 'User', role: 'MEMBER', workspaceId: 1
        } as any);

        const res = await PATCH(makeRequest('1'), makeParams('1'));
        expect(res.status).toBe(403);
        const body = await res.json();
        expect(body.error).toContain('ADMIN');
    });

    it('should toggle OPEN -> LOCKED for ADMIN', async () => {
        vi.mocked(getSession).mockResolvedValue({ id: 1, name: 'Admin' });
        vi.mocked(prisma.sheet.findUnique).mockResolvedValue({
            id: 1, name: 'Jan 2026', status: 'OPEN', workspaceId: 1
        } as any);
        vi.mocked(prisma.member.findFirst).mockResolvedValue({
            id: 1, name: 'Admin', role: 'ADMIN', workspaceId: 1
        } as any);
        vi.mocked(prisma.sheet.update).mockResolvedValue({
            id: 1, name: 'Jan 2026', status: 'LOCKED', workspaceId: 1
        } as any);

        const res = await PATCH(makeRequest('1'), makeParams('1'));
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.status).toBe('LOCKED');
        expect(prisma.sheet.update).toHaveBeenCalledWith({
            where: { id: 1 },
            data: { status: 'LOCKED' }
        });
    });

    it('should toggle LOCKED -> OPEN for ADMIN', async () => {
        vi.mocked(getSession).mockResolvedValue({ id: 1, name: 'Admin' });
        vi.mocked(prisma.sheet.findUnique).mockResolvedValue({
            id: 1, name: 'Jan 2026', status: 'LOCKED', workspaceId: 1
        } as any);
        vi.mocked(prisma.member.findFirst).mockResolvedValue({
            id: 1, name: 'Admin', role: 'ADMIN', workspaceId: 1
        } as any);
        vi.mocked(prisma.sheet.update).mockResolvedValue({
            id: 1, name: 'Jan 2026', status: 'OPEN', workspaceId: 1
        } as any);

        const res = await PATCH(makeRequest('1'), makeParams('1'));
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.status).toBe('OPEN');
        expect(prisma.sheet.update).toHaveBeenCalledWith({
            where: { id: 1 },
            data: { status: 'OPEN' }
        });
    });
});
