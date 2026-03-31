import React from 'react';
import { Member } from '@/types/expense';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Banknote } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";

interface Props {
    members: Member[];
    matrixData: {
        matrix: Record<string, Record<string, number>>;
        totals: Record<string, number>;
    };
}

const formatMoney = (amount: number) => amount.toLocaleString('vi-VN');

export default function PrivateMatrix({ members, matrixData }: Props) {
    const { t } = useLanguage();
    const { matrix } = matrixData;
    const [isOpen, setIsOpen] = React.useState(true);

    return (
        <Card className="premium-card overflow-hidden border-none soft-shadow mb-6 group/matrix">
            <CardHeader className="cursor-pointer flex flex-row items-center justify-between pb-5 bg-gradient-to-br from-white dark:from-slate-500/5 via-sky-50/28 dark:via-transparent to-cyan-50/30 dark:to-transparent border-b border-slate-200/70 dark:border-white/[0.06]" onClick={() => setIsOpen(!isOpen)}>
                <CardTitle className="text-lg sm:text-xl flex items-center gap-3 text-slate-800 dark:text-slate-100">
                    <div className="p-2.5 bg-gradient-to-br from-cyan-600 to-blue-600 rounded-xl shadow-lg shadow-cyan-200/40 dark:shadow-cyan-900/20 group-hover/matrix:scale-110 group-hover/matrix:rotate-3 transition-all duration-500 ring-2 ring-white dark:ring-white/10">
                        <Banknote className="w-5 h-5 text-white drop-shadow-sm" />
                    </div>
                    <span className="font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-slate-700 dark:from-slate-200 to-slate-900 dark:to-white">{t('debtMatrixPrivate')}</span>
                </CardTitle>
                <div className={cn("rounded-full p-2 bg-white dark:bg-white/[0.06] shadow-sm text-slate-400 ring-1 ring-slate-200 dark:ring-white/[0.06] transition-transform duration-300 hover:bg-cyan-50 dark:hover:bg-cyan-500/10 hover:text-cyan-600", isOpen && "rotate-180 bg-cyan-100 dark:bg-cyan-500/20 text-cyan-600")}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                    </svg>
                </div>
            </CardHeader>

            {
                isOpen && (
                    <CardContent className="fade-in pt-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="dark:text-slate-300 text-xs">{t('debtor')}</TableHead>
                                        {members.map(m => (
                                            <TableHead key={m.name} className="text-right whitespace-nowrap dark:text-slate-300 text-xs">{t('pays')} {m.name}</TableHead>
                                        ))}
                                        <TableHead className="text-right font-bold text-destructive text-xs">{t('totalDebt')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {members.map((debtor) => {
                                        let totalDebt = 0;
                                        return (
                                            <TableRow key={debtor.name} className="hover:bg-cyan-50/28 dark:hover:bg-cyan-500/6">
                                                <TableCell className="font-medium dark:text-slate-200 py-3">{debtor.name}</TableCell>
                                                {members.map((creditor) => {
                                                    const amount = matrix[creditor.name]?.[debtor.name] || 0;

                                                    if (creditor.name === debtor.name) {
                                                        return <TableCell key={creditor.name} className="bg-muted/50 dark:bg-white/[0.02] py-3" />;
                                                    }

                                                    if (amount > 0) {
                                                        totalDebt += amount;
                                                        return (
                                                            <TableCell key={creditor.name} className="text-right font-bold bg-cyan-50/70 text-cyan-800 dark:bg-cyan-500/10 dark:text-cyan-300 py-3">
                                                                {formatMoney(amount)}
                                                            </TableCell>
                                                        );
                                                    }

                                                    return (
                                                        <TableCell key={creditor.name} className="text-right text-muted-foreground py-3">
                                                            -
                                                        </TableCell>
                                                    );
                                                })}
                                                <TableCell className="text-right font-bold text-destructive py-3">
                                                    {totalDebt > 0 ? formatMoney(totalDebt) : '-'}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                )
            }
        </Card >
    );
}
