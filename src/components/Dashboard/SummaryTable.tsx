import React from 'react';
import { Member, CalculationResult } from '@/types/expense';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Wallet } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";

interface Props {
    members: Member[];
    calculations: CalculationResult;
}

const formatMoney = (amount: number) => amount.toLocaleString('vi-VN');

export default function SummaryTable({ members, calculations }: Props) {
    const { t } = useLanguage();
    const { balances, stats, privateBalances } = calculations;
    const [isOpen, setIsOpen] = React.useState(true);

    return (
        <Card className="premium-card overflow-hidden border-none soft-shadow mb-6 group/summary">
            <CardHeader className="cursor-pointer flex flex-row items-center justify-between pb-5 border-b border-border/60" onClick={() => setIsOpen(!isOpen)}>
                <CardTitle className="text-lg sm:text-xl flex items-center gap-3 text-foreground">
                    <div className="p-2.5 rounded-lg group-hover/summary:scale-110 group-hover/summary:rotate-3 transition-all duration-500" style={{ background: "linear-gradient(135deg, #8B1A1A, #6B0F0F)", boxShadow: "0 4px 14px rgba(139, 26, 26, 0.3)" }}>
                        <Wallet className="w-5 h-5 drop-shadow-sm" style={{ color: "#F5EDD8" }} />
                    </div>
                    <span className="font-bold tracking-tight" style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "20px", color: "rgba(44, 24, 16, 0.85)" }}>{t('expensesSummary')}</span>
                </CardTitle>
                <div className={cn("rounded-full p-2 shadow-sm ring-1 transition-all duration-300", isOpen ? "rotate-180" : "")} style={{ background: "rgba(139, 26, 26, 0.06)", color: "rgba(44, 24, 16, 0.45)", borderColor: "rgba(139, 26, 26, 0.12)" }}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                    </svg>
                </div>
            </CardHeader>

            {isOpen && (
                <CardContent className="fade-in pt-0 pb-2">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader style={{ background: 'rgba(201,163,78,0.06)' }}>
                                <TableRow>
                                    <TableHead className="font-bold text-xs uppercase tracking-widest" style={{ color: 'rgba(44,24,16,0.5)', letterSpacing: '0.14em' }}>{t('member')}</TableHead>
                                    <TableHead className="text-right font-bold text-xs uppercase tracking-widest" style={{ color: 'rgba(44,24,16,0.5)', letterSpacing: '0.14em' }}>{t('totalPaid')}</TableHead>
                                    <TableHead className="text-right font-bold text-xs uppercase tracking-widest" style={{ color: 'rgba(44,24,16,0.5)', letterSpacing: '0.14em' }}>{t('netBalanceShared')}</TableHead>
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
                                    const balStyle = sharedBalance > 0
                                        ? { color: '#2E7D55', fontWeight: 700 }
                                        : sharedBalance < 0
                                            ? { color: '#C0392B', fontWeight: 700 }
                                            : { color: 'rgba(44,24,16,0.3)' };

                                    return (
                                        <TableRow
                                            key={member.id}
                                            className="transition-colors"
                                            style={{
                                                background: index % 2 === 0 ? 'transparent' : 'rgba(201,163,78,0.03)',
                                            }}
                                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(201,163,78,0.07)')}
                                            onMouseLeave={e => (e.currentTarget.style.background = index % 2 === 0 ? 'transparent' : 'rgba(201,163,78,0.03)')}
                                        >
                                            <TableCell className="font-semibold py-3" style={{ color: 'rgba(44,24,16,0.8)' }}>{member.name}</TableCell>
                                            <TableCell
                                                className="text-right font-bold tabular-nums py-3"
                                                style={{ fontFamily: 'var(--font-cormorant), Georgia, serif', fontSize: '15px', color: 'rgba(44,24,16,0.7)' }}
                                            >
                                                {formatMoney(s.sharedPaid)}
                                            </TableCell>
                                            <TableCell
                                                className="text-right tabular-nums py-3"
                                                style={{ fontFamily: 'var(--font-cormorant), Georgia, serif', fontSize: '15px', ...balStyle }}
                                            >
                                                {balText}
                                            </TableCell>
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
