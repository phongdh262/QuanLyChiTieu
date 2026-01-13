'use client';

import React, { useState, useMemo } from 'react';
import useSWR from 'swr';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/ToastProvider';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import {
    Check,
    Clock,
    History as HistoryIcon,
    Search,
    Send,
    X,
    BellRing,
    Filter
} from 'lucide-react';
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

    const { confirm } = useConfirm();

    const handleAction = async (splitId: number, action: 'confirm' | 'reject') => {
        const isReject = action === 'reject';
        const ok = await confirm({
            title: isReject ? 'Từ chối thanh toán?' : 'Nhận tiền thành công?',
            message: isReject
                ? 'Người yêu cầu sẽ nhận được thông báo bị từ chối và phải gửi lại yêu cầu mới.'
                : 'Xác nhận rằng bạn ĐÃ nhận được tiền thực tế (Tiền mặt/Chuyển khoản).',
            type: isReject ? 'danger' : 'info',
            confirmText: isReject ? 'Từ chối ngay' : 'Đã nhận đủ tiền',
            cancelText: 'Hủy bỏ'
        });

        if (!ok) return;

        try {
            const res = await fetch('/api/payments/confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ splitId, action })
            });

            if (res.ok) {
                addToast(isReject ? 'Đã từ chối yêu cầu' : 'Xác nhận thanh toán thành công', 'success');
                mutate();
                onUpdated();
            } else {
                throw new Error('Failed to handle payment');
            }
        } catch (error) {
            console.error(error);
            addToast('Có lỗi xảy ra', 'error');
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
            <DialogContent className="max-w-xl p-0 overflow-hidden rounded-3xl border-none shadow-2xl bg-[#fafafa]">
                <DialogHeader className="p-6 pb-4 bg-white border-b border-indigo-50/50 sticky top-0 z-10">
                    <DialogTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-indigo-50 rounded-xl text-indigo-600">
                                <BellRing className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-slate-800 tracking-tight">Trung tâm hoạt động</h2>
                                <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mt-0.5">Thông báo & Sự kiện</p>
                            </div>
                        </div>
                    </DialogTitle>
                    {/* Tabs Switcher */}
                    <div className="px-6 flex gap-2 mt-6">
                        <div className="flex p-1.5 bg-slate-100 rounded-2xl w-full gap-1">
                            <button
                                onClick={() => setActiveTab('pendingPayer')}
                                className={cn(
                                    "flex-1 flex flex-row items-center justify-center py-3 px-2 text-sm font-bold rounded-xl transition-all gap-2",
                                    activeTab === 'pendingPayer' ? "bg-white text-indigo-700 shadow-sm ring-1 ring-indigo-50" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                                )}
                            >
                                <BellRing className={cn("w-5 h-5", activeTab === 'pendingPayer' && "fill-indigo-100")} />
                                <span>Cần duyệt</span>
                                {data && data.pendingPayer.length > 0 && (
                                    <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-amber-500 text-white text-[10px] shadow-sm">
                                        {data.pendingPayer.length}
                                    </span>
                                )}
                            </button>
                            <button
                                onClick={() => setActiveTab('pendingDebtor')}
                                className={cn(
                                    "flex-1 flex flex-row items-center justify-center py-3 px-2 text-sm font-bold rounded-xl transition-all gap-2",
                                    activeTab === 'pendingDebtor' ? "bg-white text-indigo-700 shadow-sm ring-1 ring-indigo-50" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                                )}
                            >
                                <Send className="w-5 h-5" />
                                <span>Đã gửi</span>
                            </button>
                            <button
                                onClick={() => setActiveTab('history')}
                                className={cn(
                                    "flex-1 flex flex-row items-center justify-center py-3 px-2 text-sm font-bold rounded-xl transition-all gap-2",
                                    activeTab === 'history' ? "bg-white text-indigo-700 shadow-sm ring-1 ring-indigo-50" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                                )}
                            >
                                <HistoryIcon className="w-5 h-5" />
                                <span>Lịch sử</span>
                            </button>
                        </div>
                    </div>
                </DialogHeader>

                <div className="bg-slate-50/50 min-h-[500px] flex flex-col">
                    {/* Search & Filter Bar */}
                    <div className="px-6 py-4 flex gap-3">
                        <div className="relative flex-1 group">
                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                            <Input
                                placeholder="Tìm kiếm giao dịch..."
                                className="pl-10 h-10 bg-white border-slate-100 rounded-xl text-sm focus-visible:ring-2 focus-visible:ring-indigo-100 shadow-sm transition-all"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Button variant="outline" className="h-10 w-10 p-0 rounded-xl border-slate-200 bg-white hover:bg-slate-50 text-slate-500">
                            <Filter className="w-4 h-4" />
                        </Button>
                    </div>

                    {/* Content List */}
                    <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-4">
                        {filteredList.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in duration-500">
                                <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
                                    {activeTab === 'pendingPayer' && <BellRing className="w-10 h-10 text-indigo-200" />}
                                    {activeTab === 'pendingDebtor' && <Send className="w-10 h-10 text-indigo-200" />}
                                    {activeTab === 'history' && <HistoryIcon className="w-10 h-10 text-indigo-200" />}
                                </div>
                                <h3 className="text-slate-900 font-bold mb-1">Không có dữ liệu</h3>
                                <p className="text-slate-400 text-sm max-w-[200px]">
                                    {searchTerm ? 'Không tìm thấy kết quả phù hợp.' : 'Hiện tại chưa có hoạt động nào trong mục này.'}
                                </p>
                            </div>
                        ) : (
                            filteredList.map((p, idx) => (
                                <div
                                    key={p.id}
                                    className={cn(
                                        "premium-card p-5 group transition-all duration-300 hover:-translate-y-1 relative overflow-hidden",
                                        activeTab === 'pendingPayer' && "border-amber-100/50 bg-gradient-to-br from-white to-amber-50/30",
                                        activeTab === 'pendingDebtor' && "border-blue-100/50 bg-gradient-to-br from-white to-blue-50/30"
                                    )}
                                    style={{ animationDelay: `${idx * 50}ms` }}
                                >
                                    <div className="flex justify-between items-start mb-5">
                                        <div className="flex items-center gap-4">
                                            <div className={cn(
                                                "w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black shadow-lg ring-4 ring-white",
                                                activeTab === 'pendingPayer' ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-amber-200" :
                                                    activeTab === 'pendingDebtor' ? "bg-gradient-to-br from-blue-400 to-indigo-500 text-white shadow-blue-200" :
                                                        "bg-gradient-to-br from-slate-100 to-slate-200 text-slate-500"
                                            )}>
                                                {p.member.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-bold text-slate-900 text-base">
                                                        {activeTab === 'pendingDebtor' ? `Gửi tới: ${p.expense.payer.name}` : p.member.name}
                                                    </span>
                                                    {activeTab === 'pendingPayer' && (
                                                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full uppercase tracking-wide border border-amber-200/50">Mới</span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1.5 text-sm text-slate-500 font-medium bg-white/50 px-2 py-0.5 rounded-lg w-fit">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    {p.paidAt ? format(new Date(p.paidAt), 'HH:mm - dd/MM', { locale: vi }) : '---'}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className={cn(
                                                "font-black text-xl tracking-tight tabular-nums",
                                                activeTab === 'pendingPayer' ? "text-amber-600" : "text-indigo-600"
                                            )}>
                                                {p.amount.toLocaleString()} <span className="text-sm font-bold text-slate-400">đ</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white/60 backdrop-blur-sm rounded-xl p-3 border border-slate-100 mb-4">
                                        <div className="flex items-start gap-2.5">
                                            <p className="text-sm text-slate-600 font-medium leading-relaxed line-clamp-2">
                                                {p.expense.description}
                                            </p>
                                        </div>
                                    </div>

                                    {activeTab === 'pendingPayer' && (
                                        <div className="flex gap-3 mt-2">
                                            <Button
                                                variant="outline"
                                                className="flex-1 h-10 rounded-xl border-red-100 text-red-600 hover:bg-red-50 hover:border-red-200 font-bold transition-all active:scale-95"
                                                onClick={() => handleAction(p.id, 'reject')}
                                            >
                                                <X className="w-4 h-4 mr-2" />
                                                Từ chối
                                            </Button>
                                            <Button
                                                className="flex-[2] h-10 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg shadow-green-200 font-bold transition-all active:scale-95"
                                                onClick={() => handleAction(p.id, 'confirm')}
                                            >
                                                <Check className="w-4 h-4 mr-2" />
                                                Xác nhận đã nhận tiền
                                            </Button>
                                        </div>
                                    )}

                                    {activeTab === 'pendingDebtor' && (
                                        <div className="flex items-center justify-center py-2 bg-blue-50/50 rounded-xl border border-blue-100/50 text-blue-600 text-xs font-bold gap-2">
                                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                                            Đang chờ người chi xác nhận...
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
