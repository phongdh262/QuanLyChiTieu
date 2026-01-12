export interface Member {
    id: number;
    name: string;
}

export interface Bill {
    id: number;
    amount: number;
    payer: string; // Name or ID
    type: 'SHARED' | 'PRIVATE';
    beneficiaries?: string[]; // Names or IDs
    note?: string;
    date?: string | Date;
}

export interface BalanceStats {
    sharedPaid: number;
    privatePaid: number;
    totalPaid: number;
    sharedConsumed: number;
    privateConsumed: number;
    totalConsumed: number;
}

export interface CalculationResult {
    balances: Record<string, number>;
    stats: Record<string, BalanceStats>;
    privateBalances: Record<string, number>;
}

export interface DebtTransaction {
    from: string;
    to: string;
    amount: number;
}
