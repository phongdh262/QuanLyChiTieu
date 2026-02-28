'use client';
import React, { useState } from 'react';
import { useToast } from '@/components/ui/ToastProvider';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PlusCircle, Wallet, Calendar as CalendarIcon, Users, Calculator, Check, CheckCircle2, Lock, Trash2, Plus, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

// Quick inline Label component to avoid module not found error if not created yet
function Label({ children, className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
    return <label className={cn("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground/90", className)} {...props}>{children}</label>
}

interface Props {
    members: { id: number; name: string, status?: string }[];
    sheetId: number;
    onAdd: () => void;
    initialData?: {
        amount: number;
        description: string;
        payerId: number;
        type: 'SHARED' | 'PRIVATE';
        beneficiaryIds?: number[];
    } | null;
    onOptimisticAdd?: (data: any) => void;
    isLocked?: boolean;
}

interface ExpenseRow {
    id: string; // unique key for React
    description: string;
    amount: string;
    date: Date | undefined;
    payerId: string;
    type: 'SHARED' | 'PRIVATE';
    beneficiaryIds: string[];
}

const MAX_ROWS = 10;

let rowCounter = 0;
function generateRowId(): string {
    return `row-${Date.now()}-${++rowCounter}-${Math.random().toString(36).slice(2, 8)}`;
}

function createEmptyRow(defaultPayerId: string): ExpenseRow {
    return {
        id: generateRowId(),
        description: '',
        amount: '',
        date: new Date(),
        payerId: defaultPayerId,
        type: 'SHARED',
        beneficiaryIds: [],
    };
}

function formatAmount(value: string): string {
    const clean = value.replace(/\D/g, '');
    if (clean === '') return '';
    return parseInt(clean).toLocaleString('vi-VN');
}

export default function AddBillForm({ members, sheetId, onAdd, initialData, onOptimisticAdd, isLocked }: Props) {
    const { addToast } = useToast();
    const [currentUser, setCurrentUser] = useState<{ id: number; name: string } | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const activeMembers = members.filter(m => m.status !== 'DELETED');

    // Default payer ID
    const getDefaultPayerId = () => {
        if (currentUser) {
            const me = activeMembers.find(m => m.id === currentUser.id);
            if (me) return me.id.toString();
        }
        return activeMembers.length > 0 ? activeMembers[0].id.toString() : '';
    };

    const [rows, setRows] = useState<ExpenseRow[]>([createEmptyRow('')]);

    // Fetch current user
    React.useEffect(() => {
        fetch('/api/auth/me')
            .then(res => res.json())
            .then(data => {
                if (data.user) setCurrentUser(data.user);
            })
            .catch(console.error);
    }, []);

    // Set default payer when currentUser loads
    React.useEffect(() => {
        if (activeMembers.length > 0 && currentUser) {
            const defaultId = getDefaultPayerId();
            setRows(prev => prev.map(row =>
                row.payerId === '' ? { ...row, payerId: defaultId } : row
            ));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeMembers, currentUser]);

    // Handle initialData (duplication)
    React.useEffect(() => {
        if (initialData) {
            setRows([{
                id: generateRowId(),
                description: initialData.description,
                amount: initialData.amount.toString(),
                date: new Date(),
                payerId: initialData.payerId.toString(),
                type: initialData.type,
                beneficiaryIds: initialData.beneficiaryIds?.map(String) || [],
            }]);
            const formElement = document.getElementById('add-bill-form');
            if (formElement) formElement.scrollIntoView({ behavior: 'smooth' });
            addToast('Bill info copied!', 'info');
        }
    }, [initialData, addToast]);

    // Row operations
    const addRow = () => {
        if (rows.length >= MAX_ROWS) {
            addToast(`Tối đa ${MAX_ROWS} khoản chi mỗi lần`, 'warning');
            return;
        }
        setRows(prev => [...prev, createEmptyRow(getDefaultPayerId())]);
    };

    const removeRow = (rowId: string) => {
        if (rows.length <= 1) return;
        setRows(prev => prev.filter(r => r.id !== rowId));
    };

    const updateRow = (rowId: string, field: keyof ExpenseRow, value: any) => {
        setRows(prev => prev.map(r => r.id === rowId ? { ...r, [field]: value } : r));
    };

    const toggleBeneficiary = (rowId: string, memberId: string) => {
        setRows(prev => prev.map(r => {
            if (r.id !== rowId) return r;
            const ids = r.beneficiaryIds.includes(memberId)
                ? r.beneficiaryIds.filter(x => x !== memberId)
                : [...r.beneficiaryIds, memberId];
            return { ...r, beneficiaryIds: ids };
        }));
    };

    const handleAmountChange = (rowId: string, e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '');
        updateRow(rowId, 'amount', value === '' ? '' : formatAmount(value));
    };

    // Submit
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;

        // Validate all rows
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            if (!row.description || !row.amount || !row.payerId) {
                addToast(`Dòng ${i + 1}: Vui lòng điền đầy đủ thông tin`, 'warning');
                return;
            }
            if (row.type === 'PRIVATE' && row.beneficiaryIds.length === 0) {
                addToast(`Dòng ${i + 1}: Vui lòng chọn người thụ hưởng`, 'warning');
                return;
            }
        }

        setIsSubmitting(true);

        // Optimistic update for all rows
        if (onOptimisticAdd) {
            for (const row of rows) {
                const payerName = members.find(m => m.id === parseInt(row.payerId))?.name || 'Unknown';
                const beneficiaryNames = row.beneficiaryIds.map(id => members.find(m => m.id === parseInt(id))?.name || 'Unknown');
                onOptimisticAdd({
                    id: Date.now() + Math.random(),
                    amount: parseFloat(row.amount.replace(/\./g, '')),
                    payer: payerName,
                    type: row.type,
                    beneficiaries: row.type === 'PRIVATE' ? beneficiaryNames : members.map(m => m.name),
                    note: row.description,
                    date: row.date ? row.date.toISOString() : new Date().toISOString()
                });
            }
        }

        try {
            if (rows.length === 1) {
                // Single expense — use original endpoint
                const row = rows[0];
                const res = await fetch('/api/expenses', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sheetId,
                        payerId: parseInt(row.payerId),
                        amount: parseInt(row.amount.replace(/\./g, '')),
                        description: row.description,
                        type: row.type,
                        date: row.date ? row.date.toISOString() : undefined,
                        beneficiaryIds: row.type === 'PRIVATE' ? row.beneficiaryIds.map(id => parseInt(id)) : []
                    }),
                });
                if (!res.ok) throw new Error('Failed to add expense');
                addToast('Đã thêm khoản chi! ✅', 'success');
            } else {
                // Batch — use new endpoint
                const res = await fetch('/api/expenses/batch', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        expenses: rows.map(row => ({
                            sheetId,
                            payerId: parseInt(row.payerId),
                            amount: parseInt(row.amount.replace(/\./g, '')),
                            description: row.description,
                            type: row.type,
                            date: row.date ? row.date.toISOString() : undefined,
                            beneficiaryIds: row.type === 'PRIVATE' ? row.beneficiaryIds.map(id => parseInt(id)) : []
                        }))
                    }),
                });
                if (!res.ok) throw new Error('Failed to add batch expenses');
                const data = await res.json();
                addToast(`Đã thêm ${data.count} khoản chi! ✅`, 'success');
            }

            // Reset to single empty row
            setRows([createEmptyRow(getDefaultPayerId())]);
            onAdd();
        } catch (error) {
            console.error(error);
            addToast('Lỗi khi thêm khoản chi', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const isBatch = rows.length > 1;

    return (
        <Card className="w-full premium-card overflow-hidden border-none soft-shadow" id="add-bill-form">
            <CardHeader className="bg-gradient-to-br from-indigo-50/80 via-white to-emerald-50/50 pb-4 border-b border-indigo-50/50">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-xl flex items-center gap-3 text-slate-800">
                        <div className="p-2.5 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg shadow-green-200/50 ring-2 ring-white">
                            <PlusCircle className="w-5 h-5 text-white drop-shadow-sm" />
                        </div>
                        <span className="font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-slate-700 to-slate-900">Add New Expense</span>
                    </CardTitle>
                    {!isLocked && (
                        <div className="flex items-center gap-2">
                            {isBatch && (
                                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100 flex items-center gap-1">
                                    <Layers className="w-3 h-3" />
                                    {rows.length} dòng
                                </span>
                            )}
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={addRow}
                                disabled={rows.length >= MAX_ROWS}
                                className="text-xs font-bold border-dashed border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-400 transition-all"
                            >
                                <Plus className="w-3.5 h-3.5 mr-1" />
                                Thêm dòng
                            </Button>
                        </div>
                    )}
                </div>
            </CardHeader>

            {isLocked ? (
                <CardContent className="p-6">
                    <div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
                        <div className="p-3 bg-amber-50 rounded-full">
                            <Lock className="w-6 h-6 text-amber-500" />
                        </div>
                        <div>
                            <p className="font-bold text-slate-700">🔒 Bảng chi tiêu đã được khóa</p>
                            <p className="text-sm text-slate-500 mt-1">Không thể thêm khoản chi mới. Liên hệ Admin để mở khóa.</p>
                        </div>
                    </div>
                </CardContent>
            ) : (
                <CardContent className="p-5 pt-3 space-y-3">
                    {rows.map((row, index) => (
                        <div
                            key={row.id}
                            className={cn(
                                "space-y-3 transition-all duration-300 animate-in fade-in slide-in-from-top-2",
                                isBatch && "relative p-4 rounded-xl border border-slate-200/80 bg-gradient-to-br from-slate-50/50 to-white hover:border-indigo-200/60 hover:shadow-sm"
                            )}
                        >
                            {/* Row number badge + delete button for batch mode */}
                            {isBatch && (
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                        <span className="w-5 h-5 rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-[10px] font-bold shadow-sm">
                                            {index + 1}
                                        </span>
                                        Khoản chi #{index + 1}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => removeRow(row.id)}
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all duration-200 group"
                                        title="Xoá dòng này"
                                    >
                                        <Trash2 className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                                    </button>
                                </div>
                            )}

                            {/* ROW FIELDS: Description, Amount, Date, Payer */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
                                {/* Description */}
                                <div className="lg:col-span-4 space-y-1.5">
                                    {index === 0 && <Label className="text-xs font-semibold text-slate-600">Description <span className="text-red-500">*</span></Label>}
                                    <div className="relative">
                                        <Wallet className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Cơm trưa, Điện, Nước..."
                                            value={row.description}
                                            onChange={e => updateRow(row.id, 'description', e.target.value)}
                                            className="pl-9 h-10"
                                            autoFocus={index === 0}
                                        />
                                    </div>
                                </div>

                                {/* Amount */}
                                <div className="lg:col-span-2 space-y-1.5">
                                    {index === 0 && <Label className="text-xs font-semibold text-slate-600">Amount (VND) <span className="text-red-500">*</span></Label>}
                                    <div className="relative">
                                        <Calculator className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            type="text"
                                            inputMode="numeric"
                                            placeholder="0"
                                            value={row.amount}
                                            onChange={e => handleAmountChange(row.id, e)}
                                            onPaste={(e) => {
                                                const text = e.clipboardData.getData('text');
                                                if (!/^[\d.,\s]+$/.test(text)) {
                                                    e.preventDefault();
                                                    addToast('Please paste valid numbers only', 'warning');
                                                }
                                            }}
                                            onKeyDown={(e) => {
                                                if (
                                                    ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End', 'Enter'].includes(e.key) ||
                                                    (e.ctrlKey || e.metaKey)
                                                ) {
                                                    return;
                                                }
                                                if (!/^\d$/.test(e.key)) {
                                                    e.preventDefault();
                                                }
                                            }}
                                            className="pl-9 h-10 font-mono font-bold text-lg text-green-700"
                                            maxLength={15}
                                        />
                                    </div>
                                </div>

                                {/* Date */}
                                <div className="lg:col-span-2 space-y-1.5">
                                    {index === 0 && <Label className="text-xs font-semibold text-slate-600">Date</Label>}
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <div className="relative cursor-pointer">
                                                <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground z-10" />
                                                <Button
                                                    variant={"outline"}
                                                    className={cn(
                                                        "w-full h-10 pl-9 text-left font-normal border-input bg-background hover:bg-slate-50 transition-colors justify-start",
                                                        !row.date && "text-muted-foreground"
                                                    )}
                                                >
                                                    {row.date ? format(row.date, "dd/MM/yyyy") : "Pick a date"}
                                                </Button>
                                            </div>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="end">
                                            <Calendar
                                                mode="single"
                                                selected={row.date}
                                                onSelect={(d) => updateRow(row.id, 'date', d)}
                                                disabled={(date) =>
                                                    date > new Date() || date < new Date("1900-01-01")
                                                }
                                                initialFocus
                                                locale={vi}
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>

                                {/* Payer */}
                                <div className="lg:col-span-2 space-y-1.5">
                                    {index === 0 && <Label className="text-xs font-semibold text-slate-600">Payer <span className="text-red-500">*</span></Label>}
                                    <div className="relative">
                                        <Users className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground z-10" />
                                        <Select value={row.payerId} onValueChange={(v) => updateRow(row.id, 'payerId', v)}>
                                            <SelectTrigger className="pl-9 h-10 w-full bg-background border-input focus:ring-2 focus:ring-ring focus:ring-offset-2">
                                                <SelectValue placeholder="Select" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {activeMembers.map(m => (
                                                    <SelectItem key={m.id} value={m.id.toString()} className="cursor-pointer py-2.5">
                                                        <div className="flex items-center gap-2">
                                                            <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold",
                                                                ['bg-blue-500', 'bg-red-500', 'bg-green-500', 'bg-amber-500', 'bg-purple-500', 'bg-pink-500'][Math.abs(m.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % 6]
                                                            )}>
                                                                {m.name.charAt(0).toUpperCase()}
                                                            </div>
                                                            {m.name}
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* Submit Button — only on first row in single mode, or hidden in batch */}
                                {!isBatch && (
                                    <div className="lg:col-span-2 space-y-1.5">
                                        <Label className="text-xs font-semibold text-transparent select-none hidden lg:block">.</Label>
                                        <Button
                                            onClick={handleSubmit as any}
                                            disabled={isSubmitting}
                                            className="w-full h-10 text-sm font-bold bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white shadow-lg shadow-green-200/50 hover:shadow-green-300 transition-all hover:scale-[1.01] overflow-hidden rounded-xl"
                                        >
                                            {isSubmitting ? (
                                                <><span className="animate-spin mr-1">⏳</span> Saving</>
                                            ) : (
                                                <><PlusCircle className="mr-1.5 h-4 w-4" /> Thêm</>
                                            )}
                                        </Button>
                                    </div>
                                )}
                            </div>

                            {/* Expense Type + Beneficiaries */}
                            <div className="flex flex-col sm:flex-row items-start gap-3">
                                <div className="flex items-center gap-2 shrink-0">
                                    <Label className="text-xs font-semibold text-slate-600 whitespace-nowrap">Loại chi:</Label>
                                    <div className="flex gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() => updateRow(row.id, 'type', 'SHARED')}
                                            className={cn(
                                                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all duration-200",
                                                row.type === 'SHARED'
                                                    ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm"
                                                    : "border-slate-200 bg-white text-slate-500 hover:border-blue-200 hover:bg-blue-50/50"
                                            )}
                                        >
                                            {row.type === 'SHARED' && <CheckCircle2 className="w-3 h-3" />}
                                            🔹 Shared
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => updateRow(row.id, 'type', 'PRIVATE')}
                                            className={cn(
                                                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all duration-200",
                                                row.type === 'PRIVATE'
                                                    ? "border-orange-500 bg-orange-50 text-orange-700 shadow-sm"
                                                    : "border-slate-200 bg-white text-slate-500 hover:border-orange-200 hover:bg-orange-50/50"
                                            )}
                                        >
                                            {row.type === 'PRIVATE' && <CheckCircle2 className="w-3 h-3" />}
                                            🔸 Private
                                        </button>
                                    </div>
                                </div>

                                {/* Beneficiaries inline when PRIVATE */}
                                {row.type === 'PRIVATE' && (
                                    <div className="flex items-center gap-2 flex-wrap animate-in fade-in slide-in-from-left-2 duration-200">
                                        <span className="text-xs font-semibold text-orange-600 flex items-center gap-1">
                                            <Users className="w-3 h-3" /> Cho:
                                        </span>
                                        {activeMembers.map(m => {
                                            const isSelected = row.beneficiaryIds.includes(m.id.toString());
                                            return (
                                                <button
                                                    key={m.id}
                                                    type="button"
                                                    onClick={() => toggleBeneficiary(row.id, m.id.toString())}
                                                    className={cn(
                                                        "flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all border",
                                                        isSelected
                                                            ? "bg-orange-500 text-white border-orange-600 shadow-sm"
                                                            : "bg-white border-slate-200 text-slate-600 hover:border-orange-300 hover:bg-orange-50"
                                                    )}
                                                >
                                                    {isSelected && <Check className="w-3 h-3 stroke-[3px]" />}
                                                    {m.name}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {/* Batch mode: Add row + Submit all buttons */}
                    {isBatch && (
                        <div className="flex items-center gap-3 pt-2 border-t border-dashed border-slate-200">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={addRow}
                                disabled={rows.length >= MAX_ROWS}
                                className="text-xs font-bold border-dashed border-slate-300 text-slate-600 hover:bg-slate-50 transition-all"
                            >
                                <Plus className="w-3.5 h-3.5 mr-1" />
                                Thêm dòng ({rows.length}/{MAX_ROWS})
                            </Button>
                            <div className="flex-1" />
                            <Button
                                onClick={handleSubmit as any}
                                disabled={isSubmitting}
                                className="h-10 px-6 text-sm font-bold bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white shadow-lg shadow-green-200/50 hover:shadow-green-300 transition-all hover:scale-[1.01] overflow-hidden rounded-xl"
                            >
                                {isSubmitting ? (
                                    <><span className="animate-spin mr-1">⏳</span> Đang lưu...</>
                                ) : (
                                    <><Layers className="mr-1.5 h-4 w-4" /> Thêm tất cả ({rows.length})</>
                                )}
                            </Button>
                        </div>
                    )}
                </CardContent>
            )}
        </Card>
    );
}
