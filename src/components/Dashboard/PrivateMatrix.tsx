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
            <CardHeader className="cursor-pointer flex flex-row items-center justify-between pb-5 border-b border-border/60" onClick={() => setIsOpen(!isOpen)}>
                <CardTitle className="text-lg sm:text-xl flex items-center gap-3">
                    <div className="p-2.5 rounded-lg group-hover/matrix:scale-110 group-hover/matrix:rotate-3 transition-all duration-500" style={{ background: 'linear-gradient(135deg, #8B1A1A, #6B0F0F)', boxShadow: '0 4px 14px rgba(139,26,26,0.3)' }}>
                        <Banknote className="w-5 h-5 drop-shadow-sm" style={{ color: '#F5EDD8' }} />
                    </div>
                    <span className="font-bold tracking-tight" style={{ fontFamily: 'var(--font-cormorant), Georgia, serif', fontSize: '20px', color: 'rgba(44,24,16,0.85)' }}>{t('debtMatrixPrivate')}</span>
                </CardTitle>
                <div className={cn("rounded-full p-2 shadow-sm ring-1 transition-all duration-300", isOpen ? "rotate-180" : "")} style={{ background: 'rgba(139,26,26,0.06)', color: 'rgba(44,24,16,0.45)', borderColor: 'rgba(139,26,26,0.12)' }}>
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
                                            <TableRow
                                        key={debtor.name}
                                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(201,163,78,0.07)')}
                                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                    >
                                                <TableCell className="font-medium py-3" style={{ color: 'rgba(44,24,16,0.8)' }}>{debtor.name}</TableCell>
                                                {members.map((creditor) => {
                                                    const amount = matrix[creditor.name]?.[debtor.name] || 0;

                                                    if (creditor.name === debtor.name) {
                                                        return <TableCell key={creditor.name} className="bg-muted/50 dark:bg-white/[0.02] py-3" />;
                                                    }

                                                    if (amount > 0) {
                                                        totalDebt += amount;
                                                        return (
                                                            <TableCell key={creditor.name} className="text-right font-bold py-3" style={{ background: 'rgba(139,26,26,0.06)', color: '#8B1A1A', fontFamily: 'var(--font-cormorant), Georgia, serif', fontSize: '15px' }}>
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
