import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
    try {
        // 1. Verify User
        const sessionPayload = await getSession();
        if (!sessionPayload || !sessionPayload.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const user = { id: Number(sessionPayload.id) };

        const body = await request.json();
        const { currentPassword, newPassword } = body;

        if (!currentPassword || !newPassword) {
            return NextResponse.json({ error: 'Thiếu thông tin mật khẩu' }, { status: 400 });
        }

        // 2. Fetch real password from DB
        const dbUser = await prisma.member.findUnique({
            where: { id: user.id }
        });

        if (!dbUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // 3. Compare Password
        const userWithPassword = dbUser as any; // Cast to access password
        const isValid = await bcrypt.compare(currentPassword, userWithPassword.password);
        if (!isValid) {
            return NextResponse.json({ error: 'Mật khẩu hiện tại không đúng' }, { status: 400 });
        }

        // 4. Update Password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await prisma.member.update({
            where: { id: user.id },
            data: {
                password: hashedPassword
            } as any // Cast to avoid strict type checks if schema desync
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Change Password Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
