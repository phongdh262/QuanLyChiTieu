import React from 'react';
import { Member } from '@/types/expense';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ArrowRightCircle, Wallet } from 'lucide-react';

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
        <Card className="shadow-lg border-t-4 border-t-orange-500 overflow-hidden mb-6 transition-all hover:shadow-xl">
            <CardHeader className="cursor-pointer flex flex-row items-center justify-between space-y-0 pb-4 bg-orange-50/30" onClick={() => setIsOpen(!isOpen)}>
                <CardTitle className="text-xl flex items-center gap-2">
                    <span>💸</span> Bảng Ghi Nợ (Chi Riêng)
                </CardTitle>
                <div className={cn("rounded-full p-2 bg-secondary text-muted-foreground transition-transform duration-200", isOpen && "rotate-180 bg-primary/10 text-primary")}>
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
