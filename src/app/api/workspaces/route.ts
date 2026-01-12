import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, ownerId } = body;

        const workspace = await prisma.workspace.create({
            data: {
                name,
                ownerId,
                // Create default sheet
                sheets: {
                    create: {
                        name: `Tháng ${new Date().getMonth() + 1}/${new Date().getFullYear()}`,
                        month: new Date().getMonth() + 1,
                        year: new Date().getFullYear(),
                        status: 'OPEN'
                    }
                }
            },
            include: {
                sheets: true
            }
        });

        return NextResponse.json(workspace);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to create workspace' }, { status: 500 });
    }
}

export async function GET() {
    try {
        const workspaces = await prisma.workspace.findMany({
            include: { sheets: true, members: true }
        });
        return NextResponse.json(workspaces);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to fetch workspaces' }, { status: 500 });
    }
}
