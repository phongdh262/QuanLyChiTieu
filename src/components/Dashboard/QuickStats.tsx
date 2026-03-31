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

    const statCards = [
        {
            label: t('totalSpent'),
            value: `${formatMoney(totalSpent)}₫`,
            icon: TrendingUp,
            gradient: 'from-blue-600 to-indigo-600',
            text: 'text-slate-800 dark:text-slate-100',
        },
        {
            label: t('avgPerPerson'),
            value: `${formatMoney(Math.round(avgPerPerson))}₫`,
            icon: Users,
            gradient: 'from-indigo-600 to-sky-600',
            text: 'text-slate-800 dark:text-slate-100',
        },
        {
            label: t('transactionCount'),
            value: transactionCount.toString(),
            icon: Receipt,
            gradient: 'from-cyan-600 to-teal-600',
            text: 'text-slate-800 dark:text-slate-100',
        },
        {
            label: t('sharedPool'),
            value: `${formatMoney(sharedTotal)}₫`,
            icon: ArrowUpRight,
            gradient: 'from-sky-600 to-blue-700',
            text: 'text-slate-800 dark:text-slate-100',
        },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {statCards.map((card, index) => (
                <div
                    key={card.label}
                    className={cn(
                        "relative overflow-hidden rounded-xl p-3.5 sm:p-4 section-enter",
                        "bg-white/95 dark:bg-white/[0.04] border border-slate-200/70 dark:border-white/[0.06]",
                        "hover:shadow-md dark:hover:shadow-lg dark:hover:shadow-black/20 hover:border-slate-300/70 dark:hover:border-white/[0.1] transition-all duration-200",
                        "group cursor-default",
                    )}
                    style={{ animationDelay: `${index * 70}ms` }}
                >
                    <div className={cn("absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-[0.06] dark:opacity-[0.1] blur-2xl bg-gradient-to-br", card.gradient)} />
                    <div className="flex items-start justify-between relative z-10">
                        <div className="space-y-1.5">
                            <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                                {card.label}
                            </p>
                            <p className={cn("text-base sm:text-lg xl:text-xl font-black tracking-tight leading-tight", card.text)}>
                                {card.value}
                            </p>
                        </div>
                        <div className={cn(
                            "p-2 sm:p-2.5 rounded-lg bg-gradient-to-br shadow-md",
                            card.gradient,
                            "group-hover:scale-110 transition-transform duration-300"
                        )}>
                            <card.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
