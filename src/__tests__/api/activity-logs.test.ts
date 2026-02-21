import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET } from '@/app/api/activity-logs/route';

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
    default: {
        activityLog: {
            findMany: vi.fn(),
        },
    },
}));

vi.mock('@/lib/auth', () => ({
    getSession: vi.fn(),
}));

import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

describe('GET /api/activity-logs', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    const makeRequest = (params: Record<string, string> = {}) => {
        const url = new URL('http://localhost/api/activity-logs');
        Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
        return new Request(url.toString());
    };

    it('should return 401 if not authenticated', async () => {
        vi.mocked(getSession).mockResolvedValue(null);

        const res = await GET(makeRequest());
        expect(res.status).toBe(401);
    });

    it('should return all logs when no filters provided', async () => {
        vi.mocked(getSession).mockResolvedValue({ id: 1, name: 'Admin' });
        const mockLogs = [
            { id: 1, description: 'Test', actorName: 'Admin', action: 'CREATE', createdAt: new Date() },
            { id: 2, description: 'Test2', actorName: 'User', action: 'UPDATE', createdAt: new Date() },
        ];
        vi.mocked(prisma.activityLog.findMany).mockResolvedValue(mockLogs as any);

        const res = await GET(makeRequest());
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data).toHaveLength(2);
    });

    it('should filter logs by sheetId', async () => {
        vi.mocked(getSession).mockResolvedValue({ id: 1, name: 'Admin' });
        const mockLogs = [
            { id: 1, description: 'Sheet 1 log', actorName: 'Admin', action: 'CREATE', createdAt: new Date(), sheetId: 5 },
        ];
        vi.mocked(prisma.activityLog.findMany).mockResolvedValue(mockLogs as any);

        const res = await GET(makeRequest({ sheetId: '5' }));
        expect(res.status).toBe(200);

        // Verify the where clause includes sheetId
        const callArgs = vi.mocked(prisma.activityLog.findMany).mock.calls[0][0] as any;
        expect(callArgs.where).toBeDefined();
        expect(callArgs.where.sheetId).toBe(5);
    });

    it('should filter by month/year date range', async () => {
        vi.mocked(getSession).mockResolvedValue({ id: 1, name: 'Admin' });
        vi.mocked(prisma.activityLog.findMany).mockResolvedValue([] as any);

        const res = await GET(makeRequest({ month: '2', year: '2026' }));
        expect(res.status).toBe(200);

        const callArgs = vi.mocked(prisma.activityLog.findMany).mock.calls[0][0] as any;
        expect(callArgs.where.createdAt).toBeDefined();
        expect(callArgs.where.createdAt.gte).toBeInstanceOf(Date);
        expect(callArgs.where.createdAt.lte).toBeInstanceOf(Date);
    });

    it('should combine sheetId + month/year with OR clause', async () => {
        vi.mocked(getSession).mockResolvedValue({ id: 1, name: 'Admin' });
        vi.mocked(prisma.activityLog.findMany).mockResolvedValue([] as any);

        const res = await GET(makeRequest({ sheetId: '5', month: '2', year: '2026' }));
        expect(res.status).toBe(200);

        const callArgs = vi.mocked(prisma.activityLog.findMany).mock.calls[0][0] as any;
        // Should use OR clause when both sheetId and date are provided
        expect(callArgs.where.OR).toBeDefined();
        expect(callArgs.where.OR).toHaveLength(2);
        expect(callArgs.where.OR[0].sheetId).toBe(5);
        expect(callArgs.where.OR[1].sheetId).toBeNull();
    });

    it('should order by createdAt desc and limit to 100', async () => {
        vi.mocked(getSession).mockResolvedValue({ id: 1, name: 'Admin' });
        vi.mocked(prisma.activityLog.findMany).mockResolvedValue([] as any);

        await GET(makeRequest());

        const callArgs = vi.mocked(prisma.activityLog.findMany).mock.calls[0][0] as any;
        expect(callArgs.orderBy).toEqual({ createdAt: 'desc' });
        expect(callArgs.take).toBe(100);
    });
});
