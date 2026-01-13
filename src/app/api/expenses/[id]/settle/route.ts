import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const sessionPayload = await getSession();
        if (!sessionPayload || !sessionPayload.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const expenseId = parseInt(params.id);
        const body = await request.json();
        const { isSettled } = body;

        const updated = await prisma.expense.update({
            where: { id: expenseId },
            data: { isSettled: !!isSettled }
        });

        return NextResponse.json({ success: true, expense: updated });
    } catch (error) {
        console.error('Settle Expense Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
