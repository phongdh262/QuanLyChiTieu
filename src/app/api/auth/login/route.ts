import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyPassword, createSession } from '@/lib/auth';

export async function POST(req: Request) {
    try {
        const { username, password, captchaToken } = await req.json();

        if (!username || !password) {
            return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
        }

        // Verify Recaptcha
        if (captchaToken) {
            const secretKey = process.env.RECAPTCHA_SECRET_KEY;
            if (secretKey) {
                const verifyRes = await fetch(`https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${captchaToken}`, {
                    method: 'POST',
                });
                const verifyData = await verifyRes.json();
                if (!verifyData.success) {
                    return NextResponse.json({ error: 'Recaptcha verification failed' }, { status: 400 });
                }
            }
        }

        const member = await prisma.member.findUnique({
            where: { username },
        });

        if (!member || !member.password) {
            return NextResponse.json({ error: 'User found or invalid password' }, { status: 401 });
        }

        const isValid = await verifyPassword(password, member.password);
        if (!isValid) {
            return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
        }

        // Login Success -> Create Session
        await createSession({
            id: member.id,
            name: member.name,
            username: member.username,
            workspaceId: member.workspaceId
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
