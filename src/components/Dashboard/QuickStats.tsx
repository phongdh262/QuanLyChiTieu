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
            label: 'TỔNG CHI',
            value: `${formatMoney(totalSpent)}₫`,
            icon: TrendingUp,
            gradient: 'from-blue-500 to-indigo-600',
            text: 'text-blue-600',
            bg: 'bg-blue-50',
        },
        {
            label: 'BÌNH QUÂN',
            value: `${formatMoney(Math.round(avgPerPerson))}₫`,
            icon: Users,
            gradient: 'from-violet-500 to-purple-600',
            text: 'text-violet-600',
            bg: 'bg-violet-50',
        },
        {
            label: 'SỐ GIAO DỊCH',
            value: transactionCount.toString(),
            icon: Receipt,
            gradient: 'from-emerald-500 to-green-600',
            text: 'text-emerald-600',
            bg: 'bg-emerald-50',
        },
        {
            label: 'SHARED POOL',
            value: `${formatMoney(sharedTotal)}₫`,
            icon: ArrowUpRight,
            gradient: 'from-amber-500 to-orange-600',
            text: 'text-amber-600',
            bg: 'bg-amber-50',
        },
    ];

    return (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            {statCards.map((card) => (
                <div
                    key={card.label}
                    className={cn(
                        "relative overflow-hidden rounded-xl p-4",
                        "bg-white border border-slate-100/80",
                        "hover:shadow-md hover:border-slate-200 transition-all duration-200",
                        "group cursor-default",
                    )}
                >
                    <div className={cn("absolute -top-4 -right-4 w-20 h-20 rounded-full opacity-[0.06] blur-2xl bg-gradient-to-br", card.gradient)} />
                    <div className="flex items-start justify-between relative z-10">
                        <div className="space-y-1">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
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
