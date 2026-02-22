import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession, hashPassword } from '@/lib/auth';
import { resetPasswordRateLimit } from '@/lib/rateLimit';
import { resetPasswordSchema } from '@/lib/schemas';
import { logActivity } from '@/lib/logger';

export async function POST(req: Request) {
    try {
        // 1. Rate Limiting
        const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
        const { isRateLimited } = resetPasswordRateLimit.check(3, ip);

        if (isRateLimited) {
            return NextResponse.json(
                { error: 'Too many requests. Please try again later.' },
                { status: 429, headers: { 'Retry-After': '60' } }
            );
        }

        // 2. Auth Check
        const session = await getSession();
        if (!session || !session.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 3. Role Check - Only ADMIN
        const admin = await prisma.member.findUnique({
            where: { id: Number(session.id) },
            select: { id: true, name: true, role: true, workspaceId: true },
        });

        if (!admin || admin.role !== 'ADMIN') {
            return NextResponse.json(
                { error: 'Forbidden: Only ADMIN can reset passwords' },
                { status: 403 }
            );
        }

        // 4. Input Validation
        const body = await req.json();
        const validation = resetPasswordSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { error: validation.error.issues[0].message },
                { status: 400 }
            );
        }

        const { memberId, newPassword } = validation.data;

        // 5. Find target member & Workspace check
        const targetMember = await prisma.member.findUnique({
            where: { id: memberId },
            select: { id: true, name: true, username: true, workspaceId: true, status: true },
        });

        if (!targetMember) {
            return NextResponse.json({ error: 'Member not found' }, { status: 404 });
        }

        if (targetMember.workspaceId !== admin.workspaceId) {
            return NextResponse.json(
                { error: 'Forbidden: Member belongs to a different workspace' },
                { status: 403 }
            );
        }

        if (!targetMember.username) {
            return NextResponse.json(
                { error: 'This member does not have a login account' },
                { status: 400 }
            );
        }

        // 6. Hash & Update Password
        const hashedPassword = await hashPassword(newPassword);

        await prisma.member.update({
            where: { id: memberId },
            data: { password: hashedPassword },
        });

        // 7. Activity Log
        await logActivity(
            admin.workspaceId,
            admin.id,
            admin.name,
            'RESET_PASSWORD',
            'MEMBER',
            memberId,
            `Admin ${admin.name} đã reset mật khẩu cho ${targetMember.name} (@${targetMember.username})`
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Reset Password Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
