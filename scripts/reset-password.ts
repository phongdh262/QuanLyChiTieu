import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const username = 'van';
    const newPassword = '12345678';

    console.log(`Resetting password for user: ${username}...`);

    try {
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        const user = await prisma.member.update({
            where: { username },
            data: { password: hashedPassword },
        });

        console.log(`✅ Password for user '${user.username}' has been successfully reset to '${newPassword}'`);
    } catch (error) {
        console.error('❌ Error resetting password:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
