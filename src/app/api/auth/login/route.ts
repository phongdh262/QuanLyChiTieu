import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyPassword, createSession } from '@/lib/auth';
import { loginRateLimit } from '@/lib/rateLimit';
import { loginSchema } from '@/lib/schemas';

export async function POST(req: Request) {
    try {
        // 1. Rate Limiting
        const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
        const { isRateLimited, remaining } = loginRateLimit.check(5, ip); // 5 attempts per min

        if (isRateLimited) {
            return NextResponse.json(
                { error: 'Too many login attempts. Please try again later.' },
                { status: 429, headers: { 'Retry-After': '60' } }
            );
        }

        const body = await req.json();

        // 2. Input Validation
        const validation = loginSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 });
        }

        const { username, password, captchaToken } = validation.data;

        if (!captchaToken) {
            return NextResponse.json({ error: 'Please complete the Captcha check' }, { status: 400 });
        }

        // Verify Turnstile
        const secretKey = process.env.TURNSTILE_SECRET_KEY;
        if (secretKey) {
            const formData = new FormData();
            formData.append('secret', secretKey);
            formData.append('response', captchaToken);

            const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
                method: 'POST',
                body: formData,
            });
            const verifyData = await verifyRes.json();
            if (!verifyData.success) {
                return NextResponse.json({ error: 'Turnstile check failed' }, { status: 400 });
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
