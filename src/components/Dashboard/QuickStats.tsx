'use client';

import React from 'react';
import { CalculationResult, Member, Bill } from '@/types/expense';
import { TrendingUp, Users, Receipt, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/components/LanguageProvider';
import { useTheme } from '@/components/ThemeProvider';

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
        iconBg: 'linear-gradient(135deg, #2563EB 0%, #0EA5E9 100%)',
        accentColor: '#1D4ED8',
        accentColorDark: '#60A5FA',
        shadowColor: 'rgba(37, 99, 235, 0.16)',
    },
    {
        key: 'avgPerPerson',
        icon: Users,
        iconBg: 'linear-gradient(135deg, #0F766E 0%, #14B8A6 100%)',
        accentColor: '#0F766E',
        accentColorDark: '#2DD4BF',
        shadowColor: 'rgba(15, 118, 110, 0.14)',
    },
    {
        key: 'transactionCount',
        icon: Receipt,
        iconBg: 'linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)',
        accentColor: '#7C3AED',
        accentColorDark: '#C4B5FD',
        shadowColor: 'rgba(124, 58, 237, 0.15)',
    },
    {
        key: 'sharedPool',
        icon: ArrowUpRight,
        iconBg: 'linear-gradient(135deg, #EA580C 0%, #F97316 100%)',
        accentColor: '#C2410C',
        accentColorDark: '#FDBA74',
        shadowColor: 'rgba(234, 88, 12, 0.14)',
    },
];

export default function QuickStats({ members, calculations, bills }: Props) {
    const { t } = useLanguage();
    const { theme } = useTheme();
    const isDark = theme === 'dark';
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
                            background: isDark
                                ? "linear-gradient(160deg, hsl(228, 26%, 14%) 0%, hsl(228, 24%, 11%) 100%)"
                                : "linear-gradient(160deg, hsl(0, 0%, 100%) 0%, hsl(210, 84%, 97%) 100%)",
                            borderColor: isDark ? "rgba(148, 163, 184, 0.22)" : "rgba(148, 163, 184, 0.3)",
                            boxShadow: isDark
                                ? `0 6px 24px rgba(2, 6, 23, 0.38), 0 1px 4px rgba(2, 6, 23, 0.25)`
                                : `0 8px 24px ${card.shadowColor}, 0 2px 6px rgba(15, 23, 42, 0.06)`,
                            animationDelay: `${index * 70}ms`,
                        }}
                        onMouseEnter={e => {
                            (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
                            (e.currentTarget as HTMLDivElement).style.boxShadow =
                                isDark
                                    ? "0 10px 32px rgba(2, 6, 23, 0.5), 0 2px 8px rgba(2, 6, 23, 0.3)"
                                    : `0 12px 30px ${card.shadowColor.replace('0.16', '0.22').replace('0.15', '0.2').replace('0.14', '0.19')}, 0 3px 8px rgba(15, 23, 42, 0.08)`;
                        }}
                        onMouseLeave={e => {
                            (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
                            (e.currentTarget as HTMLDivElement).style.boxShadow =
                                isDark
                                    ? "0 6px 24px rgba(2, 6, 23, 0.38), 0 1px 4px rgba(2, 6, 23, 0.25)"
                                    : `0 8px 24px ${card.shadowColor}, 0 2px 6px rgba(15, 23, 42, 0.06)`;
                        }}
                    >
                        {/* Dong Son watermark in corner */}
                        <DongSonAccent
                            className="absolute -bottom-7 -right-7 transition-opacity duration-300 group-hover:opacity-[0.07]"
                            rings={4}
                            style={{ color: isDark ? card.accentColorDark : card.accentColor, opacity: isDark ? 0.08 : 0.045 } as React.CSSProperties}
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
                                    style={{ color: isDark ? "rgba(203, 213, 225, 0.65)" : "rgba(51, 65, 85, 0.58)" }}
                                >
                                    {label}
                                </p>
                                <p
                                    className="text-xl sm:text-2xl font-bold tracking-tight leading-tight text-foreground truncate"
                                    style={{
                                        fontFamily: "var(--font-cormorant), Georgia, serif",
                                        fontWeight: 700,
                                        color: isDark ? "rgba(241, 245, 249, 0.96)" : "rgba(15, 23, 42, 0.95)",
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
                                    boxShadow: isDark
                                        ? "0 4px 14px rgba(2, 6, 23, 0.45)"
                                        : `0 4px 14px ${card.shadowColor.replace('0.16', '0.3').replace('0.15', '0.28').replace('0.14', '0.26')}`,
                                }}
                            >
                                <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: "#FFFFFF" }} />
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
