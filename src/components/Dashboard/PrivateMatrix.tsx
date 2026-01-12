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

    return (
        <div className="card">
            <div
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    marginBottom: isOpen ? '1rem' : '0',
                    padding: '0.5rem 0'
                }}
            >
                <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>💸</span> Bảng Chi Riêng
                </h2>
                <div style={{
                    width: '32px', height: '32px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: isOpen ? '#eff6ff' : '#f3f4f6',
                    borderRadius: '50%',
                    color: isOpen ? 'var(--primary)' : '#6b7280',
                    transition: 'all 0.2s ease'
                }}>
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        style={{
                            width: '20px', height: '20px',
                            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 0.2s'
                        }}
                    >
                        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                    </svg>
                </div>
            </div>

            {isOpen && (
                <>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontStyle: 'italic', fontSize: '0.9rem' }}>
                        Ma trận thanh toán chi hộ (Rows: Người chi, Columns: Người thụ hưởng)
                    </p>
                    <div style={{ overflowX: 'auto' }}>
                        <table>
                            <thead>
                                <tr>
                                    <th>Tên</th>
                                    <th className="amount">Tổng tiền đã chi</th>
                                    {members.map(m => (
                                        <th key={m.name} className="amount">Trả cho {m.name}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {members.map((payer) => (
                                    <tr key={payer.name}>
                                        <td style={{ fontWeight: '500' }}>{payer.name}</td>
                                        <td className="amount" style={{ fontWeight: 'bold' }}>
                                            {formatMoney(totals[payer.name] || 0)}
                                        </td>
                                        {members.map((beneficiary) => {
                                            const amount = matrix[payer.name]?.[beneficiary.name] || 0;
                                            let cellContent = '-';
                                            // Simple styling: just text color for existing usage
                                            let cellStyle: React.CSSProperties = { color: '#d1d5db' };

                                            if (payer.name === beneficiary.name) {
                                                // Diagonal: Disabled look
                                                cellStyle = { background: '#f9fafb', color: 'transparent' };
                                            } else if (amount > 0) {
                                                cellContent = formatMoney(amount);
                                                // Color logic: if payer != beneficiary, it's a debt/payment relation
                                                cellStyle = { color: 'var(--text-main)', fontWeight: 600, background: '#fffbeb' }; // Light yellow bg for debts
                                            } else {
                                                cellStyle = { color: '#e5e7eb', fontSize: '0.85rem' }; // Very faint for 0
                                            }

                                            return (
                                                <td key={beneficiary.name} className="amount" style={cellStyle}>
                                                    {cellContent}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}
