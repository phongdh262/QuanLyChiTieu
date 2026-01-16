import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { logActivity } from '@/lib/logger';
import { createSheetSchema } from '@/lib/schemas';

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Zod Validation
        const validation = createSheetSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 });
        }
        const { workspaceId, month, year } = validation.data;

        const name = `Tháng ${month}/${year}`;

        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const actorId = session.id as number;
        const actorName = session.name as string;

        const requestor = await prisma.member.findFirst({
            where: { id: actorId, workspaceId: workspaceId }
        });
        if (!requestor) {
            return NextResponse.json({ error: 'Forbidden: You must be a member of this workspace' }, { status: 403 });
        }

        // Check for duplicate sheet (excluding deleted ones if applicable, but typically "status" field might be used)
        // Adjusting query to check for existing active sheet
        const existingSheet = await prisma.sheet.findFirst({
            where: {
                workspaceId,
                month,
                year,
                status: { not: 'DELETED' } // Ensure we don't block if previous one was deleted (assuming DELETED status usage)
            }
        });

        if (existingSheet) {
            return NextResponse.json({ error: `Bảng chi tiêu cho tháng ${month}/${year} đã tồn tại!` }, { status: 409 });
        }

        const sheet = await prisma.sheet.create({
            data: {
                name,
                month,
                year,
                workspaceId,
                status: 'OPEN'
            }
        });

        await logActivity(
            workspaceId,
            actorId,
            actorName,
            'CREATE',
            'SHEET',
            sheet.id,
            `Đã tạo bảng chi tiết tháng mới: ${name}`,
            sheet.id
        );

        return NextResponse.json(sheet);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
