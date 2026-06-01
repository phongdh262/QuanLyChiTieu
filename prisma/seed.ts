import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    // Password hash for '2126#'
    const password = '$2b$10$brXh2aQMIbu3rpylXw02QOg.LLYrP4c8a/pCEGvfho6b8cPnI343S';

    const workspace = await prisma.workspace.create({
        data: {
            name: 'Nhóm Ăn Trưa',
            ownerId: 'user-1',
            sheets: {
                create: {
                    name: `Tháng ${new Date().getMonth() + 1}/${new Date().getFullYear()}`,
                    month: new Date().getMonth() + 1,
                    year: new Date().getFullYear(),
                    status: 'OPEN'
                }
            }
        }
    });

    // Create 3 Admin Users
    await prisma.member.createMany({
        data: [
            { name: 'Phong', username: 'phong', password, role: 'ADMIN', workspaceId: workspace.id },
            { name: 'Văn', username: 'van', password, role: 'ADMIN', workspaceId: workspace.id },
            { name: 'Khôi', username: 'khoi', password, role: 'ADMIN', workspaceId: workspace.id },
        ]
    });

    const [defaultSheet, members] = await Promise.all([
        prisma.sheet.findFirst({
            where: { workspaceId: workspace.id },
            orderBy: { id: 'asc' }
        }),
        prisma.member.findMany({
            where: { workspaceId: workspace.id, status: { not: 'DELETED' } }
        })
    ]);

    if (defaultSheet && members.length > 0) {
        await prisma.sheetMember.createMany({
            data: members.map((member) => ({
                sheetId: defaultSheet.id,
                memberId: member.id
            }))
        });
    }

    console.log('Seeding completed: Created Workspace + 3 Admins (Phong, Van, Khoi)');
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
