import React from 'react';
import { Member, CalculationResult } from '@/types/expense';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface Props {
    members: Member[];
    calculations: CalculationResult;
}

const formatMoney = (amount: number) => amount.toLocaleString('vi-VN');

export default function SummaryTable({ members, calculations }: Props) {
    const { balances, stats, privateBalances } = calculations;
    const [isOpen, setIsOpen] = React.useState(true);

    return (
        <Card className="premium-card overflow-hidden border-none soft-shadow mb-6 group/summary">
            <CardHeader className="cursor-pointer flex flex-row items-center justify-between pb-6 bg-gradient-to-br from-indigo-50/50 via-white to-transparent border-b border-indigo-50/50" onClick={() => setIsOpen(!isOpen)}>
                <CardTitle className="text-xl flex items-center gap-3 text-slate-800">
                    <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-100 group-hover/summary:scale-110 group-hover/summary:rotate-3 transition-all duration-500">
                        <span className="text-sm">📊</span>
                    </div>
                    <span className="font-black tracking-tight">Bảng Tổng Kết</span>
                </CardTitle>
                <div className={cn("rounded-full p-2 bg-white shadow-sm text-slate-400 ring-1 ring-slate-100 transition-transform duration-300 hover:bg-indigo-50 hover:text-indigo-600", isOpen && "rotate-180 bg-indigo-100 text-indigo-600")}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                    </svg>
                </div>
            </CardHeader>

            {isOpen && (
                <CardContent className="fade-in pt-0 pb-2">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-slate-50/50">
                                <TableRow>
                                    <TableHead className="font-bold text-slate-700">Thành viên</TableHead>
                                    <TableHead className="text-right font-bold text-slate-700">Tổng Tiền</TableHead>
                                    <TableHead className="text-right font-bold text-slate-700">Dư / Nợ Tiền Ăn Chung</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {members.map((member, index) => {
                                    const m = member.name;
                                    const s = stats[m] || { sharedPaid: 0, totalPaid: 0 };
                                    const bal = balances[m] || 0;
                                    const privateBal = privateBalances[m] || 0;
                                    const sharedBalance = bal - privateBal;

                                    const balText = sharedBalance === 0 ? '-' : (sharedBalance > 0 ? `+${formatMoney(sharedBalance)}` : formatMoney(sharedBalance));
                                    const textClass = sharedBalance > 0 ? 'text-emerald-600 font-bold' : (sharedBalance < 0 ? 'text-rose-500 font-bold' : 'text-slate-400');

                                    return (
                                        <TableRow key={member.id} className={cn("transition-colors hover:bg-indigo-50/30", index % 2 === 0 ? "bg-white" : "bg-slate-50/20")}>
                                            <TableCell className="font-semibold text-slate-700">{member.name}</TableCell>
                                            <TableCell className="text-right font-bold text-slate-600 tabular-nums">{formatMoney(s.sharedPaid)}</TableCell>
                                            <TableCell className={cn("text-right tabular-nums", textClass)}>{balText}</TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            )}
        </Card>
    );
}
