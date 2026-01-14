'use client';
import { createPortal } from 'react-dom';
import React, { useState, useEffect } from 'react';
import { Bill } from '@/types/expense';
import { useToast } from '@/components/ui/ToastProvider';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from '@/lib/utils';

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
    const [amount, setAmount] = useState(bill.amount.toLocaleString('vi-VN'));

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
        } catch {
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
            addToast('Please fill in all fields', 'warning');
            return;
        }

        if (type === 'PRIVATE' && beneficiaryIds.length === 0) {
            addToast('Please select beneficiaries for private expense', 'warning');
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/expenses/${bill.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    payerId: parseInt(payerId),
                    amount: parseInt(amount.replace(/\./g, '')), // Clean formatted string
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
            addToast('Error updating expense', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleBeneficiary = (id: string) => {
        setBeneficiaryIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '');
        if (value === '') {
            setAmount('');
            return;
        }
        const numberValue = parseInt(value);
        setAmount(numberValue.toLocaleString('vi-VN'));
    };

    // Wait for client fields to mount
    if (!mounted) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-slate-200 animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50/50 rounded-t-lg">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        ✏️ Edit Expense
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 transition-colors text-xl"
                    >
                        &times;
                    </button>
                </div>

                <div className="p-6">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-4">
                                <div className="col-span-2 space-y-2">
                                    <label className="text-sm font-medium text-slate-700">Description</label>
                                    <input
                                        type="text"
                                        value={description}
                                        onChange={e => setDescription(e.target.value)}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        placeholder="Enter description..."
                                        autoFocus
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">Date</label>
                                    <input
                                        type="date"
                                        value={date}
                                        onChange={e => setDate(e.target.value)}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">Amount (VND)</label>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        value={amount}
                                        onChange={handleAmountChange}
                                        onPaste={(e) => {
                                            const text = e.clipboardData.getData('text');
                                            if (!/^[\d.,\s]+$/.test(text)) {
                                                e.preventDefault();
                                                addToast('Vui lòng chỉ copy số tiền hợp lệ (không chứa chữ)', 'warning');
                                            }
                                        }}
                                        onKeyDown={(e) => {
                                            // Allow controls (Backspace, Delete, Arrows, Tab, Copy/Paste)
                                            if (
                                                ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End', 'Enter'].includes(e.key) ||
                                                (e.ctrlKey || e.metaKey)
                                            ) {
                                                return;
                                            }
                                            // Strictly allow ONLY digits 0-9
                                            if (!/^\d$/.test(e.key)) {
                                                e.preventDefault();
                                            }
                                        }}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-bold text-blue-700 ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">Payer</label>
                                    <Select value={payerId} onValueChange={setPayerId}>
                                        <SelectTrigger className="h-10 w-full bg-background border-input focus:ring-2 focus:ring-ring focus:ring-offset-2">
                                            <SelectValue placeholder="Chọn người chi" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {members.map(m => (
                                                <SelectItem key={m.id} value={m.id.toString()} className="cursor-pointer py-2.5">
                                                    <div className="flex items-center gap-2">
                                                        <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold",
                                                            ['bg-blue-500', 'bg-red-500', 'bg-green-500', 'bg-amber-500', 'bg-purple-500', 'bg-pink-500'][Math.abs(m.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % 6]
                                                        )}>
                                                            {m.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        {m.name}
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Expense Type</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setType('SHARED')}
                                        className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all duration-200 ${type === 'SHARED'
                                            ? 'bg-blue-500 text-white border-blue-600 shadow-md'
                                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                            }`}
                                    >
                                        <span className="font-bold">Shared</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setType('PRIVATE')}
                                        className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all duration-200 ${type === 'PRIVATE'
                                            ? 'bg-orange-500 text-white border-orange-600 shadow-md'
                                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                            }`}
                                    >
                                        <span className="font-bold">Private</span>
                                    </button>
                                </div>
                            </div>

                            {type === 'PRIVATE' && (
                                <div className="p-4 bg-orange-50 border border-orange-100 rounded-lg space-y-3 animate-in fade-in slide-in-from-top-1">
                                    <label className="text-sm font-bold text-orange-800 block">
                                        Select Beneficiaries:
                                    </label>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        {members.map(m => {
                                            const isSelected = beneficiaryIds.includes(m.id.toString());
                                            return (
                                                <button
                                                    key={m.id}
                                                    type="button"
                                                    onClick={() => toggleBeneficiary(m.id.toString())}
                                                    className={`
                                                        flex items-center justify-center gap-1.5 p-2 rounded-md text-sm font-medium transition-all
                                                        ${isSelected
                                                            ? 'bg-orange-500 text-white shadow-sm'
                                                            : 'bg-white border border-orange-200 text-orange-800 hover:bg-orange-100'
                                                        }
                                                    `}
                                                >
                                                    {isSelected && <span>✓</span>}
                                                    {m.name}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-4 pt-2 border-t border-slate-100 mt-6">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="flex-1 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                            >
                                {isSubmitting ? 'Saving...' : 'Save Changes'}
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-6 h-10 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-md font-medium transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>,
        document.body
    );
}
