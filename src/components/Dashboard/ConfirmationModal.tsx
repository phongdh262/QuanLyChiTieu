'use client';

import React from 'react';
import useSWR from 'swr';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/ToastProvider';
import { Check, Clock, User as UserIcon } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

const fetcher = (url: string) => fetch(url).then(res => res.json());

interface PendingPayment {
    id: number;
    amount: number;
    paidAt: string;
    expense: {
        description: string;
        date: string;
    };
    member: {
        name: string;
    };
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onUpdated: () => void;
}

export default function ConfirmationModal({ open, onOpenChange, onUpdated }: Props) {
    const { addToast } = useToast();
    const { data: pending, mutate } = useSWR<PendingPayment[]>('/api/notifications', fetcher, {
        refreshInterval: 10000 // Refresh every 10s
    });

    const handleConfirm = async (splitId: number) => {
        try {
            const res = await fetch('/api/payments/confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ splitId })
            });

            if (res.ok) {
                addToast('Đã xác nhận thanh toán', 'success');
                mutate(); // Refresh the local list
                onUpdated(); // Refresh global data (balances)
            } else {
                throw new Error('Failed to confirm');
            }
        } catch (error) {
            console.error(error);
            addToast('Lỗi xác nhận', 'error');
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-indigo-700">
                        <Check className="w-5 h-5 text-indigo-500" />
                        Xác nhận thanh toán
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4 max-h-[500px] overflow-y-auto pr-1">
                    {!pending || pending.length === 0 ? (
                        <div className="text-center py-10 text-slate-400 italic">
                            Chưa có yêu cầu thanh toán nào cần xác nhận.
                        </div>
                    ) : (
                        pending.map(p => (
                            <div key={p.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-3 hover:bg-slate-50 transition-colors">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
                                            {p.member.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-800 text-sm">{p.member.name}</p>
                                            <p className="text-[10px] text-slate-500 flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                Báo đã trả: {p.paidAt ? format(new Date(p.paidAt), 'HH:mm dd/MM', { locale: vi }) : '---'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-black text-indigo-600 font-mono text-sm">
                                            {p.amount.toLocaleString()}đ
                                        </p>
                                    </div>
                                </div>

                                <div className="bg-white/80 p-2 rounded-lg border border-slate-100 text-[11px] text-slate-600 italic">
                                    Khoản chi: {p.expense.description}
                                </div>

                                <Button
                                    className="w-full h-8 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow-sm"
                                    onClick={() => handleConfirm(p.id)}
                                >
                                    <Check className="w-3.5 h-3.5 mr-1.5" />
                                    Xác nhận đã nhận tiền
                                </Button>
                            </div>
                        ))
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
