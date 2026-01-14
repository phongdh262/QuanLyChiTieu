import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

const SECRET_KEY = process.env.JWT_SECRET;
if (!SECRET_KEY) {
    throw new Error('FATAL: JWT_SECRET is not defined in environment variables.');
}
const key = new TextEncoder().encode(SECRET_KEY);

export async function hashPassword(password: string) {
    return await bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
    return await bcrypt.compare(password, hash);
}

export async function createSession(payload: any) {
    const token = await new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('30d') // Long session for convenience
        .sign(key);

    (await cookies()).set('session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30 // 30 days
    });
}

export async function getSession() {
    const session = (await cookies()).get('session')?.value;
    if (!session) return null;
    try {
        const { payload } = await jwtVerify(session, key, {
            algorithms: ['HS256'],
        });
        return payload;
    } catch (error) {
        return null;
    }
}

export async function logout() {
    (await cookies()).delete('session');
}
