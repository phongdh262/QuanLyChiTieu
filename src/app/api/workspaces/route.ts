import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { runAutoConfirmation } from '@/lib/autoConfirm';

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
        // Trigger background auto-confirmation logic
        runAutoConfirmation().catch(err => console.error('Background auto-confirm failed:', err));

        const workspaces = await prisma.workspace.findMany({
            include: {
                sheets: {
                    where: { NOT: { status: 'DELETED' } }
                },
                members: {
                    where: { NOT: { status: 'DELETED' } }
                }
            }
        });
        return NextResponse.json(workspaces);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to fetch workspaces' }, { status: 500 });
    }
}
