'use client';

import React from 'react';
import { CalculationResult, Member, Bill } from '@/types/expense';
import { TrendingUp, Users, Receipt, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
    members: Member[];
    calculations: CalculationResult;
    bills: Bill[];
}

const formatMoney = (amount: number) => amount.toLocaleString('vi-VN');

export default function QuickStats({ members, calculations, bills }: Props) {
    const { stats } = calculations;
    const memberNames = members.map(m => m.name);

    // Total spent this month
    const totalSpent = memberNames.reduce((sum, name) => {
        const s = stats[name];
        return sum + (s?.totalPaid || 0);
    }, 0);

    // Average per person
    const avgPerPerson = members.length > 0 ? totalSpent / members.length : 0;

    // Transaction count
    const transactionCount = bills.length;

    // Shared total
    const sharedTotal = memberNames.reduce((sum, name) => {
        const s = stats[name];
        return sum + (s?.sharedPaid || 0);
    }, 0);

    const statCards = [
        {
            label: 'Total Spent',
            value: `${formatMoney(totalSpent)}₫`,
            icon: TrendingUp,
            color: 'from-blue-500 to-indigo-600',
            bgColor: 'bg-blue-50',
            textColor: 'text-blue-700',
            ringColor: 'ring-blue-100',
        },
        {
            label: 'Avg / Person',
            value: `${formatMoney(Math.round(avgPerPerson))}₫`,
            icon: Users,
            color: 'from-violet-500 to-purple-600',
            bgColor: 'bg-violet-50',
            textColor: 'text-violet-700',
            ringColor: 'ring-violet-100',
        },
        {
            label: 'Transactions',
            value: transactionCount.toString(),
            icon: Receipt,
            color: 'from-emerald-500 to-green-600',
            bgColor: 'bg-emerald-50',
            textColor: 'text-emerald-700',
            ringColor: 'ring-emerald-100',
        },
        {
            label: 'Shared Pool',
            value: `${formatMoney(sharedTotal)}₫`,
            icon: ArrowUpRight,
            color: 'from-amber-500 to-orange-600',
            bgColor: 'bg-amber-50',
            textColor: 'text-amber-700',
            ringColor: 'ring-amber-100',
        },
    ];

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((card, i) => (
                <div
                    key={card.label}
                    className={cn(
                        "relative overflow-hidden rounded-2xl p-4 sm:p-5",
                        "bg-white border border-slate-100 shadow-sm",
                        "hover:shadow-lg hover:border-slate-200 transition-all duration-300",
                        "group cursor-default",
                        "animate-in fade-in slide-in-from-bottom-2",
                    )}
                    style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'both' }}
                >
                    {/* Background gradient accent */}
                    <div className={cn(
                        "absolute top-0 right-0 w-24 h-24 rounded-full opacity-[0.07] blur-2xl",
                        `bg-gradient-to-br ${card.color}`,
                        "group-hover:opacity-[0.15] group-hover:scale-125 transition-all duration-500"
                    )} />

                    <div className="flex items-start justify-between relative z-10">
                        <div className="space-y-2">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                {card.label}
                            </p>
                            <p className={cn(
                                "text-xl sm:text-2xl font-black tracking-tight",
                                card.textColor
                            )}>
                                {card.value}
                            </p>
                        </div>
                        <div className={cn(
                            "p-2.5 rounded-xl bg-gradient-to-br shadow-lg",
                            card.color,
                            "group-hover:scale-110 group-hover:rotate-3 transition-all duration-500"
                        )}>
                            <card.icon className="w-4 h-4 text-white" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
