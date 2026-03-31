'use client';

import React from 'react';
import { CalculationResult, Member, Bill } from '@/types/expense';
import { TrendingUp, Users, Receipt, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/components/LanguageProvider';

interface Props {
    members: Member[];
    calculations: CalculationResult;
    bills: Bill[];
}

const formatMoney = (amount: number) => amount.toLocaleString('vi-VN');

/* Dong Son concentric circle decoration — subtle watermark in card corner */
const DongSonAccent = ({
    className,
    rings = 4,
    style,
}: {
    className?: string;
    rings?: number;
    style?: React.CSSProperties;
}) => (
    <svg
        width="72" height="72" viewBox="0 0 72 72" fill="none"
        className={className}
        style={style}
        aria-hidden="true"
    >
        {Array.from({ length: rings }).map((_, i) => (
            <circle
                key={i}
                cx="36" cy="36"
                r={8 + i * 8}
                stroke="currentColor"
                strokeWidth={i === 0 ? 0.7 : 0.5}
                fill="none"
            />
        ))}
        {/* 8 equidistant dots on the second ring */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => {
            const a = (deg * Math.PI) / 180;
            return (
                <circle
                    key={i}
                    cx={36 + 16 * Math.cos(a)}
                    cy={36 + 16 * Math.sin(a)}
                    r="1.3"
                    fill="currentColor"
                    opacity="0.6"
                />
            );
        })}
        {/* Center sun */}
        <circle cx="36" cy="36" r="3.5" fill="currentColor" opacity="0.5" />
    </svg>
);

const statCards = [
    {
        key: 'totalSpent',
        icon: TrendingUp,
        iconBg: 'linear-gradient(135deg, #8B1A1A 0%, #6B0F0F 100%)',
        accentColor: '#8B1A1A',
        accentColorDark: '#C9A34E',
        shadowColor: 'rgba(139, 26, 26, 0.12)',
    },
    {
        key: 'avgPerPerson',
        icon: Users,
        iconBg: 'linear-gradient(135deg, #7A1A1A 0%, #5C0F0F 100%)',
        accentColor: '#7A1A1A',
        accentColorDark: '#C4963E',
        shadowColor: 'rgba(122, 26, 26, 0.1)',
    },
    {
        key: 'transactionCount',
        icon: Receipt,
        iconBg: 'linear-gradient(135deg, #8B3414 0%, #6B260D 100%)',
        accentColor: '#8B3414',
        accentColorDark: '#D4A060',
        shadowColor: 'rgba(139, 52, 20, 0.1)',
    },
    {
        key: 'sharedPool',
        icon: ArrowUpRight,
        iconBg: 'linear-gradient(135deg, #B08D40 0%, #8A6C28 100%)',
        accentColor: '#9A7830',
        accentColorDark: '#C9A34E',
        shadowColor: 'rgba(176, 141, 64, 0.1)',
    },
];

export default function QuickStats({ members, calculations, bills }: Props) {
    const { t } = useLanguage();
    const { stats } = calculations;
    const memberNames = members.map(m => m.name);

    const totalSpent = memberNames.reduce((sum, name) => {
        const s = stats[name];
        return sum + (s?.totalPaid || 0);
    }, 0);

    const avgPerPerson = members.length > 0 ? totalSpent / members.length : 0;
    const transactionCount = bills.length;
    const sharedTotal = memberNames.reduce((sum, name) => {
        const s = stats[name];
        return sum + (s?.sharedPaid || 0);
    }, 0);

    const values = {
        totalSpent: `${formatMoney(totalSpent)}₫`,
        avgPerPerson: `${formatMoney(Math.round(avgPerPerson))}₫`,
        transactionCount: transactionCount.toString(),
        sharedPool: `${formatMoney(sharedTotal)}₫`,
    };

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {statCards.map((card, index) => {
                const Icon = card.icon;
                const label = t(card.key as Parameters<typeof t>[0]);
                const value = values[card.key as keyof typeof values];

                return (
                    <div
                        key={card.key}
                        className={cn(
                            "relative overflow-hidden rounded-[var(--radius)] p-4 sm:p-4.5 section-enter",
                            "border transition-all duration-300 cursor-default group",
                        )}
                        style={{
                            background: "linear-gradient(160deg, hsl(40, 52%, 99%) 0%, hsl(38, 40%, 95%) 100%)",
                            borderColor: "rgba(201, 163, 78, 0.22)",
                            boxShadow: `0 4px 20px ${card.shadowColor}, 0 1px 4px rgba(44, 24, 16, 0.04)`,
                            animationDelay: `${index * 70}ms`,
                        }}
                        onMouseEnter={e => {
                            (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
                            (e.currentTarget as HTMLDivElement).style.boxShadow =
                                `0 10px 32px ${card.shadowColor.replace('0.12', '0.18').replace('0.1', '0.15')}, 0 2px 8px rgba(44, 24, 16, 0.06)`;
                        }}
                        onMouseLeave={e => {
                            (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
                            (e.currentTarget as HTMLDivElement).style.boxShadow =
                                `0 4px 20px ${card.shadowColor}, 0 1px 4px rgba(44, 24, 16, 0.04)`;
                        }}
                    >
                        {/* Dark mode override */}
                        <style>{`
                            .dark .qs-card-${card.key} {
                                background: linear-gradient(160deg, hsl(10, 52%, 10%) 0%, hsl(9, 55%, 7%) 100%) !important;
                                border-color: rgba(201, 163, 78, 0.12) !important;
                            }
                        `}</style>

                        {/* Dong Son watermark in corner */}
                        <DongSonAccent
                            className="absolute -bottom-7 -right-7 transition-opacity duration-300 group-hover:opacity-[0.07]"
                            rings={4}
                            style={{ color: card.accentColor, opacity: 0.045 } as React.CSSProperties}
                        />

                        {/* Top thin accent line */}
                        <div
                            className="absolute top-0 left-6 right-6 h-[1.5px] rounded-full opacity-30"
                            style={{ background: `linear-gradient(90deg, transparent, ${card.accentColor}, transparent)` }}
                        />

                        <div className="flex items-start justify-between relative z-10">
                            <div className="space-y-1.5 flex-1 min-w-0 pr-2">
                                <p
                                    className="text-[10px] font-bold uppercase tracking-[0.2em]"
                                    style={{ color: "rgba(44, 24, 16, 0.42)" }}
                                >
                                    {label}
                                </p>
                                <p
                                    className="text-xl sm:text-2xl font-bold tracking-tight leading-tight text-foreground truncate"
                                    style={{
                                        fontFamily: "var(--font-cormorant), Georgia, serif",
                                        fontWeight: 700,
                                        color: "rgba(44, 24, 16, 0.85)",
                                    }}
                                >
                                    {value}
                                </p>
                            </div>

                            {/* Icon container */}
                            <div
                                className="p-2 sm:p-2.5 rounded-lg shadow-sm shrink-0 group-hover:scale-110 transition-transform duration-300"
                                style={{
                                    background: card.iconBg,
                                    boxShadow: `0 4px 12px ${card.shadowColor.replace('0.12', '0.35').replace('0.1', '0.3')}`,
                                }}
                            >
                                <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: "#F5EDD8" }} />
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
