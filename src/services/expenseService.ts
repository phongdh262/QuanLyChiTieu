import { Bill, CalculationResult, DebtTransaction, BalanceStats } from '../types/expense';

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

        if (!balances.hasOwnProperty(payer)) {
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
            if (!balances.hasOwnProperty(person)) return;

            const splitAmount = split.amount || (amount / effectiveSplits.length);
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
        const { amount, payer, id, splits } = bill; // Expect splits to be populated now

        // If no splits populated (legacy support), fallback or skip
        if (!splits || splits.length === 0) return;

        if (!matrix[payer]) return;

        // Debt is calculated per split
        const splitAmount = amount / splits.length;

        splits.forEach((split: any) => {
            const beneficiaryName = split.member?.name;

            // If paid, skip debt calculation
            if (split.isPaid) return;

            if (beneficiaryName && matrix[payer] && matrix[payer].hasOwnProperty(beneficiaryName)) {
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
    const debtors = [];
    const creditors = [];

    for (const [person, amount] of Object.entries(balances)) {
        if (amount < -1) {
            debtors.push({ name: person, amount: amount });
        } else if (amount > 1) {
            creditors.push({ name: person, amount: amount });
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

        const amount = Math.min(Math.abs(debtor.amount), creditor.amount);

        transactions.push({
            from: debtor.name,
            to: creditor.name,
            amount: Math.round(amount)
        });

        debtor.amount += amount;
        creditor.amount -= amount;

        if (Math.abs(debtor.amount) < 1) i++;
        if (creditor.amount < 1) j++;
    }

    return transactions;
}
