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

export default function StatisticsSection({ members, calculations }: Props) {
    const { stats } = calculations;

    // Calculate Totals manually since they are not in CalculationResult
    const totalShared = Object.values(stats).reduce((acc, curr) => acc + curr.sharedPaid, 0);
    const totalPrivate = Object.values(stats).reduce((acc, curr) => acc + curr.privatePaid, 0);
    const totalExpenses = totalShared + totalPrivate;

    // 1. Data for Bar Chart: Who paid vs Who consumed
    const barData = {
        labels: members.map(m => m.name),
        datasets: [
            {
                label: 'Đã chi (Paid)',
                data: members.map(m => stats[m.id]?.totalPaid || 0),
                backgroundColor: 'rgba(99, 102, 241, 0.7)', // Indigo
                borderColor: 'rgba(99, 102, 241, 1)',
                borderWidth: 1,
                borderRadius: 4,
            },
            {
                label: 'Sử dụng (Consumed)',
                data: members.map(m => stats[m.id]?.totalConsumed || 0),
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
        <div className="card" style={{ marginBottom: '2rem' }}>
            <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>📊</span> Thống Kê Tổng Quan
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                {/* Bar Chart Container */}
                <div style={{ minHeight: '300px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <Bar options={barOptions} data={barData} />
                </div>

                {/* Pie Chart Container */}
                <div style={{ height: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: '250px', height: '250px', position: 'relative' }}>
                        <Pie options={pieOptions} data={pieData} />
                    </div>
                </div>
            </div>
        </div>
    );
}
