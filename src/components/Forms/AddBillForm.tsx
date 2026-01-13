'use client';
import React, { useState } from 'react';
import { useToast } from '@/components/ui/ToastProvider';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PlusCircle, Wallet, Calendar as CalendarIcon, Users, Calculator, Check, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

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
}

export default function AddBillForm({ members, sheetId, onAdd, initialData, onOptimisticAdd }: Props) {
    const { addToast } = useToast();
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState<Date | undefined>(undefined);
    const [payerId, setPayerId] = useState<string>('');
    const [type, setType] = useState<'SHARED' | 'PRIVATE'>('SHARED');
    const [beneficiaryIds, setBeneficiaryIds] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const activeMembers = members.filter(m => m.status !== 'DELETED');

    // Initial load & Duplication Effect
    React.useEffect(() => {
        if (activeMembers.length > 0 && !payerId) {
            setPayerId(activeMembers[0].id.toString());
        }
    }, [activeMembers, payerId]);

    // Lifted initialData Effect
    React.useEffect(() => {
        if (initialData) {
            setDescription(initialData.description);
            setAmount(initialData.amount.toString());
            setPayerId(initialData.payerId.toString());
            setType(initialData.type);
            setBeneficiaryIds(initialData.beneficiaryIds?.map(String) || []);
            // Scroll to form
            const formElement = document.getElementById('add-bill-form');
            if (formElement) formElement.scrollIntoView({ behavior: 'smooth' });

            addToast('Đã sao chép thông tin hóa đơn!', 'info');
        }
    }, [initialData, addToast]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;

        if (!description || !amount || !payerId) {
            addToast('Vui lòng điền đầy đủ thông tin', 'warning');
            return;
        }

        if (type === 'PRIVATE' && beneficiaryIds.length === 0) {
            addToast('Vui lòng chọn người thụ hưởng cho chi tiêu riêng', 'warning');
            return;
        }
        setIsSubmitting(true);

        const payerName = members.find(m => m.id === parseInt(payerId))?.name || 'Unknown';
        const beneficiaryNames = beneficiaryIds.map(id => members.find(m => m.id === parseInt(id))?.name || 'Unknown');

        // OPTIMISTIC UPDATE
        if (onOptimisticAdd) {
            onOptimisticAdd({
                id: Date.now(), // Temp ID
                amount: parseFloat(amount),
                payer: payerName,
                type,
                beneficiaries: type === 'PRIVATE' ? beneficiaryNames : members.map(m => m.name),
                note: description,
                date: date ? date.toISOString() : new Date().toISOString()
            });
        }

        try {
            const res = await fetch('/api/expenses', {
                // ... (rest same)
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sheetId,
                    payerId: parseInt(payerId),
                    amount: parseFloat(amount),
                    description,
                    type,
                    date: date ? date.toISOString() : undefined,
                    beneficiaryIds: type === 'PRIVATE' ? beneficiaryIds.map(id => parseInt(id)) : []
                }),
            });

            if (!res.ok) throw new Error('Failed to add expense');

            // Reset form
            setDescription('');
            setAmount('');
            setDate(undefined);
            setType('SHARED');
            setBeneficiaryIds([]);
            addToast('Đã thêm hóa đơn thành công!', 'success');
            onAdd();
        } catch (error) {
            console.error(error);
            addToast('Có lỗi xảy ra khi thêm hóa đơn', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleBeneficiary = (id: string) => {
        setBeneficiaryIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    return (
        <Card className="w-full premium-card overflow-hidden border-none soft-shadow" id="add-bill-form">
            <CardHeader className="bg-gradient-to-br from-indigo-50/80 via-white to-green-50/50 pb-6 border-b border-indigo-50/50">
                <CardTitle className="text-xl flex items-center gap-3 text-slate-800">
                    <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg shadow-green-200">
                        <PlusCircle className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-black tracking-tight">Thêm Hóa Đơn Mới</span>
                </CardTitle>
            </CardHeader>

            <CardContent className="p-6 pt-2 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Nội dung chi tiêu <span className="text-red-500">*</span></Label>
                        <div className="relative">
                            <Wallet className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Ví dụ: Ăn tối, Tiền điện..."
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                className="pl-9 h-10"
                                autoFocus
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Ngày</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <div className="relative cursor-pointer">
                                    <CalendarIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10" />
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-full h-10 pl-9 text-left font-normal border-input bg-background hover:bg-slate-50 transition-colors justify-start",
                                            !date && "text-muted-foreground"
                                        )}
                                    >
                                        {date ? (
                                            format(date, "dd/MM/yyyy")
                                        ) : (
                                            "Chọn ngày"
                                        )}
                                    </Button>
                                </div>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="end">
                                <Calendar
                                    mode="single"
                                    selected={date}
                                    onSelect={setDate}
                                    disabled={(date) =>
                                        date > new Date() || date < new Date("1900-01-01")
                                    }
                                    initialFocus
                                    locale={vi}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Số tiền (VNĐ) <span className="text-red-500">*</span></Label>
                        <div className="relative">
                            <Calculator className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="number"
                                placeholder="0"
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                className="pl-9 h-10 font-mono font-bold text-lg text-green-700"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Người chi <span className="text-red-500">*</span></Label>
                        <div className="relative">
                            <Users className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <select
                                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 pl-9 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={payerId}
                                onChange={e => setPayerId(e.target.value)}
                            >
                                {activeMembers.map(m => (
                                    <option key={m.id} value={m.id}>{m.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    <Label className="block">Loại chi tiêu</Label>
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            type="button"
                            onClick={() => setType('SHARED')}
                            className={cn(
                                "flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all duration-200",
                                type === 'SHARED'
                                    ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm"
                                    : "border-muted bg-transparent text-muted-foreground hover:bg-muted/20"
                            )}
                        >
                            <span className="text-base font-bold flex items-center gap-2">
                                {type === 'SHARED' && <CheckCircle2 className="w-4 h-4" />} Chung
                            </span>
                            <span className="text-xs opacity-80 mt-1">Chia đều cho tất cả</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setType('PRIVATE')}
                            className={cn(
                                "flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all duration-200",
                                type === 'PRIVATE'
                                    ? "border-orange-500 bg-orange-50 text-orange-700 shadow-sm"
                                    : "border-muted bg-transparent text-muted-foreground hover:bg-muted/20"
                            )}
                        >
                            <span className="text-base font-bold flex items-center gap-2">
                                {type === 'PRIVATE' && <CheckCircle2 className="w-4 h-4" />} Riêng
                            </span>
                            <span className="text-xs opacity-80 mt-1">Chỉ tính cho một số người</span>
                        </button>
                    </div>
                </div>

                {type === 'PRIVATE' && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-300 p-4 bg-orange-50/50 border border-orange-100 rounded-lg space-y-3">
                        <Label className="text-orange-800 flex items-center gap-2">
                            <span className="bg-orange-100 p-1 rounded-full"><Users className="w-3 h-3 text-orange-700" /></span>
                            Chọn người thụ hưởng:
                        </Label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {activeMembers.map(m => {
                                const isSelected = beneficiaryIds.includes(m.id.toString());
                                return (
                                    <button
                                        key={m.id}
                                        type="button"
                                        onClick={() => toggleBeneficiary(m.id.toString())}
                                        className={cn(
                                            "flex items-center justify-center gap-2 p-2 rounded-md text-sm font-medium transition-all",
                                            isSelected
                                                ? "bg-orange-500 text-white shadow-md hover:bg-orange-600"
                                                : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                                        )}
                                    >
                                        {isSelected && <Check className="w-3 h-3" />}
                                        {m.name}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                <Button
                    onClick={handleSubmit as any}
                    disabled={isSubmitting}
                    className="w-full h-11 text-base font-semibold bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 shadow-md transition-all hover:scale-[1.01]"
                >
                    {isSubmitting ? (
                        <>
                            <span className="animate-spin mr-2">⏳</span> Đang lưu...
                        </>
                    ) : (
                        <>
                            <PlusCircle className="mr-2 h-5 w-5" /> Lưu Hóa Đơn
                        </>
                    )}
                </Button>
            </CardContent>
        </Card>
    );
}
