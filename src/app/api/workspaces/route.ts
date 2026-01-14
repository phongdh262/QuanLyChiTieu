import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { runAutoConfirmation } from '@/lib/autoConfirm';

export async function POST(req: Request) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { name } = body; // Remove ownerId from body, use session

        const workspace = await prisma.workspace.create({
            data: {
                name,
                ownerId: String(session.id),
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
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Trigger background auto-confirmation logic
        runAutoConfirmation().catch(err => console.error('Background auto-confirm failed:', err));

        // Only fetch workspaces the user is a member of
        const workspaces = await prisma.workspace.findMany({
            where: {
                members: {
                    some: {
                        id: Number(session.id)
                    }
                }
            },
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
