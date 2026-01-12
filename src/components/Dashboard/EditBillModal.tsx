'use client';
import { createPortal } from 'react-dom';
import React, { useState, useEffect } from 'react';
import { Bill } from '@/types/expense';
import { useToast } from '@/components/UI/ToastProvider';

interface Props {
    bill: Bill;
    members: { id: number; name: string }[];
    onClose: () => void;
    onSave: () => void;
}

export default function EditBillModal({ bill, members, onClose, onSave }: Props) {
    const { addToast } = useToast();
    const [mounted, setMounted] = useState(false);

    // ... (existing hooks) which were deleted, now restoring full logic
    const [description, setDescription] = useState(bill.note || '');
    const [amount, setAmount] = useState(bill.amount.toString());

    // Find payer ID by name
    const initialPayer = members.find(m => m.name === bill.payer);
    // Safe fallback if member not found or members list empty
    const defaultPayerId = members.length > 0 ? members[0].id.toString() : '';
    const [payerId, setPayerId] = useState<string>(initialPayer?.id.toString() || defaultPayerId);

    const [type, setType] = useState<'SHARED' | 'PRIVATE'>(bill.type);

    // For beneficiaries, we might only have names in 'bill.beneficiaries'.
    const initialBenes = (bill.beneficiaries || [])
        .map(name => members.find(m => m.name === name)?.id.toString())
        .filter(id => id !== undefined) as string[];

    const [beneficiaryIds, setBeneficiaryIds] = useState<string[]>(initialBenes);

    // Fix: Handle invalid date
    const formatDate = (dateString?: string | Date) => {
        if (!dateString) return '';
        try {
            return new Date(dateString).toISOString().split('T')[0];
        } catch (e) {
            return '';
        }
    };
    const [date, setDate] = useState(formatDate(bill.date));

    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

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
            const res = await fetch(`/api/expenses/${bill.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    payerId: parseInt(payerId),
                    amount: parseFloat(amount),
                    description,
                    type,
                    date: date || undefined,
                    beneficiaryIds: type === 'PRIVATE' ? beneficiaryIds.map(id => parseInt(id)) : []
                }),
            });

            if (!res.ok) throw new Error('Failed to update expense');
            onSave();
        } catch (error) {
            console.error(error);
            addToast('Có lỗi xảy ra khi cập nhật', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleBeneficiary = (id: string) => {
        setBeneficiaryIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    // Wait for client fields to mount
    if (!mounted) return null;

    return createPortal(
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, backdropFilter: 'blur(4px)'
        }}>
            <div className="card" style={{ width: '500px', maxWidth: '90%', margin: 0, maxHeight: '90vh', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <h2>✏️ Sửa Hóa Đơn</h2>
                    <button onClick={onClose} style={{ width: 'auto', background: 'transparent', color: '#666', fontSize: '1.5rem', padding: 0 }}>&times;</button>
                </div>

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
                            <label>Ngày</label>
                            <input type="date" value={date} onChange={e => setDate(e.target.value)} />
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
                                    background: type === 'SHARED' ? '#3b82f6' : 'white',
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
                                    background: type === 'PRIVATE' ? '#f97316' : 'white',
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
                                Chọn người thụ hưởng:
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

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                        <button type="submit" disabled={isSubmitting} className="primary" style={{ flex: 1 }}>
                            {isSubmitting ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                        </button>
                        <button type="button" onClick={onClose} className="secondary" style={{ width: 'auto' }}>Hủy</button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
