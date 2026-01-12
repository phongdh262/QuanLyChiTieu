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
    const [isOpen, setIsOpen] = React.useState(false);

    return (
        <Card>
            <CardHeader className="cursor-pointer flex flex-row items-center justify-between space-y-0 pb-2" onClick={() => setIsOpen(!isOpen)}>
                <CardTitle className="text-xl flex items-center gap-2">
                    <span>📊</span> Bảng Tổng Kết
                </CardTitle>
                <div className={cn("rounded-full p-2 bg-secondary text-muted-foreground transition-transform duration-200", isOpen && "rotate-180 bg-primary/10 text-primary")}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                    </svg>
                </div>
            </CardHeader>

            {isOpen && (
                <CardContent className="fade-in pt-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Thành viên</TableHead>
                                <TableHead className="text-right">Tổng Tiền</TableHead>
                                <TableHead className="text-right">Dư / Nợ Tiền Ăn Chung</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {members.map(member => {
                                const m = member.name;
                                const s = stats[m] || { sharedPaid: 0, totalPaid: 0 };
                                const bal = balances[m] || 0;
                                const privateBal = privateBalances[m] || 0;
                                const sharedBalance = bal - privateBal;

                                const balText = sharedBalance === 0 ? '-' : (sharedBalance > 0 ? `+${formatMoney(sharedBalance)}` : formatMoney(sharedBalance));
                                const textClass = sharedBalance > 0 ? 'text-green-600 font-bold' : (sharedBalance < 0 ? 'text-red-500 font-bold' : '');

                                return (
                                    <TableRow key={member.id}>
                                        <TableCell className="font-medium">{member.name}</TableCell>
                                        <TableCell className="text-right font-bold">{formatMoney(s.sharedPaid)}</TableCell>
                                        <TableCell className={cn("text-right", textClass)}>{balText}</TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            )}
        </Card>
    );
}
