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

// Warm red-brown palette for avatars
const AVATAR_GRADIENTS = [
    'linear-gradient(135deg, #8B1A1A, #6B0F0F)',
    'linear-gradient(135deg, #7A2020, #5C1010)',
    'linear-gradient(135deg, #8B3414, #6B260D)',
    'linear-gradient(135deg, #6B3020, #4F1E10)',
    'linear-gradient(135deg, #9B4020, #7A2E10)',
];

const getAvatarGradient = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
};

export default function DebtsTable({ debts, members, onSettle, title = "Chốt Sổ Cuối Kỳ" }: Props) {
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
                className="cursor-pointer flex flex-row items-center justify-between pb-5 border-b border-border/60"
                onClick={() => setIsOpen(!isOpen)}
            >
                <CardTitle className="text-lg sm:text-xl flex items-center gap-3">
                    <div
                        className="p-2.5 rounded-lg group-hover/debts:scale-110 group-hover/debts:rotate-3 transition-all duration-500"
                        style={{ background: 'linear-gradient(135deg, #B08D40, #8A6C28)', boxShadow: '0 4px 14px rgba(176, 141, 64, 0.35)' }}
                    >
                        <Coins className="w-5 h-5 drop-shadow-sm" style={{ color: '#F5EDD8' }} />
                    </div>
                    <div>
                        <span
                            className="font-bold tracking-tight block"
                            style={{ fontFamily: 'var(--font-cormorant), Georgia, serif', fontSize: '20px', color: 'rgba(44, 24, 16, 0.85)' }}
                        >
                            {title}
                        </span>
                        <span className="text-[11px] font-medium tracking-wide" style={{ color: 'rgba(44, 24, 16, 0.38)', letterSpacing: '0.08em' }}>
                            Ai cần chuyển tiền cho ai
                        </span>
                    </div>
                </CardTitle>
                <div
                    className={cn('rounded-full p-2 shadow-sm ring-1 transition-all duration-300', isOpen ? 'rotate-180' : '')}
                    style={{ background: 'rgba(176, 141, 64, 0.07)', color: 'rgba(44, 24, 16, 0.4)', borderColor: 'rgba(176, 141, 64, 0.15)' }}
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
                            <div
                                className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
                                style={{ background: 'linear-gradient(135deg, rgba(201,163,78,0.12), rgba(139,26,26,0.08))' }}
                            >
                                🎉
                            </div>
                            <div className="text-center space-y-1">
                                <p
                                    className="font-bold text-lg"
                                    style={{ fontFamily: 'var(--font-cormorant), Georgia, serif', color: 'rgba(44,24,16,0.75)' }}
                                >
                                    Không có công nợ
                                </p>
                                <p className="text-sm" style={{ color: 'rgba(44,24,16,0.4)' }}>
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
                                        className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 rounded-xl p-3.5 sm:p-4 border transition-all duration-200"
                                        style={{
                                            background: 'linear-gradient(160deg, hsl(40,52%,99%) 0%, hsl(38,40%,96%) 100%)',
                                            borderColor: 'rgba(201,163,78,0.2)',
                                            boxShadow: '0 2px 10px rgba(139,26,26,0.04)',
                                        }}
                                    >
                                        {/* From person */}
                                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                            <div
                                                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                                                style={{ background: getAvatarGradient(d.from), color: '#E8D9B8' }}
                                            >
                                                {getInitial(d.from)}
                                            </div>
                                            <span className="font-semibold text-sm truncate" style={{ color: 'rgba(44,24,16,0.8)' }}>
                                                {d.from}
                                            </span>
                                        </div>

                                        {/* Arrow + amount */}
                                        <div className="flex items-center gap-3 shrink-0">
                                            <div className="flex items-center gap-1.5">
                                                <div className="h-px w-5 sm:w-8" style={{ background: 'rgba(201,163,78,0.35)' }} />
                                                <ArrowRight className="w-4 h-4" style={{ color: '#C9A34E' }} />
                                            </div>
                                            <div
                                                className="font-bold tabular-nums text-base"
                                                style={{ fontFamily: 'var(--font-cormorant), Georgia, serif', fontSize: '17px', color: '#8B1A1A' }}
                                            >
                                                {formatMoney(d.amount)}
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <ArrowRight className="w-4 h-4" style={{ color: '#C9A34E' }} />
                                                <div className="h-px w-5 sm:w-8" style={{ background: 'rgba(201,163,78,0.35)' }} />
                                            </div>
                                        </div>

                                        {/* To person */}
                                        <div className="flex items-center gap-2.5 min-w-0 flex-1 justify-end sm:justify-start">
                                            <div
                                                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                                                style={{ background: getAvatarGradient(d.to), color: '#E8D9B8' }}
                                            >
                                                {getInitial(d.to)}
                                            </div>
                                            <span className="font-semibold text-sm truncate" style={{ color: 'rgba(44,24,16,0.8)' }}>
                                                {d.to}
                                            </span>
                                        </div>

                                        {/* Settle button */}
                                        <button
                                            onClick={() => !isLoading && handleSettle(d)}
                                            disabled={isLoading}
                                            className="shrink-0 rounded-lg px-3.5 py-1.5 text-xs font-bold tracking-wide uppercase transition-all duration-200 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                                            style={{
                                                background: isLoading ? 'rgba(139,26,26,0.06)' : 'linear-gradient(135deg, #8B1A1A, #6B0F0F)',
                                                color: isLoading ? 'rgba(44,24,16,0.4)' : '#F5EDD8',
                                                boxShadow: isLoading ? 'none' : '0 2px 8px rgba(139,26,26,0.25)',
                                                letterSpacing: '0.08em',
                                            }}
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
