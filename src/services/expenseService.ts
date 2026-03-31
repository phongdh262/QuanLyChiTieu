import { Bill, CalculationResult, DebtTransaction, BalanceStats } from '../types/expense';

interface BalanceBucket {
    name: string;
    amount: number;
}

type BillSplit = NonNullable<Bill['splits']>[number];

/**
 * Calculates the final balance for each member in a group expense sharing scenario.
 */
export function calculateFinalBalances(members: string[], bills: Bill[]): CalculationResult {
    const balances: Record<string, number> = {};
    const stats: Record<string, BalanceStats> = {};
    const privateBalances: Record<string, number> = {};

    members.forEach(member => {
        balances[member] = 0;
        privateBalances[member] = 0;
        stats[member] = {
            sharedPaid: 0,
            privatePaid: 0,
            totalPaid: 0,
            sharedConsumed: 0,
            privateConsumed: 0,
            totalConsumed: 0
        };
    });

    bills.forEach(bill => {
        const { amount, payer, type, beneficiaries } = bill;

        if (!Object.prototype.hasOwnProperty.call(balances, payer)) {
            // Skip unknown payers or handle error
            return;
        }

        // Stats: Track Paid Amount (Always track spending)
        stats[payer].totalPaid += amount;
        if (type === 'SHARED') {
            stats[payer].sharedPaid += amount;
        } else {
            stats[payer].privatePaid += amount;
        }

        // If settled globally, we still track stats but skip balance debt
        const isGlobalSettled = !!bill.isSettled;

        // Use splits if available, otherwise construct synthetic splits from beneficiaries (legacy)
        let effectiveSplits = bill.splits || [];
        if (effectiveSplits.length === 0) {
            const beneficiaryList = type === 'SHARED' ? members : (beneficiaries || []);
            const splitAmt = amount / (beneficiaryList.length || 1);
            effectiveSplits = beneficiaryList.map(name => ({
                member: { name },
                isPaid: isGlobalSettled,
                amount: splitAmt
            }));
        }

        let totalPayerCredit = 0;

        effectiveSplits.forEach(split => {
            const person = split.member.name;
            if (!Object.prototype.hasOwnProperty.call(balances, person)) return;

            const splitAmount = split.amount ?? (amount / effectiveSplits.length);
            const isPaid = isGlobalSettled || !!split.isPaid;

            // Stats Consumed (Always track what everyone ate/used)
            stats[person].totalConsumed += splitAmount;
            if (type === 'SHARED') {
                stats[person].sharedConsumed += splitAmount;
            } else {
                stats[person].privateConsumed += splitAmount;
            }

            // Balance Logic: Only apply if NOT paid and NOT global settled
            if (!isPaid) {
                if (person !== payer) {
                    balances[person] -= splitAmount;
                    totalPayerCredit += splitAmount;

                    if (type === 'PRIVATE') {
                        privateBalances[person] -= splitAmount;
                    }
                }
            }
        });

        // Payer gets credit for all unpaid shares
        balances[payer] += totalPayerCredit;
        if (type === 'PRIVATE') {
            privateBalances[payer] += totalPayerCredit;
        }
    });

    // Rounding
    for (const person in balances) {
        balances[person] = Math.round(balances[person]);
        privateBalances[person] = Math.round(privateBalances[person]);
        stats[person].totalConsumed = Math.round(stats[person].totalConsumed);
        stats[person].sharedConsumed = Math.round(stats[person].sharedConsumed);
        stats[person].privateConsumed = Math.round(stats[person].privateConsumed);
    }

    return {
        balances,
        stats,
        privateBalances
    };
}

/**
 * Calculates the private spending matrix: Who paid how much for whom (Private bills only).
 */
export function calculatePrivateMatrix(members: string[], bills: Bill[]) {
    const matrix: Record<string, Record<string, number>> = {};
    const totals: Record<string, number> = {};

    members.forEach(p => {
        matrix[p] = {};
        totals[p] = 0;
        members.forEach(b => {
            matrix[p][b] = 0;
        });
    });

    bills.filter(b => b.type === 'PRIVATE').forEach(bill => {
        const { amount, payer, splits = [] } = bill;

        // If no splits populated (legacy support), fallback or skip
        if (!splits || splits.length === 0) return;

        if (!matrix[payer]) return;

        splits.forEach((split: BillSplit) => {
            const beneficiaryName = split.member?.name;
            if (!beneficiaryName || beneficiaryName === payer) return;

            const splitAmount = split.amount ?? (amount / splits.length);

            // If paid, skip debt calculation
            if (!!bill.isSettled || split.isPaid) return;

            if (matrix[payer] && Object.prototype.hasOwnProperty.call(matrix[payer], beneficiaryName)) {
                matrix[payer][beneficiaryName] += splitAmount;
                totals[payer] += splitAmount;
            }
        });
    });

    // Rounding
    for (const p in matrix) {
        totals[p] = Math.round(totals[p]);
        for (const b in matrix[p]) {
            matrix[p][b] = Math.round(matrix[p][b]);
        }
    }

    return { matrix, totals };
}

/**
 * Calculates the specific debt transactions to settle the balances.
 */
export function calculateDebts(balances: Record<string, number>): DebtTransaction[] {
    // Normalize to integer VND and compensate rounding drift to keep total = 0.
    const normalizedBalances: Record<string, number> = {};
    for (const [person, amount] of Object.entries(balances)) {
        normalizedBalances[person] = Math.round(Number.isFinite(amount) ? amount : 0);
    }

    const residual = Object.values(normalizedBalances).reduce((sum, amount) => sum + amount, 0);
    if (residual !== 0) {
        if (residual > 0) {
            const biggestCreditor = Object.entries(normalizedBalances)
                .filter(([, amount]) => amount > 0)
                .sort((a, b) => b[1] - a[1])[0];
            if (biggestCreditor) {
                normalizedBalances[biggestCreditor[0]] -= residual;
            }
        } else {
            const biggestDebtor = Object.entries(normalizedBalances)
                .filter(([, amount]) => amount < 0)
                .sort((a, b) => a[1] - b[1])[0];
            if (biggestDebtor) {
                // residual is negative; subtracting it adds the absolute value back.
                normalizedBalances[biggestDebtor[0]] -= residual;
            }
        }
    }

    const debtors: BalanceBucket[] = [];
    const creditors: BalanceBucket[] = [];

    for (const [person, amount] of Object.entries(normalizedBalances)) {
        if (amount < 0) {
            debtors.push({ name: person, amount });
        } else if (amount > 0) {
            creditors.push({ name: person, amount });
        }
    }

    debtors.sort((a, b) => a.amount - b.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    const transactions: DebtTransaction[] = [];
    let i = 0;
    let j = 0;

    while (i < debtors.length && j < creditors.length) {
        const debtor = debtors[i];
        const creditor = creditors[j];

        const transferAmount = Math.min(Math.abs(debtor.amount), creditor.amount);
        if (transferAmount <= 0) break;

        transactions.push({
            from: debtor.name,
            to: creditor.name,
            amount: transferAmount
        });

        debtor.amount += transferAmount;
        creditor.amount -= transferAmount;

        if (debtor.amount === 0) i++;
        if (creditor.amount === 0) j++;
    }

    return transactions;
}
