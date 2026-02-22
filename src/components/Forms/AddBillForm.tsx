'use client';
import React, { useState } from 'react';
import { useToast } from '@/components/ui/ToastProvider';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PlusCircle, Wallet, Calendar as CalendarIcon, Users, Calculator, Check, CheckCircle2, Lock } from 'lucide-react';
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

export default function AddBillForm({ members, sheetId, onAdd, initialData, onOptimisticAdd, isLocked }: Props) {
    const { addToast } = useToast();
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [payerId, setPayerId] = useState<string>('');
    const [type, setType] = useState<'SHARED' | 'PRIVATE'>('SHARED');
    const [beneficiaryIds, setBeneficiaryIds] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [currentUser, setCurrentUser] = useState<{ id: number; name: string } | null>(null);

    const activeMembers = members.filter(m => m.status !== 'DELETED');


    // Fetch current user
    React.useEffect(() => {
        fetch('/api/auth/me')
            .then(res => res.json())
            .then(data => {
                if (data.user) setCurrentUser(data.user);
            })
            .catch(console.error);
    }, []);

    // Initial load & Duplication Effect
    React.useEffect(() => {
        // Chỉ set default khi currentUser đã load xong để tránh race condition
        if (activeMembers.length > 0 && !payerId && currentUser) {
            const me = activeMembers.find(m => m.id === currentUser.id);
            if (me) {
                setPayerId(me.id.toString());
            } else {
                // User không có trong danh sách members (edge case)
                setPayerId(activeMembers[0].id.toString());
            }
        }
    }, [activeMembers, payerId, currentUser]);

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

            addToast('Bill info copied!', 'info');
        }
    }, [initialData, addToast]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;

        if (!description || !amount || !payerId) {
            addToast('Please fill in all fields', 'warning');
            return;
        }

        if (type === 'PRIVATE' && beneficiaryIds.length === 0) {
            addToast('Please select beneficiaries for private expense', 'warning');
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
                    amount: parseInt(amount.replace(/\./g, '')), // Remove dots before parsing
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
            setDate(new Date());
            setType('SHARED');
            setBeneficiaryIds([]);
            addToast('Bill added successfully!', 'success');
            onAdd();
        } catch (error) {
            console.error(error);
            addToast('Error adding bill', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleBeneficiary = (id: string) => {
        setBeneficiaryIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '');
        if (value === '') {
            setAmount('');
            return;
        }
        const numberValue = parseInt(value);
        setAmount(numberValue.toLocaleString('vi-VN'));
    };

    return (
        <Card className="w-full premium-card overflow-hidden border-none soft-shadow" id="add-bill-form">
            <CardHeader className="bg-gradient-to-br from-indigo-50/80 via-white to-emerald-50/50 pb-6 border-b border-indigo-50/50">
                <CardTitle className="text-xl flex items-center gap-3 text-slate-800">
                    <div className="p-2.5 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg shadow-green-200/50 ring-2 ring-white">
                        <PlusCircle className="w-5 h-5 text-white drop-shadow-sm" />
                    </div>
                    <span className="font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-slate-700 to-slate-900">Add New Expense</span>
                </CardTitle>
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
                <CardContent className="p-5 pt-3 space-y-4">
                    {/* ROW 1: Main fields - Description, Amount, Date, Payer */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
                        {/* Description - takes more space */}
                        <div className="lg:col-span-4 space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-600">Description <span className="text-red-500">*</span></Label>
                            <div className="relative">
                                <Wallet className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Cơm trưa, Điện, Nước..."
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    className="pl-9 h-10"
                                    autoFocus
                                />
                            </div>
                        </div>

                        {/* Amount */}
                        <div className="lg:col-span-2 space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-600">Amount (VND) <span className="text-red-500">*</span></Label>
                            <div className="relative">
                                <Calculator className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="0"
                                    value={amount}
                                    onChange={handleAmountChange}
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
                            <Label className="text-xs font-semibold text-slate-600">Date</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <div className="relative cursor-pointer">
                                        <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground z-10" />
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full h-10 pl-9 text-left font-normal border-input bg-background hover:bg-slate-50 transition-colors justify-start",
                                                !date && "text-muted-foreground"
                                            )}
                                        >
                                            {date ? format(date, "dd/MM/yyyy") : "Pick a date"}
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

                        {/* Payer */}
                        <div className="lg:col-span-2 space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-600">Payer <span className="text-red-500">*</span></Label>
                            <div className="relative">
                                <Users className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground z-10" />
                                <Select value={payerId} onValueChange={setPayerId}>
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

                        {/* Submit Button */}
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
                    </div>

                    {/* ROW 2: Expense Type + Beneficiaries */}
                    <div className="flex flex-col sm:flex-row items-start gap-3">
                        <div className="flex items-center gap-2 shrink-0">
                            <Label className="text-xs font-semibold text-slate-600 whitespace-nowrap">Loại chi:</Label>
                            <div className="flex gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => setType('SHARED')}
                                    className={cn(
                                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all duration-200",
                                        type === 'SHARED'
                                            ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm"
                                            : "border-slate-200 bg-white text-slate-500 hover:border-blue-200 hover:bg-blue-50/50"
                                    )}
                                >
                                    {type === 'SHARED' && <CheckCircle2 className="w-3 h-3" />}
                                    🔹 Shared
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setType('PRIVATE')}
                                    className={cn(
                                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all duration-200",
                                        type === 'PRIVATE'
                                            ? "border-orange-500 bg-orange-50 text-orange-700 shadow-sm"
                                            : "border-slate-200 bg-white text-slate-500 hover:border-orange-200 hover:bg-orange-50/50"
                                    )}
                                >
                                    {type === 'PRIVATE' && <CheckCircle2 className="w-3 h-3" />}
                                    🔸 Private
                                </button>
                            </div>
                        </div>

                        {/* Beneficiaries inline when PRIVATE */}
                        {type === 'PRIVATE' && (
                            <div className="flex items-center gap-2 flex-wrap animate-in fade-in slide-in-from-left-2 duration-200">
                                <span className="text-xs font-semibold text-orange-600 flex items-center gap-1">
                                    <Users className="w-3 h-3" /> Cho:
                                </span>
                                {activeMembers.map(m => {
                                    const isSelected = beneficiaryIds.includes(m.id.toString());
                                    return (
                                        <button
                                            key={m.id}
                                            type="button"
                                            onClick={() => toggleBeneficiary(m.id.toString())}
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
                </CardContent>
            )}
        </Card >
    );
}
