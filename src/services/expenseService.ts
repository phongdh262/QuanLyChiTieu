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

        // If settled, DO NOT calculate debt/balance
        if (bill.isSettled) return;

        // Main Balance Logic (Global)
        balances[payer] += amount;

        // Private Balance Logic (Isolated)
        if (type === 'PRIVATE') {
            privateBalances[payer] += amount;
        }

        let billBeneficiaries: string[] = [];
        if (type === 'SHARED') {
            billBeneficiaries = members;
        } else if (type === 'PRIVATE') {
            if (!beneficiaries || beneficiaries.length === 0) return;
            billBeneficiaries = beneficiaries.filter(b => balances.hasOwnProperty(b));
        }

        if (billBeneficiaries.length === 0) return;

        const splitAmount = amount / billBeneficiaries.length;

        // Beneficiaries consume
        billBeneficiaries.forEach(person => {
            // Global Balance
            balances[person] -= splitAmount;

            // Stats Consumed
            stats[person].totalConsumed += splitAmount;
            if (type === 'SHARED') {
                stats[person].sharedConsumed += splitAmount;
            } else {
                stats[person].privateConsumed += splitAmount;
            }

            // Private Balance (Isolated)
            if (type === 'PRIVATE') {
                privateBalances[person] -= splitAmount;
            }
        });
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
        const { amount, payer, beneficiaries } = bill;

        // Skip settled bills from debt matrix
        if (bill.isSettled) return;

        if (!matrix[payer]) return;

        const validBeneficiaries = (beneficiaries || []).filter(b => matrix[payer].hasOwnProperty(b));
        if (validBeneficiaries.length === 0) return;

        const splitAmount = amount / validBeneficiaries.length;

        totals[payer] += amount;

        validBeneficiaries.forEach(person => {
            matrix[payer][person] += splitAmount;
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
