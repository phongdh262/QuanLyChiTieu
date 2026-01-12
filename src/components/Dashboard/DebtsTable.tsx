import React, { useState } from 'react';
import { DebtTransaction, Member } from '@/types/expense';
import { useConfirm } from '@/components/UI/ConfirmProvider';
import { useToast } from '@/components/UI/ToastProvider';

interface Props {
    debts: DebtTransaction[];
    members: Member[];
    onSettle: (from: string, to: string, amount: number) => void;
    title?: string;
}

const formatMoney = (amount: number) => amount.toLocaleString('vi-VN') + ' ₫';

export default function DebtsTable({ debts, members, onSettle, title = "Bảng Tính Nợ Tổng (Final Settlement)" }: Props) {
    const { confirm } = useConfirm();
    const { addToast } = useToast();
    const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});

    const handleStatusChange = async (d: DebtTransaction, e: React.ChangeEvent<HTMLSelectElement>) => {
        if (e.target.value === 'PAID') {
            const key = `${d.from}-${d.to}`;
            const ok = await confirm({
                title: 'Xác nhận thanh toán',
                message: `Xác nhận ${d.from} đã trả ${formatMoney(d.amount)} cho ${d.to}?`,
                confirmText: 'Đã trả',
                cancelText: 'Chưa',
                type: 'info'
            });

            if (ok) {
                setLoadingMap(prev => ({ ...prev, [key]: true }));
                await onSettle(d.from, d.to, d.amount);
                addToast('Đã ghi nhận thanh toán', 'success');
                setLoadingMap(prev => ({ ...prev, [key]: false }));
            } else {
                e.target.value = 'UNPAID'; // Revert
            }
        }
    };

    return (
        <div className="card">
            <h2>📊 {title}</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontStyle: 'italic', fontSize: '0.9rem' }}>
                Bảng chốt sổ cuối cùng: Ai cần cần chuyển khoản cho ai bao nhiêu.
            </p>
            <table>
                <thead>
                    <tr>
                        <th>Từ (Người nợ)</th>
                        <th>Đến (Người được trả)</th>
                        <th className="amount">Số tiền</th>
                        <th>Trạng thái</th>
                    </tr>
                </thead>
                <tbody>
                    {debts.length === 0 ? (
                        <tr>
                            <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                                🎉 Không có công nợ! Mọi người đã thanh toán đủ.
                            </td>
                        </tr>
                    ) : (
                        debts.map((d, index) => {
                            const key = `${d.from}-${d.to}`;
                            const isLoading = loadingMap[key];

                            return (
                                <tr key={index}>
                                    <td style={{ fontWeight: 500 }}>{d.from}</td>
                                    <td style={{ fontWeight: 500 }}>➡️ {d.to}</td>
                                    <td className="amount negative">{formatMoney(d.amount)}</td>
                                    <td>
                                        <select
                                            style={{
                                                width: 'auto',
                                                padding: '0.25rem 0.5rem',
                                                fontSize: '0.85rem',
                                                margin: 0,
                                                borderColor: 'var(--danger)',
                                                color: 'var(--danger)',
                                                fontWeight: 600
                                            }}
                                            value="UNPAID"
                                            onChange={(e) => handleStatusChange(d, e)}
                                            disabled={isLoading}
                                        >
                                            <option value="UNPAID">❌ Chưa thanh toán</option>
                                            <option value="PAID">✅ Đã thanh toán</option>
                                        </select>
                                        {isLoading && <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem' }}>⏳</span>}
                                    </td>
                                </tr>
                            );
                        })
                    )}
                </tbody>
            </table>
        </div>
    );
}
