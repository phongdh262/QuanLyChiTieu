import React from 'react';
import { CalculationResult, Member } from '@/types/expense';

interface Props {
    members: Member[];
    calculations: CalculationResult;
}

const formatMoney = (amount: number) => amount.toLocaleString('vi-VN') + ' ₫';

export default function SummaryTable({ members, calculations }: Props) {
    const { balances, stats, privateBalances } = calculations;
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
                    <span>📊</span> Bảng Tổng Kết
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
                <div className="overflow-x-auto">
                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0' }}>
                        <thead>
                            <tr>
                                <th style={{ textAlign: 'left', padding: '1rem', borderBottom: '2px solid #f3f4f6', color: '#6b7280', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Thành viên</th>
                                <th style={{ textAlign: 'right', padding: '1rem', borderBottom: '2px solid #f3f4f6', color: '#6b7280', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tổng Tiền</th>
                                <th style={{ textAlign: 'right', padding: '1rem', borderBottom: '2px solid #f3f4f6', color: '#6b7280', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Dư / Nợ Tiền Ăn Chung</th>
                            </tr>
                        </thead>
                        <tbody>
                            {members.map(member => {
                                const m = member.name;
                                const s = stats[m] || { totalPaid: 0 };
                                const bal = balances[m] || 0;
                                const privateBal = privateBalances[m] || 0;
                                const sharedBalance = bal - privateBal;

                                const balText = sharedBalance === 0 ? '-' : (sharedBalance > 0 ? `+${formatMoney(sharedBalance)}` : formatMoney(sharedBalance));
                                const textStyle = sharedBalance > 0 ? { color: '#10b981', fontWeight: 'bold' } : (sharedBalance < 0 ? { color: '#ef4444', fontWeight: 'bold' } : {});

                                return (
                                    <tr key={member.id}>
                                        <td style={{ padding: '1rem', borderBottom: '1px solid #f3f4f6', fontWeight: 500, color: '#374151' }}>{member.name}</td>
                                        <td style={{ padding: '1rem', borderBottom: '1px solid #f3f4f6', textAlign: 'right', fontWeight: 600 }}>{formatMoney(s.totalPaid)}</td>
                                        <td style={{ padding: '1rem', borderBottom: '1px solid #f3f4f6', textAlign: 'right', ...textStyle }}>{balText}</td>
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
