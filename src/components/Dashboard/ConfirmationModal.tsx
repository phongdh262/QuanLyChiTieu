'use client';

import React, { useState, useMemo } from 'react';
import useSWR from 'swr';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/ToastProvider';
import { useLanguage } from '@/components/LanguageProvider';
import {
    Check,
    Clock,
    History as HistoryIcon,
    Search,
    Send,
    BellRing,
    X,
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
    isPayer?: boolean;
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
    const { t, language } = useLanguage();
    const [activeTab, setActiveTab] = useState<TabType>('pendingPayer');
    const [searchTerm, setSearchTerm] = useState('');

    const { data, mutate } = useSWR<NotificationData>('/api/notifications', fetcher, {
        refreshInterval: 10000
    });

    const handleAction = async (splitId: number, action: 'confirm' | 'reject') => {
        const isReject = action === 'reject';

        try {
            const res = await fetch('/api/payments/confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ splitId, action })
            });

            if (res.ok) {
                addToast(isReject ? t('notifRequestRejected') : t('notifPaymentConfirmed'), 'success');
                mutate();
                onUpdated();
            } else {
                throw new Error('Failed');
            }
        } catch (error) {
            console.error(error);
            addToast(t('notifError'), 'error');
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

    const dateLocale = language === 'vi' ? vi : undefined;

    const tabs: { key: TabType; label: string; icon: React.ReactNode; count?: number }[] = [
        {
            key: 'pendingPayer',
            label: t('notifTabApprove'),
            icon: <BellRing className={cn("w-4 h-4", activeTab === 'pendingPayer' && "fill-indigo-100 dark:fill-indigo-400/20")} />,
            count: data?.pendingPayer?.length || 0,
        },
        {
            key: 'pendingDebtor',
            label: t('notifTabSent'),
            icon: <Send className="w-4 h-4" />,
        },
        {
            key: 'history',
            label: t('notifTabHistory'),
            icon: <HistoryIcon className="w-4 h-4" />,
        },
    ];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg max-h-[85vh] flex flex-col p-0 overflow-hidden rounded-2xl border border-slate-200/60 dark:border-white/[0.06] shadow-2xl bg-white dark:bg-[#1e2235]">
                {/* ===== HEADER ===== */}
                <DialogHeader className="px-5 pt-5 pb-0 shrink-0">
                    <DialogTitle className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                                <BellRing className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight">{t('notifTitle')}</h2>
                                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em]">{t('notifSubtitle')}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => onOpenChange(false)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </DialogTitle>

                    {/* ===== TABS ===== */}
                    <div className="flex p-1 bg-slate-100 dark:bg-white/[0.04] rounded-xl gap-0.5">
                        {tabs.map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={cn(
                                    "flex-1 flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-bold rounded-lg transition-all duration-200",
                                    activeTab === tab.key
                                        ? "bg-white dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-slate-200/50 dark:ring-indigo-400/20"
                                        : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-white/50 dark:hover:bg-white/[0.04]"
                                )}
                            >
                                {tab.icon}
                                <span className="hidden sm:inline">{tab.label}</span>
                                {tab.count && tab.count > 0 ? (
                                    <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[9px] font-black shadow-sm">
                                        {tab.count}
                                    </span>
                                ) : null}
                            </button>
                        ))}
                    </div>
                </DialogHeader>

                {/* ===== SEARCH BAR ===== */}
                <div className="px-5 pt-3 pb-1 shrink-0">
                    <div className="relative group">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                        <Input
                            placeholder={t('notifSearch')}
                            className="pl-9 h-9 bg-slate-50 dark:bg-white/[0.04] border-slate-200/60 dark:border-white/[0.06] rounded-xl text-sm focus-visible:ring-2 focus-visible:ring-indigo-100 dark:focus-visible:ring-indigo-500/20 transition-all dark:text-slate-200 dark:placeholder:text-slate-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* ===== CONTENT LIST ===== */}
                <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-3 min-h-0">
                    {filteredList.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center animate-in fade-in duration-500">
                            <div className="w-16 h-16 bg-slate-100 dark:bg-white/[0.04] rounded-2xl flex items-center justify-center mb-3">
                                {activeTab === 'pendingPayer' && <BellRing className="w-7 h-7 text-slate-300 dark:text-slate-600" />}
                                {activeTab === 'pendingDebtor' && <Send className="w-7 h-7 text-slate-300 dark:text-slate-600" />}
                                {activeTab === 'history' && <HistoryIcon className="w-7 h-7 text-slate-300 dark:text-slate-600" />}
                            </div>
                            <h3 className="text-slate-700 dark:text-slate-300 font-bold text-sm mb-0.5">{t('notifNoData')}</h3>
                            <p className="text-slate-400 dark:text-slate-500 text-xs max-w-[200px]">
                                {searchTerm ? t('notifNoResults') : t('notifNoActivity')}
                            </p>
                        </div>
                    ) : (
                        filteredList.map((p, idx) => (
                            <div
                                key={p.id}
                                className={cn(
                                    "rounded-xl border p-4 transition-all duration-200 hover:shadow-md animate-in fade-in slide-in-from-bottom-1",
                                    activeTab === 'pendingPayer' && "border-indigo-200/60 dark:border-indigo-500/20 bg-gradient-to-br from-white to-indigo-50/45 dark:from-white/[0.03] dark:to-indigo-500/[0.05]",
                                    activeTab === 'pendingDebtor' && "border-blue-200/60 dark:border-blue-500/20 bg-gradient-to-br from-white to-blue-50/50 dark:from-white/[0.03] dark:to-blue-500/[0.04]",
                                    activeTab === 'history' && "border-slate-200/60 dark:border-white/[0.06] bg-white dark:bg-white/[0.02]"
                                )}
                                style={{ animationDelay: `${idx * 40}ms` }}
                            >
                                {/* Top row: Avatar + Name + Amount */}
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black ring-2 ring-white dark:ring-[#1e2235] shadow-md",
                                            activeTab === 'pendingPayer' ? "bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-indigo-200/50 dark:shadow-indigo-500/10" :
                                                activeTab === 'pendingDebtor' ? "bg-gradient-to-br from-blue-400 to-indigo-500 text-white shadow-blue-200/50 dark:shadow-blue-500/10" :
                                                    "bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-600 dark:to-slate-700 text-slate-600 dark:text-slate-300"
                                        )}>
                                            {(activeTab === 'history' && !p.isPayer)
                                                ? p.expense.payer.name.charAt(0).toUpperCase()
                                                : p.member.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                                                    {(activeTab === 'pendingDebtor' || (activeTab === 'history' && !p.isPayer))
                                                        ? `${t('notifSentTo')}: ${p.expense.payer.name}`
                                                        : p.member.name}
                                                </span>
                                                {activeTab === 'pendingPayer' && (
                                                    <span className="px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 text-[9px] font-bold rounded-md uppercase tracking-wide">
                                                        {t('notifNew')}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 font-medium mt-0.5">
                                                <Clock className="w-3 h-3" />
                                                {p.paidAt ? format(new Date(p.paidAt), 'HH:mm - dd/MM', { locale: dateLocale }) : '---'}
                                            </div>
                                        </div>
                                    </div>
                                    <div className={cn(
                                        "font-black text-lg tracking-tight tabular-nums",
                                        activeTab === 'pendingPayer'
                                            ? "text-indigo-600 dark:text-indigo-300"
                                            : activeTab === 'pendingDebtor'
                                                ? "text-blue-600 dark:text-blue-300"
                                                : "text-slate-700 dark:text-slate-200"
                                    )}>
                                        {p.amount.toLocaleString()}<span className="text-xs font-bold text-slate-400 dark:text-slate-500 ml-0.5">đ</span>
                                    </div>
                                </div>

                                {/* Description */}
                                <div className="bg-slate-50/80 dark:bg-white/[0.03] rounded-lg p-2.5 border border-slate-100/80 dark:border-white/[0.04] mb-3">
                                    <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed line-clamp-2">
                                        {p.expense.description}
                                    </p>
                                </div>

                                {/* Action Buttons / Status */}
                                {activeTab === 'pendingPayer' && (
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            className="flex-1 h-9 rounded-lg border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:border-red-300 dark:hover:border-red-500/30 font-bold text-xs transition-all active:scale-95"
                                            onClick={() => handleAction(p.id, 'reject')}
                                        >
                                            {t('notifReject')}
                                        </Button>
                                        <Button
                                            className="flex-[2] h-9 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-md shadow-blue-500/20 font-bold text-xs transition-all active:scale-95"
                                            onClick={() => handleAction(p.id, 'confirm')}
                                        >
                                            <Check className="w-3.5 h-3.5 mr-1.5" />
                                            {t('notifConfirmPayment')}
                                        </Button>
                                    </div>
                                )}

                                {activeTab === 'pendingDebtor' && (
                                    <div className="flex items-center justify-center py-2 bg-blue-50/50 dark:bg-blue-500/[0.06] rounded-lg border border-blue-100/50 dark:border-blue-500/10 text-blue-600 dark:text-blue-400 text-[11px] font-bold gap-2">
                                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                                        {t('notifWaiting')}
                                    </div>
                                )}

                                {activeTab === 'history' && (
                                    <div className={cn(
                                        "flex items-center justify-center py-2 rounded-lg border text-[11px] font-bold gap-2",
                                        p.isPayer
                                            ? "bg-green-50/50 dark:bg-green-500/[0.06] border-green-100/50 dark:border-green-500/10 text-green-600 dark:text-green-400"
                                            : "bg-slate-50/50 dark:bg-white/[0.03] border-slate-100/50 dark:border-white/[0.04] text-slate-500 dark:text-slate-400"
                                    )}>
                                        <Check className="w-3.5 h-3.5" />
                                        {p.isPayer
                                            ? `${t('notifReceivedFrom')} ${p.member.name}`
                                            : `${t('notifPaidTo')} ${p.expense.payer.name}`
                                        }
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
