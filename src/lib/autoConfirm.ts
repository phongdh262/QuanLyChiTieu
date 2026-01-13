import prisma from './prisma';
import { logActivity } from './logger';

/**
 * Automatically confirms pending payments that are older than 3 days.
 * This can be called periodically (e.g., on page load or workspace fetch).
 */
export async function runAutoConfirmation() {
    try {
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

        // Find pending splits older than 3 days
        const oldPendingSplits = await prisma.split.findMany({
            where: {
                isPending: true,
                isPaid: false,
                paidAt: {
                    lt: threeDaysAgo
                }
            },
            include: {
                expense: {
                    include: {
                        sheet: true
                    }
                },
                member: true
            }
        });

        if (oldPendingSplits.length === 0) return;

        console.log(`Auto-confirming ${oldPendingSplits.length} payments...`);

        for (const split of oldPendingSplits) {
            // Update to PAID
            await prisma.split.update({
                where: { id: split.id },
                data: {
                    isPaid: true,
                    isPending: false
                }
            });

            // Check if expense is now fully settled
            const allSplits = await prisma.split.findMany({
                where: { expenseId: split.expenseId }
            });
            const allPaid = allSplits.every(s => (s as any).isPaid);

            await prisma.expense.update({
                where: { id: split.expenseId },
                data: { isSettled: allPaid } as any
            });

            // Log activity as SYSTEM
            await logActivity(
                split.expense.sheet.workspaceId,
                0, // System User ID
                'Hệ Thống',
                'UPDATE',
                'EXPENSE',
                split.expenseId,
                `TỰ ĐỘNG XÁC NHẬN thanh toán cho ${split.member.name} trong khoản chi: ${split.expense.description} (Quá 3 ngày không xác nhận)`
            );
        }

        return oldPendingSplits.length;
    } catch (error) {
        console.error('Auto Confirmation Error:', error);
        return 0;
    }
}
