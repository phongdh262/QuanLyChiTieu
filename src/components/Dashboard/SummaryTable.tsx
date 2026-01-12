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
            <div className="card-header" onClick={() => setIsOpen(!isOpen)}>
                <h2>
                    <span>📊</span> Bảng Tổng Kết
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
                                <th>Thành viên</th>
                                <th className="amount">Tổng Tiền</th>
                                <th className="amount">Dư / Nợ Tiền Ăn Chung</th>
                            </tr>
                        </thead>
                        <tbody>
                            {members.map(member => {
                                const m = member.name;
                                const s = stats[m.toString()] || stats[m] || { sharedPaid: 0, totalPaid: 0 };
                                const bal = balances[m] || 0;
                                const privateBal = privateBalances[m] || 0;
                                const sharedBalance = bal - privateBal;

                                const balText = sharedBalance === 0 ? '-' : (sharedBalance > 0 ? `+${formatMoney(sharedBalance)}` : formatMoney(sharedBalance));
                                const textClass = sharedBalance > 0 ? 'text-success font-bold' : (sharedBalance < 0 ? 'text-danger font-bold' : '');

                                return (
                                    <tr key={member.id}>
                                        <td className="font-medium">{member.name}</td>
                                        <td className="amount font-bold">{formatMoney(s.sharedPaid)}</td>
                                        <td className={`amount ${textClass}`}>{balText}</td>
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
