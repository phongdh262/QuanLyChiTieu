'use client';
import React, { useState } from 'react';
import { useToast } from '@/components/ui/ToastProvider';

// ... imports

interface Props {
    members: { id: number; name: string }[];
    sheetId: number;
    onAdd: () => void;
    initialData?: {
        amount: number;
        description: string;
        payerId: number;
        type: 'SHARED' | 'PRIVATE';
        beneficiaryIds?: number[];
    } | null;
}

export default function AddBillForm({ members, sheetId, onAdd, initialData }: Props) {
    const { addToast } = useToast();
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState('');
    const [payerId, setPayerId] = useState<string>('');
    const [type, setType] = useState<'SHARED' | 'PRIVATE'>('SHARED');
    const [beneficiaryIds, setBeneficiaryIds] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Initial load & Duplication Effect
    React.useEffect(() => {
        if (members.length > 0 && !payerId) {
            setPayerId(members[0].id.toString());
        }
    }, [members, payerId]);

    // Lifted initialData Effect
    React.useEffect(() => {
        if (initialData) {
            setDescription(initialData.description);
            setAmount(initialData.amount.toString());
            setPayerId(initialData.payerId.toString());
            setType(initialData.type);
            setBeneficiaryIds(initialData.beneficiaryIds?.map(String) || []);
            // Scroll to form
            const formElement = document.getElementById('add-bill-form');
            if (formElement) formElement.scrollIntoView({ behavior: 'smooth' });

            addToast('Đã sao chép thông tin hóa đơn!', 'info');
        }
    }, [initialData, addToast]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;

        if (!description || !amount || !payerId) {
            addToast('Vui lòng điền đầy đủ thông tin', 'warning');
            return;
        }

        if (type === 'PRIVATE' && beneficiaryIds.length === 0) {
            addToast('Vui lòng chọn người thụ hưởng cho chi tiêu riêng', 'warning');
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch('/api/expenses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sheetId,
                    payerId: parseInt(payerId),
                    amount: parseFloat(amount),
                    description,
                    type,
                    date: date || undefined,
                    beneficiaryIds: type === 'PRIVATE' ? beneficiaryIds.map(id => parseInt(id)) : []
                }),
            });

            if (!res.ok) throw new Error('Failed to add expense');

            // Reset form
            setDescription('');
            setAmount('');
            setDate('');
            setType('SHARED');
            setBeneficiaryIds([]);
            addToast('Đã thêm hóa đơn thành công!', 'success');
            onAdd();
        } catch (error) {
            console.error(error);
            addToast('Có lỗi xảy ra khi thêm hóa đơn', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleBeneficiary = (id: string) => {
        setBeneficiaryIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    return (
        <div className="card" id="add-bill-form">
            <h2>➕ Thêm Hóa Đơn Mới</h2>
            <form onSubmit={handleSubmit}>
                <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: '2fr 1fr' }}>
                    <div>
                        <label>Nội dung chi tiêu</label>
                        <input
                            type="text"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                        />
                    </div>
                    <div>
                        <label>Ngày (Tuỳ chọn)</label>
                        <input
                            type="date"
                            value={date}
                            onChange={e => setDate(e.target.value)}
                        />
                    </div>
                </div>

                <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: '1fr 1fr' }}>
                    <div>
                        <label>Số tiền (VNĐ)</label>
                        <input
                            type="number"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                        />
                    </div>
                    <div>
                        <label>Người chi</label>
                        <select value={payerId} onChange={e => setPayerId(e.target.value)}>
                            {members.map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div>
                    <label>Loại chi tiêu</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                        <button
                            type="button"
                            onClick={() => setType('SHARED')}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '0.75rem',
                                background: type === 'SHARED' ? '#3b82f6' : 'white', // Solid Blue
                                border: `1px solid ${type === 'SHARED' ? '#3b82f6' : '#e5e7eb'}`,
                                color: type === 'SHARED' ? 'white' : '#6b7280',
                                borderRadius: 'var(--radius-lg)',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                height: 'auto',
                                boxShadow: type === 'SHARED' ? '0 4px 6px -1px rgba(59, 130, 246, 0.5)' : 'none'
                            }}
                        >
                            <span style={{ fontSize: '1rem', fontWeight: 600 }}>Chung</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setType('PRIVATE')}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '0.75rem',
                                background: type === 'PRIVATE' ? '#f97316' : 'white', // Solid Orange
                                border: `1px solid ${type === 'PRIVATE' ? '#f97316' : '#e5e7eb'}`,
                                color: type === 'PRIVATE' ? 'white' : '#6b7280',
                                borderRadius: 'var(--radius-lg)',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                height: 'auto',
                                boxShadow: type === 'PRIVATE' ? '0 4px 6px -1px rgba(249, 115, 22, 0.5)' : 'none'
                            }}
                        >
                            <span style={{ fontSize: '1rem', fontWeight: 600 }}>Riêng</span>
                        </button>
                    </div>
                </div>

                {type === 'PRIVATE' && (
                    <div className="fade-in" style={{ marginTop: '0.5rem', padding: '1rem', background: '#fff7ed', borderRadius: 'var(--radius-lg)', border: '1px dashed #fdba74' }}>
                        <label style={{ marginBottom: '0.75rem', display: 'block', color: '#c2410c', fontWeight: 600 }}>
                            Chọn người thụ hưởng (Ai phải trả khoản này?):
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '0.75rem' }}>
                            {members.map(m => {
                                const isSelected = beneficiaryIds.includes(m.id.toString());
                                return (
                                    <button
                                        key={m.id}
                                        type="button"
                                        onClick={() => toggleBeneficiary(m.id.toString())}
                                        style={{
                                            width: '100%',
                                            padding: '0.5rem',
                                            borderRadius: 'var(--radius-md)',
                                            background: isSelected ? '#f97316' : 'white',
                                            border: isSelected ? '1px solid #ea580c' : '1px solid #fed7aa',
                                            color: isSelected ? 'white' : '#9a3412',
                                            fontWeight: 600,
                                            boxShadow: isSelected ? '0 2px 4px rgba(234, 88, 12, 0.3)' : 'none',
                                            transition: 'all 0.15s ease',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '0.25rem'
                                        }}
                                    >
                                        {isSelected && <span>✓</span>}
                                        {m.name}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                <button type="submit" disabled={isSubmitting} style={{ marginTop: '1.5rem', width: '100%', fontSize: '1rem', padding: '0.875rem' }}>
                    {isSubmitting ? 'Đang lưu...' : 'Lưu Hóa Đơn'}
                </button>
            </form>
        </div>
    );
}
