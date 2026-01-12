'use client';

import React from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';
import { CalculationResult, Member } from '@/types/expense';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
);

interface Props {
    members: Member[];
    calculations: CalculationResult;
}

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { BarChart3, PieChart as PieChartIcon } from "lucide-react";

export default function StatisticsSection({ members, calculations }: Props) {
    // ... existing logic ...
    const { stats } = calculations;

    // Calculate Totals manually since they are not in CalculationResult
    const totalShared = Object.values(stats).reduce((acc, curr) => acc + curr.sharedPaid, 0);
    const totalPrivate = Object.values(stats).reduce((acc, curr) => acc + curr.privatePaid, 0);
    const totalExpenses = totalShared + totalPrivate;

    // ... existing chart setup ...
    // 1. Data for Bar Chart: Who paid vs Who consumed
    const barData = {
        labels: members.map(m => m.name),
        datasets: [
            {
                label: 'Đã chi (Paid)',
                data: members.map(m => stats[m.name]?.totalPaid || 0),
                backgroundColor: 'rgba(99, 102, 241, 0.7)', // Indigo
                borderColor: 'rgba(99, 102, 241, 1)',
                borderWidth: 1,
                borderRadius: 4,
            },
            {
                label: 'Sử dụng (Consumed)',
                data: members.map(m => stats[m.name]?.totalConsumed || 0),
                backgroundColor: 'rgba(239, 68, 68, 0.7)', // Red
                borderColor: 'rgba(239, 68, 68, 1)',
                borderWidth: 1,
                borderRadius: 4,
            },
        ],
    };

    const formatCurrency = (val: number) => {
        if (Math.abs(val) >= 1000000) return (val / 1000000).toFixed(1) + ' Tr';
        if (Math.abs(val) >= 1000) return (val / 1000).toFixed(0) + 'k';
        return val.toString();
    };

    const barOptions = {
        responsive: true,
        plugins: {
            legend: { position: 'top' as const },
            tooltip: {
                callbacks: {
                    label: function (context: any) {
                        return context.dataset.label + ': ' + context.parsed.y.toLocaleString('vi-VN') + ' đ';
                    }
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    callback: function (value: any) {
                        return formatCurrency(value);
                    },
                    font: { size: 11 }
                },
                grid: { color: '#f1f5f9' }
            },
            x: {
                grid: { display: false }
            }
        }
    };

    // 2. Data for Pie Chart: Spending Type Breakdown
    const pieData = {
        labels: ['Chi Chung (Shared)', 'Chi Riêng (Private)'],
        datasets: [
            {
                data: [totalShared, totalPrivate],
                backgroundColor: [
                    'rgba(16, 185, 129, 0.7)', // Emerald (Success)
                    'rgba(245, 158, 11, 0.7)', // Amber (Warning)
                ],
                borderColor: [
                    'rgba(16, 185, 129, 1)',
                    'rgba(245, 158, 11, 1)',
                ],
                borderWidth: 1,
            },
        ],
    };

    const pieOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'bottom' as const },
            tooltip: {
                callbacks: {
                    label: function (context: any) {
                        const val = context.parsed;
                        const pct = totalExpenses > 0 ? ((val / totalExpenses) * 100).toFixed(1) : 0;
                        return `${context.label}: ${val.toLocaleString('vi-VN')} đ (${pct}%)`;
                    }
                }
            }
        },
    };

    if (totalExpenses === 0) {
        return null; // Don't show stats if no expenses
    }

    return (
        <Card className="w-full shadow-lg hover:shadow-xl transition-all duration-300 border-t-4 border-t-indigo-500 bg-white overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-indigo-50/50 to-transparent pb-4">
                <CardTitle className="text-xl flex items-center gap-2 text-indigo-700">
                    <BarChart3 className="w-6 h-6" />
                    Thống Kê Tổng Quan
                </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                    {/* Bar Chart Container */}
                    <div className="min-h-[300px] flex justify-center items-center w-full">
                        <Bar options={barOptions} data={barData} />
                    </div>

                    {/* Pie Chart Container */}
                    <div className="h-[300px] flex flex-col items-center justify-center p-4 bg-slate-50/50 rounded-lg border border-slate-100">
                        <div className="w-[280px] h-[280px] relative">
                            <Pie options={pieOptions} data={pieData} />
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
