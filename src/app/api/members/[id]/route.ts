import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// UPDATE Member
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const id = parseInt((await params).id);
        const body = await request.json();
        const { name } = body;

        const member = await prisma.member.update({
            where: { id },
            data: { name }
        });

        return NextResponse.json(member);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

// DELETE Member
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const id = parseInt((await params).id);

        await prisma.member.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error(error);
        if (error.code === 'P2003') {
            return NextResponse.json({ error: 'Không thể xóa thành viên đã có giao dịch!' }, { status: 400 });
        }
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
