import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const workspace = await prisma.workspace.create({
        data: {
            name: 'Nhóm Ăn Trưa',
            ownerId: 'user-1',
            members: {
                create: [
                    { name: 'Phong' },
                    { name: 'Vân' },
                    { name: 'Khôi' }
                ]
            },
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
            sheets: true,
            members: true
        }
    })
    console.log({ workspace })
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
