import React from 'react';

interface Props {
    members: { name: string }[];
    matrixData: {
        matrix: Record<string, Record<string, number>>;
        totals: Record<string, number>;
    };
}

const formatMoney = (amount: number) => amount.toLocaleString('vi-VN') + ' ₫';

export default function PrivateMatrix({ members, matrixData }: Props) {
    const { matrix, totals } = matrixData;
    const [isOpen, setIsOpen] = React.useState(false);

    // Logic:
    // User wants: "Row (Debtor) needs to pay Column (Creditor)"
    // matrix[Payer][Beneficiary] = Amount Payer paid for Beneficiary
    // Creditor = Payer
    // Debtor = Beneficiary
    // So Cell(Row=Debtor, Col=Creditor) = matrix[Creditor][Debtor]

    return (
        <div className="card">
            <div className="card-header" onClick={() => setIsOpen(!isOpen)}>
                <h2>
                    <span>💸</span> Bảng Ghi Nợ (Chi Riêng)
                </h2>
                <div className={`card-toggle-icon ${isOpen ? 'open' : ''}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style={{ width: '20px', height: '20px' }}>
                        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                    </svg>
                </div>
            </div>

            {isOpen && (
                <div className="table-container fade-in">
                    <table className="table-report">
                        <thead>
                            <tr>
                                <th>Người Nợ</th>
                                {members.map(m => (
                                    <th key={m.name} className="amount">Trả cho {m.name}</th>
                                ))}
                                <th className="amount">Tổng Nợ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {members.map((debtor) => {
                                let totalDebt = 0;
                                return (
                                    <tr key={debtor.name}>
                                        <td className="font-medium">{debtor.name}</td>
                                        {members.map((creditor) => {
                                            // matrix[Payer][Beneficiary]
                                            // Payer sent money -> Creditor
                                            // Beneficiary received value -> Debtor
                                            const amount = matrix[creditor.name]?.[debtor.name] || 0;

                                            let cellContent = '-';
                                            let cellClass = 'amount text-muted';
                                            let cellStyle: React.CSSProperties = {};

                                            if (creditor.name === debtor.name) {
                                                // Diagonal
                                                cellStyle = { background: '#f9fafb', color: 'transparent' };
                                            } else if (amount > 0) {
                                                cellContent = formatMoney(amount);
                                                cellClass = 'amount font-bold';
                                                cellStyle = { background: '#fffbeb', color: 'var(--text-main)' };
                                                totalDebt += amount;
                                            }

                                            return (
                                                <td key={creditor.name} className={cellClass} style={cellStyle}>
                                                    {cellContent}
                                                </td>
                                            );
                                        })}
                                        <td className="amount font-bold text-danger">
                                            {totalDebt > 0 ? formatMoney(totalDebt) : '-'}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
