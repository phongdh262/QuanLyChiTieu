'use client';

import React, { useState, useMemo } from 'react';
import useSWR from 'swr';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/ToastProvider';
import { Check, Clock, History as HistoryIcon, Search, User as UserIcon, Send } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const fetcher = (url: string) => fetch(url).then(res => res.json());

interface PendingPayment {
    id: number;
    amount: number;
    paidAt: string;
    expense: {
        description: string;
        date: string;
        payer: {
            name: string;
        };
    };
    member: {
        name: string;
    };
}

interface NotificationData {
    pendingPayer: PendingPayment[];
    pendingDebtor: PendingPayment[];
    history: PendingPayment[];
    totalPending: number;
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onUpdated: () => void;
}

type TabType = 'pendingPayer' | 'pendingDebtor' | 'history';

export default function ConfirmationModal({ open, onOpenChange, onUpdated }: Props) {
    const { addToast } = useToast();
    const [activeTab, setActiveTab] = useState<TabType>('pendingPayer');
    const [searchTerm, setSearchTerm] = useState('');

    const { data, mutate } = useSWR<NotificationData>('/api/notifications', fetcher, {
        refreshInterval: 10000
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
                mutate();
                onUpdated();
            } else {
                throw new Error('Failed to confirm');
            }
        } catch (error) {
            console.error(error);
            addToast('Lỗi xác nhận', 'error');
        }
    };

    const filteredList = useMemo(() => {
        const list = data ? data[activeTab] || [] : [];
        if (!searchTerm) return list;

        const s = searchTerm.toLowerCase();
        return list.filter(p =>
            p.member.name.toLowerCase().includes(s) ||
            p.expense.description.toLowerCase().includes(s) ||
            p.expense.payer.name.toLowerCase().includes(s)
        );
    }, [data, activeTab, searchTerm]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md p-0 overflow-hidden rounded-2xl border-none shadow-2xl">
                <DialogHeader className="p-6 pb-2 bg-gradient-to-r from-indigo-50 to-white">
                    <DialogTitle className="flex items-center gap-2 text-indigo-700 text-xl font-extrabold uppercase tracking-tight">
                        <Check className="w-6 h-6 text-indigo-500" />
                        Trung tâm thông báo
                    </DialogTitle>
                </DialogHeader>

                {/* Tabs Switcher */}
                <div className="px-6 flex gap-1 mt-4">
                    <div className="flex p-1 bg-slate-100 rounded-xl w-full">
                        <button
                            onClick={() => setActiveTab('pendingPayer')}
                            className={cn(
                                "flex-1 flex flex-col items-center justify-center py-2 px-1 text-[10px] font-bold rounded-lg transition-all gap-1",
                                activeTab === 'pendingPayer' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            <Clock className="w-4 h-4" />
                            Cần xác nhận ({data?.pendingPayer?.length || 0})
                        </button>
                        <button
                            onClick={() => setActiveTab('pendingDebtor')}
                            className={cn(
                                "flex-1 flex flex-col items-center justify-center py-2 px-1 text-[10px] font-bold rounded-lg transition-all gap-1",
                                activeTab === 'pendingDebtor' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            <Send className="w-4 h-4" />
                            Đã gửi ({data?.pendingDebtor?.length || 0})
                        </button>
                        <button
                            onClick={() => setActiveTab('history')}
                            className={cn(
                                "flex-1 flex flex-col items-center justify-center py-2 px-1 text-[10px] font-bold rounded-lg transition-all gap-1",
                                activeTab === 'history' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            <HistoryIcon className="w-4 h-4" />
                            Lịch sử ({data?.history?.length || 0})
                        </button>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="px-6 mt-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                        <Input
                            placeholder="Tìm kiếm theo tên, nội dung..."
                            className="pl-9 h-9 bg-slate-50 border-slate-100 rounded-lg text-sm focus-visible:ring-indigo-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="space-y-4 p-6 pt-4 max-h-[450px] overflow-y-auto min-h-[350px]">
                    {filteredList.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400 italic">
                            {searchTerm ? (
                                <p>Không tìm thấy kết quả nào khớp với &quot;{searchTerm}&quot;</p>
                            ) : activeTab === 'pendingPayer' ? (
                                <>
                                    <Clock className="w-12 h-12 mb-3 opacity-20" />
                                    <p>Hết việc rồi! Không có yêu cầu nào.</p>
                                </>
                            ) : activeTab === 'pendingDebtor' ? (
                                <>
                                    <Send className="w-12 h-12 mb-3 opacity-20" />
                                    <p>Bạn chưa gửi yêu cầu trả tiền nào.</p>
                                </>
                            ) : (
                                <>
                                    <HistoryIcon className="w-12 h-12 mb-3 opacity-20" />
                                    <p>Chưa có lịch sử xác nhận gần đây.</p>
                                </>
                            )}
                        </div>
                    ) : (
                        filteredList.map(p => (
                            <div key={p.id} className={cn(
                                "p-4 rounded-xl border space-y-3 transition-all",
                                activeTab === 'pendingPayer'
                                    ? "border-amber-100 bg-amber-50/20 hover:bg-amber-50/40"
                                    : activeTab === 'pendingDebtor'
                                        ? "border-blue-100 bg-blue-50/20"
                                        : "border-slate-100 bg-slate-50/50 hover:bg-slate-50"
                            )}>
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-2">
                                        <div className={cn(
                                            "w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shadow-sm ring-2 ring-white",
                                            activeTab === 'pendingPayer' ? "bg-amber-100 text-amber-700" : "bg-indigo-100 text-indigo-700"
                                        )}>
                                            {p.member.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-800 text-sm">
                                                {activeTab === 'pendingDebtor' ? `Tới: ${p.expense.payer.name}` : p.member.name}
                                            </p>
                                            <p className="text-[10px] text-slate-500 flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {p.paidAt ? format(new Date(p.paidAt), 'HH:mm dd/MM', { locale: vi }) : '---'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={cn(
                                            "font-black font-mono text-sm",
                                            activeTab === 'pendingPayer' ? "text-amber-600" : "text-indigo-600"
                                        )}>
                                            {p.amount.toLocaleString()}đ
                                        </p>
                                        <span className={cn(
                                            "text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider",
                                            activeTab === 'pendingPayer' ? "bg-amber-100 text-amber-700" :
                                                activeTab === 'pendingDebtor' ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"
                                        )}>
                                            {activeTab === 'pendingPayer' ? 'CẦN XÁC NHẬN' :
                                                activeTab === 'pendingDebtor' ? 'CHỜ XÁC NHẬN' : 'ĐÃ HOÀN TẤT'}
                                        </span>
                                    </div>
                                </div>

                                <div className="bg-white/90 p-2.5 rounded-lg border border-slate-100 shadow-sm">
                                    <div className="flex items-start gap-2">
                                        <UserIcon className="w-3 h-3 text-slate-400 mt-0.5" />
                                        <p className="text-[11px] text-slate-600 leading-relaxed italic">
                                            {p.expense.description}
                                        </p>
                                    </div>
                                </div>

                                {activeTab === 'pendingPayer' && (
                                    <Button
                                        className="w-full h-9 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-md active:scale-[0.98] transition-all"
                                        onClick={() => handleConfirm(p.id)}
                                    >
                                        <Check className="w-4 h-4 mr-2" />
                                        Xác nhận đã nhận tiền
                                    </Button>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
