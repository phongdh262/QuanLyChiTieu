/**
 * Calculates the final balance for each member in a group expense sharing scenario.
 * 
 * @param {string[]} members - List of all member names.
 * @param {Array<{amount: number, payer: string, type: 'SHARED'|'PRIVATE', beneficiaries?: string[]}>} bills - List of bills.
 * @returns {Object} - Result object containing balances and statistics.
 */
function calculateFinalBalances(members, bills) {
    const balances = {};
    const stats = {};
    const privateBalances = {}; // Track purely private interactions

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
            console.warn(`Payer "${payer}" is not in the members list.`);
            return;
        }

        // Stats: Track Paid Amount
        stats[payer].totalPaid += amount;
        if (type === 'SHARED') {
            stats[payer].sharedPaid += amount;
        } else {
            stats[payer].privatePaid += amount;
        }

        // Main Balance Logic (Global)
        balances[payer] += amount;

        // Private Balance Logic (Isolated)
        if (type === 'PRIVATE') {
            privateBalances[payer] += amount;
        }

        let billBeneficiaries = [];
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
        balances, // Final Net Balance (Receivable/Payable)
        stats,    // Detailed Paid/Consumed breakdown
        privateBalances // Final Net Balance for Private bills only
    };
}

/**
 * Calculates the private spending matrix: Who paid how much for whom (Private bills only).
 * Rows: Payers. Columns: Beneficiaries.
 * @returns {Object} { matrix: { [payer]: { [beneficiary]: amount } }, totals: { [payer]: amount } }
 */
function calculatePrivateMatrix(members, bills) {
    const matrix = {};
    const totals = {};

    // Init matrix
    members.forEach(p => {
        matrix[p] = {};
        totals[p] = 0;
        members.forEach(b => {
            matrix[p][b] = 0;
        });
    });

    bills.filter(b => b.type === 'PRIVATE').forEach(bill => {
        const { amount, payer, beneficiaries } = bill;

        // Validation needed in case members changed but bill remains
        if (!matrix[payer]) return;

        const validBeneficiaries = beneficiaries.filter(b => matrix[payer].hasOwnProperty(b));
        if (validBeneficiaries.length === 0) return;

        const splitAmount = amount / validBeneficiaries.length;

        totals[payer] += amount;

        // Add to matrix
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
 * Strategy: Match largest debtors with largest creditors to minimize transaction count.
 * 
 * @param {Object.<string, number>} balances - The output from calculateFinalBalances
 * @returns {Array<{from: string, to: string, amount: number}>} - List of transactions.
 */
function calculateDebts(balances) {
    let debtors = [];
    let creditors = [];

    // Separate into debtors and creditors
    for (const [person, amount] of Object.entries(balances)) {
        if (amount < -1) { // Tolerance for floating point
            debtors.push({ name: person, amount: amount });
        } else if (amount > 1) {
            creditors.push({ name: person, amount: amount });
        }
    }

    // Sort by magnitude (descending) to optimize matching
    debtors.sort((a, b) => a.amount - b.amount); // Most negative first (e.g. -500 before -100)
    creditors.sort((a, b) => b.amount - a.amount); // Most positive first (e.g. 500 before 100)

    const transactions = [];
    let i = 0; // Debtor index
    let j = 0; // Creditor index

    while (i < debtors.length && j < creditors.length) {
        let debtor = debtors[i];
        let creditor = creditors[j];

        // The amount to settle is the minimum of what the debtor owes and what the creditor is owed
        let amount = Math.min(Math.abs(debtor.amount), creditor.amount);

        // Push transaction
        transactions.push({
            from: debtor.name,
            to: creditor.name,
            amount: Math.round(amount)
        });

        // Update remaining amounts
        debtor.amount += amount;
        creditor.amount -= amount;

        // If debtor is settled (close to 0), move to next debtor
        if (Math.abs(debtor.amount) < 1) {
            i++;
        }

        // If creditor is settled (close to 0), move to next creditor
        if (creditor.amount < 1) {
            j++;
        }
    }

    return transactions;
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { calculateFinalBalances, calculateDebts, calculatePrivateMatrix };
}
