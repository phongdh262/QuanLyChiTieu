import React from 'react';
import { Member } from '@/types/expense';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface Props {
    members: Member[];
    matrixData: {
        matrix: Record<string, Record<string, number>>;
        totals: Record<string, number>;
    };
}

const formatMoney = (amount: number) => amount.toLocaleString('vi-VN');

export default function PrivateMatrix({ members, matrixData }: Props) {
    const { matrix } = matrixData;
    const [isOpen, setIsOpen] = React.useState(true); // Default open to show "premium" look immediately

    // Logic: Row (Debtor) needs to pay Column (Creditor)
    // matrix[payer][beneficiary] = Amount payer paid for beneficiary.
    // So Beneficiary (Debtor) owes Payer (Creditor).

    return (
        <Card className="premium-card overflow-hidden border-none soft-shadow mb-6 group/matrix">
            <CardHeader className="cursor-pointer flex flex-row items-center justify-between pb-6 bg-gradient-to-br from-orange-50/50 via-white to-transparent border-b border-orange-100/50" onClick={() => setIsOpen(!isOpen)}>
                <CardTitle className="text-xl flex items-center gap-3 text-slate-800">
                    <div className="p-2 bg-gradient-to-br from-orange-500 to-rose-600 rounded-xl shadow-lg shadow-orange-100 group-hover/matrix:scale-110 group-hover/matrix:rotate-3 transition-all duration-500">
                        <span className="text-sm">💸</span>
                    </div>
                    <span className="font-black tracking-tight">Bảng Ghi Nợ (Chi Riêng)</span>
                </CardTitle>
                <div className={cn("rounded-full p-2 bg-white shadow-sm text-slate-400 ring-1 ring-slate-100 transition-transform duration-300 hover:bg-orange-50 hover:text-orange-600", isOpen && "rotate-180 bg-orange-100 text-orange-600")}>
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
                                        <TableHead>Người Nợ</TableHead>
                                        {members.map(m => (
                                            <TableHead key={m.name} className="text-right whitespace-nowrap">Trả cho {m.name}</TableHead>
                                        ))}
                                        <TableHead className="text-right font-bold text-destructive">Tổng Nợ</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {members.map((debtor) => {
                                        let totalDebt = 0;
                                        return (
                                            <TableRow key={debtor.name}>
                                                <TableCell className="font-medium">{debtor.name}</TableCell>
                                                {members.map((creditor) => {
                                                    const amount = matrix[creditor.name]?.[debtor.name] || 0;

                                                    if (creditor.name === debtor.name) {
                                                        return <TableCell key={creditor.name} className="bg-muted/50" />;
                                                    }

                                                    if (amount > 0) {
                                                        totalDebt += amount;
                                                        return (
                                                            <TableCell key={creditor.name} className="text-right font-bold bg-yellow-50 text-yellow-900 dark:bg-yellow-900/20 dark:text-yellow-200">
                                                                {formatMoney(amount)}
                                                            </TableCell>
                                                        );
                                                    }

                                                    return (
                                                        <TableCell key={creditor.name} className="text-right text-muted-foreground">
                                                            -
                                                        </TableCell>
                                                    );
                                                })}
                                                <TableCell className="text-right font-bold text-destructive">
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
