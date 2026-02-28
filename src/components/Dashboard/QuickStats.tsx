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
            gradient: 'from-blue-500 to-indigo-600',
            text: 'text-blue-600 dark:text-blue-400',
            bg: 'bg-blue-50 dark:bg-blue-500/10',
        },
        {
            label: t('avgPerPerson'),
            value: `${formatMoney(Math.round(avgPerPerson))}₫`,
            icon: Users,
            gradient: 'from-violet-500 to-purple-600',
            text: 'text-violet-600 dark:text-violet-400',
            bg: 'bg-violet-50 dark:bg-violet-500/10',
        },
        {
            label: t('transactionCount'),
            value: transactionCount.toString(),
            icon: Receipt,
            gradient: 'from-emerald-500 to-green-600',
            text: 'text-emerald-600 dark:text-emerald-400',
            bg: 'bg-emerald-50 dark:bg-emerald-500/10',
        },
        {
            label: t('sharedPool'),
            value: `${formatMoney(sharedTotal)}₫`,
            icon: ArrowUpRight,
            gradient: 'from-amber-500 to-orange-600',
            text: 'text-amber-600 dark:text-amber-400',
            bg: 'bg-amber-50 dark:bg-amber-500/10',
        },
    ];

    return (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            {statCards.map((card) => (
                <div
                    key={card.label}
                    className={cn(
                        "relative overflow-hidden rounded-xl p-4",
                        "bg-white dark:bg-white/[0.04] border border-slate-100/80 dark:border-white/[0.06]",
                        "hover:shadow-md dark:hover:shadow-lg dark:hover:shadow-black/20 hover:border-slate-200 dark:hover:border-white/[0.1] transition-all duration-200",
                        "group cursor-default",
                    )}
                >
                    <div className={cn("absolute -top-4 -right-4 w-20 h-20 rounded-full opacity-[0.06] dark:opacity-[0.1] blur-2xl bg-gradient-to-br", card.gradient)} />
                    <div className="flex items-start justify-between relative z-10">
                        <div className="space-y-1">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                {card.label}
                            </p>
                            <p className={cn("text-lg xl:text-xl font-black tracking-tight", card.text)}>
                                {card.value}
                            </p>
                        </div>
                        <div className={cn(
                            "p-2 rounded-lg bg-gradient-to-br shadow-md",
                            card.gradient,
                            "group-hover:scale-110 transition-transform duration-300"
                        )}>
                            <card.icon className="w-3.5 h-3.5 text-white" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
