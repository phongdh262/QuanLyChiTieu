import React, { useState } from 'react';
import { DebtTransaction, Member } from '@/types/expense';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import { useToast } from '@/components/ui/ToastProvider';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ArrowRight, Coins } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
    debts: DebtTransaction[];
    members: Member[];
    onSettle: (from: string, to: string, amount: number) => void;
    title?: string;
}

const formatMoney = (amount: number) => amount.toLocaleString('vi-VN') + ' ₫';

const getInitial = (name: string) => name.charAt(0).toUpperCase();

// Bright palette for avatars in light mode
const AVATAR_GRADIENTS = [
    'linear-gradient(135deg, #2563EB, #0EA5E9)',
    'linear-gradient(135deg, #0F766E, #14B8A6)',
    'linear-gradient(135deg, #7C3AED, #A855F7)',
    'linear-gradient(135deg, #EA580C, #F97316)',
    'linear-gradient(135deg, #0284C7, #38BDF8)',
];

const getAvatarGradient = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
};

export default function DebtsTable({ debts, onSettle, title = "Chốt Sổ Cuối Kỳ" }: Props) {
    const { confirm } = useConfirm();
    const { addToast } = useToast();
    const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
    const [isOpen, setIsOpen] = useState(true);

    const handleSettle = async (d: DebtTransaction) => {
        const key = `${d.from}-${d.to}`;
        const ok = await confirm({
            title: 'Xác nhận thanh toán',
            message: `Xác nhận ${d.from} đã chuyển ${formatMoney(d.amount)} cho ${d.to}?`,
            confirmText: 'Đã thanh toán',
            cancelText: 'Chưa',
            type: 'info'
        });
        if (!ok) return;
        setLoadingMap(prev => ({ ...prev, [key]: true }));
        await onSettle(d.from, d.to, d.amount);
        addToast('Đã ghi nhận thanh toán', 'success');
        setLoadingMap(prev => ({ ...prev, [key]: false }));
    };

    return (
        <Card className="premium-card overflow-hidden border-none soft-shadow mb-6 group/debts">
            <CardHeader
                className="cursor-pointer flex flex-row items-center justify-between pb-5 border-b border-slate-200/70 dark:border-white/[0.08] bg-gradient-to-br from-slate-50/90 via-white to-blue-50/45 dark:from-slate-500/5 dark:via-transparent dark:to-transparent"
                onClick={() => setIsOpen(!isOpen)}
            >
                <CardTitle className="text-lg sm:text-xl flex items-center gap-3">
                    <div
                        className="p-2.5 rounded-xl group-hover/debts:scale-110 group-hover/debts:rotate-3 transition-all duration-500 shadow-lg shadow-blue-200/45 dark:shadow-blue-950/25"
                        style={{ background: 'linear-gradient(135deg, #2563EB, #06B6D4)' }}
                    >
                        <Coins className="w-5 h-5 drop-shadow-sm text-white" />
                    </div>
                    <div>
                        <span
                            className="font-bold tracking-tight block"
                            style={{ fontFamily: 'var(--font-cormorant), Georgia, serif', fontSize: '20px' }}
                        >
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-slate-700 to-slate-900 dark:from-slate-100 dark:to-white">
                                {title}
                            </span>
                        </span>
                        <span className="text-[11px] font-semibold tracking-[0.08em] text-slate-500 dark:text-slate-400">
                            Ai cần chuyển tiền cho ai
                        </span>
                    </div>
                </CardTitle>
                <div
                    className={cn(
                        'rounded-full p-2 shadow-sm ring-1 ring-slate-200 dark:ring-white/[0.08] transition-all duration-300',
                        isOpen ? 'rotate-180 bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300' : 'bg-white text-slate-400 dark:bg-white/[0.05] dark:text-slate-300'
                    )}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                    </svg>
                </div>
            </CardHeader>

            {isOpen && (
                <CardContent className="fade-in pt-5 pb-4">
                    {debts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 gap-3">
                            <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-500/15 dark:to-cyan-500/15">
                                🎉
                            </div>
                            <div className="text-center space-y-1">
                                <p className="font-bold text-lg text-slate-700 dark:text-slate-100" style={{ fontFamily: 'var(--font-cormorant), Georgia, serif' }}>
                                    Không có công nợ
                                </p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    Mọi người đã thanh toán đủ. Tuyệt vời!
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {debts.map((d, index) => {
                                const key = `${d.from}-${d.to}`;
                                const isLoading = loadingMap[key];

                                return (
                                    <div
                                        key={index}
                                        className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 rounded-xl p-3.5 sm:p-4 border border-slate-200/80 dark:border-white/[0.08] bg-gradient-to-br from-white to-slate-50/85 dark:from-white/[0.03] dark:to-transparent shadow-sm hover:shadow-md transition-all duration-200"
                                    >
                                        {/* From person */}
                                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                            <div
                                                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                                                style={{ background: getAvatarGradient(d.from), color: '#FFFFFF' }}
                                            >
                                                {getInitial(d.from)}
                                            </div>
                                            <span className="font-semibold text-sm truncate text-slate-700 dark:text-slate-200">
                                                {d.from}
                                            </span>
                                        </div>

                                        {/* Arrow + amount */}
                                        <div className="flex items-center gap-3 shrink-0">
                                            <div className="flex items-center gap-1.5">
                                                <div className="h-px w-5 sm:w-8 bg-blue-200 dark:bg-blue-500/30" />
                                                <ArrowRight className="w-4 h-4 text-blue-500 dark:text-blue-300" />
                                            </div>
                                            <div className="font-bold tabular-nums text-base text-blue-700 dark:text-blue-300" style={{ fontFamily: 'var(--font-cormorant), Georgia, serif', fontSize: '17px' }}>
                                                {formatMoney(d.amount)}
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <ArrowRight className="w-4 h-4 text-blue-500 dark:text-blue-300" />
                                                <div className="h-px w-5 sm:w-8 bg-blue-200 dark:bg-blue-500/30" />
                                            </div>
                                        </div>

                                        {/* To person */}
                                        <div className="flex items-center gap-2.5 min-w-0 flex-1 justify-end sm:justify-start">
                                            <div
                                                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                                                style={{ background: getAvatarGradient(d.to), color: '#FFFFFF' }}
                                            >
                                                {getInitial(d.to)}
                                            </div>
                                            <span className="font-semibold text-sm truncate text-slate-700 dark:text-slate-200">
                                                {d.to}
                                            </span>
                                        </div>

                                        {/* Settle button */}
                                        <button
                                            onClick={() => !isLoading && handleSettle(d)}
                                            disabled={isLoading}
                                            className={cn(
                                                "shrink-0 rounded-lg px-3.5 py-1.5 text-xs font-bold tracking-[0.08em] uppercase transition-all duration-200 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed",
                                                isLoading
                                                    ? "bg-slate-100 text-slate-400 dark:bg-white/[0.06] dark:text-slate-400"
                                                    : "text-white bg-gradient-to-r from-blue-600 to-cyan-500 shadow-md shadow-blue-300/40 hover:shadow-blue-400/45 dark:shadow-blue-950/35"
                                            )}
                                        >
                                            {isLoading ? '⏳ Đang xử lý…' : 'Xác nhận đã trả'}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            )}
        </Card>
    );
}
