'use client';
import React, { useState, useEffect } from 'react';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import { useToast } from '@/components/ui/ToastProvider';
import { Button } from "@/components/ui/button";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, X, Trash2, Edit, Plus, RotateCcw, History, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";

interface Sheet {
    id: number;
    name: string;
    month: number;
    year: number;
}

interface Props {
    sheets: Sheet[];
    currentSheetId: number | null;
    workspaceId: number;
    onChange: (id: number) => void;
    onCreated: () => void;
}

export default function SheetSelector({ sheets, currentSheetId, workspaceId, onChange, onCreated }: Props) {
    const { confirm } = useConfirm();
    const { addToast } = useToast();
    const [isCreating, setIsCreating] = useState(false);
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());

    // Edit State
    const [isEditing, setIsEditing] = useState(false);
    const [editMonth, setEditMonth] = useState(1);
    const [editYear, setEditYear] = useState(new Date().getFullYear());

    // Recycle Bin State
    const [isBinOpen, setIsBinOpen] = useState(false);
    const [deletedSheets, setDeletedSheets] = useState<Sheet[]>([]);
    const [loadingBin, setLoadingBin] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const fetchDeletedSheets = async () => {
        setLoadingBin(true);
        try {
            const res = await fetch('/api/sheets/deleted');
            if (res.ok) {
                const data = await res.json();
                setDeletedSheets(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingBin(false);
        }
    };

    useEffect(() => {
        if (isBinOpen) {
            fetchDeletedSheets();
        }
    }, [isBinOpen]);

    const handleCreate = async () => {
        try {
            const res = await fetch('/api/sheets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ workspaceId, month, year })
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Failed');
            }

            const newSheet = await res.json();
            setIsCreating(false);
            onCreated();
            onChange(newSheet.id);
            addToast('Đã tạo bảng mới', 'success');
        } catch (e: any) {
            console.error(e);
            addToast(e.message || 'Lỗi khi tạo bảng mới', 'error');
        }
    };

    const handleDelete = async () => {
        if (!currentSheetId) return;
        const ok = await confirm({
            title: 'Xóa bảng chi tiêu',
            message: '⚠️ Bạn có chắc chắn muốn xóa tháng này? Dữ liệu sẽ được chuyển vào Thùng rác và có thể khôi phục lại sau.',
            type: 'danger',
            confirmText: 'Xác nhận xóa',
            cancelText: 'Hủy'
        });
        if (!ok) return;

        try {
            const res = await fetch(`/api/sheets/${currentSheetId}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed');
            onCreated(); // Reload workspace
            addToast('Đã chuyển vào thùng rác', 'success');
        } catch (e) {
            console.error(e);
            addToast('Lỗi khi xóa bảng', 'error');
        }
    };

    const handleRestore = async (id: number) => {
        try {
            const res = await fetch(`/api/sheets/${id}/restore`, { method: 'POST' });
            if (!res.ok) throw new Error('Failed');
            onCreated();
            fetchDeletedSheets();
            addToast('Đã khôi phục bảng', 'success');
        } catch (e) {
            console.error(e);
            addToast('Lỗi khi khôi phục', 'error');
        }
    };

    const handlePermanentDelete = async (id: number) => {
        const ok = await confirm({
            title: 'Xóa vĩnh viễn',
            message: '⚠️ Hành động này không thể hoàn tác! Bạn có chắc chắn muốn xóa vĩnh viễn bảng này và toàn bộ dữ liệu bên trong?',
            type: 'danger',
            confirmText: 'Xóa vĩnh viễn',
            cancelText: 'Hủy'
        });
        if (!ok) return;

        setDeletingId(id);
        try {
            console.log("Requesting delete for", id);
            const res = await fetch(`/api/sheets/${id}/permanent`, { method: 'DELETE' });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || 'Failed to delete');
            }
            // Success: Close bin, show toast
            setIsBinOpen(false);
            addToast('Đã xóa vĩnh viễn', 'success');
        } catch (e: any) {
            console.error(e);
            addToast(e.message || 'Lỗi khi xóa vĩnh viễn', 'error');
        } finally {
            setDeletingId(null);
        }
    };

    const startEdit = () => {
        if (!currentSheetId) return;
        const current = sheets.find(s => s.id === currentSheetId);
        if (current) {
            setEditMonth(current.month || 1);
            setEditYear(current.year || new Date().getFullYear());
            setIsEditing(true);
        }
    };

    const saveEdit = async () => {
        if (!currentSheetId) return;
        const newName = `Tháng ${editMonth}/${editYear}`;
        try {
            const res = await fetch(`/api/sheets/${currentSheetId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newName })
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Failed');
            }

            setIsEditing(false);
            onCreated();
            addToast('Đã cập nhật tên', 'success');
        } catch (e: any) {
            console.error(e);
            addToast(e.message || 'Lỗi khi cập nhật tên', 'error');
        }
    };

    return (
        <div className="mb-6 flex items-center gap-2 h-10 w-full">
            {isEditing ? (
                <div className="flex gap-2 items-center flex-1 animate-in fade-in duration-200">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="w-[160px] justify-start text-left font-bold border-slate-200 h-9 bg-white">
                                <CalendarIcon className="mr-2 h-4 w-4 text-slate-500" />
                                {`Tháng ${editMonth}/${editYear}`}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-3" align="start">
                            <div className="flex justify-between items-center mb-4">
                                <Button variant="ghost" size="icon" onClick={() => setEditYear(editYear - 1)} className="h-7 w-7">
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <span className="font-bold text-base">{editYear}</span>
                                <Button variant="ghost" size="icon" onClick={() => setEditYear(editYear + 1)} className="h-7 w-7">
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                                    <Button
                                        key={m}
                                        variant={m === editMonth ? "default" : "outline"}
                                        className={`text-xs h-8 px-0 ${m === editMonth ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}`}
                                        onClick={() => setEditMonth(m)}
                                    >
                                        Th {m}
                                    </Button>
                                ))}
                            </div>
                        </PopoverContent>
                    </Popover>

                    <Button onClick={saveEdit} size="icon" className="bg-green-600 hover:bg-green-700 h-10 w-10 shrink-0">
                        <Check className="w-5 h-5" />
                    </Button>
                    <Button onClick={() => setIsEditing(false)} variant="secondary" size="icon" className="h-10 w-10 shrink-0">
                        <X className="w-5 h-5" />
                    </Button>
                </div>
            ) : isCreating ? (
                <div className="flex gap-2 items-center flex-1 animate-in fade-in duration-200 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="w-[160px] justify-start text-left font-bold border-slate-200 h-9">
                                <CalendarIcon className="mr-2 h-4 w-4 text-slate-500" />
                                {month ? `Tháng ${month}/${year}` : <span>Chọn tháng...</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-3" align="start">
                            <div className="flex justify-between items-center mb-4">
                                <Button variant="ghost" size="icon" onClick={() => setYear(year - 1)} className="h-7 w-7">
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <span className="font-bold text-base">{year}</span>
                                <Button variant="ghost" size="icon" onClick={() => setYear(year + 1)} className="h-7 w-7">
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                                    <Button
                                        key={m}
                                        variant={m === month ? "default" : "outline"}
                                        className={`text-xs h-8 px-0 ${m === month ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}`}
                                        onClick={() => setMonth(m)}
                                    >
                                        Th {m}
                                    </Button>
                                ))}
                            </div>
                        </PopoverContent>
                    </Popover>

                    <div className="flex items-center gap-1 ml-auto">
                        <Button
                            onClick={handleCreate}
                            className="bg-blue-600 hover:bg-blue-700 h-9 px-3 text-xs md:text-sm font-semibold shadow-sm transition-all hover:scale-105 active:scale-95"
                        >
                            <Check className="w-3.5 h-3.5 mr-1" /> Tạo
                        </Button>
                        <Button
                            onClick={() => setIsCreating(false)}
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            ) : (
                <>
                    <Select value={currentSheetId?.toString()} onValueChange={(val) => onChange(parseInt(val))}>
                        <SelectTrigger className="h-10 text-lg font-bold bg-white border-transparent hover:border-slate-200 focus:ring-0 shadow-none px-2 data-[state=open]:bg-slate-50">
                            <SelectValue placeholder="Chọn bảng chi tiêu" />
                        </SelectTrigger>
                        <SelectContent>
                            {sheets.map(s => (
                                <SelectItem key={s.id} value={s.id.toString()} className="font-medium cursor-pointer">
                                    {s.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <div className="flex items-center gap-2 shrink-0">
                        {/* Edit Button */}
                        <Button
                            onClick={startEdit}
                            disabled={!currentSheetId || !sheets.some(s => s.id === currentSheetId)}
                            variant="outline"
                            size="icon"
                            className="h-10 w-10 text-blue-600 bg-blue-50 hover:bg-blue-100 border-blue-100 hover:border-blue-200 shadow-sm transition-all rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Đổi tên"
                        >
                            <Edit className="w-5 h-5 stroke-[2.5]" />
                        </Button>

                        {/* Delete Button */}
                        <Button
                            onClick={handleDelete}
                            disabled={!currentSheetId || !sheets.some(s => s.id === currentSheetId)}
                            variant="outline"
                            size="icon"
                            className="h-10 w-10 text-red-600 bg-red-50 hover:bg-red-100 border-red-100 hover:border-red-200 shadow-sm transition-all rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Xóa tháng này"
                        >
                            <Trash2 className="w-5 h-5 stroke-[2.5]" />
                        </Button>

                        <div className="w-px h-6 bg-slate-200 mx-2"></div>

                        {/* RECYCLE BIN */}
                        <Dialog open={isBinOpen} onOpenChange={setIsBinOpen}>
                            <DialogTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-10 w-10 text-purple-600 bg-purple-50 hover:bg-purple-100 border-purple-100 hover:border-purple-200 shadow-sm transition-all rounded-xl"
                                    title="Thùng rác"
                                >
                                    <RotateCcw className="w-5 h-5 stroke-[2.5]" />
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                                <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2">
                                        <History className="w-5 h-5 text-purple-500" />
                                        Bảng chi tiêu đã xóa (Thùng rác)
                                    </DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 py-4 max-h-[400px] overflow-y-auto">
                                    {loadingBin ? (
                                        <div className="text-center py-8 text-slate-400 italic">Đang tải...</div>
                                    ) : deletedSheets.length === 0 ? (
                                        <div className="text-center py-8 text-slate-400 italic">Thùng rác trống.</div>
                                    ) : (
                                        deletedSheets.map(s => (
                                            <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50">
                                                <span className="font-bold text-slate-700">{s.name}</span>
                                                <div className="flex gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="secondary"
                                                        onClick={() => handleRestore(s.id)}
                                                        className="h-8 gap-1.5 bg-white border border-slate-200 hover:bg-green-50 hover:text-green-600 hover:border-green-200"
                                                        title="Khôi phục"
                                                    >
                                                        <RotateCcw className="w-3.5 h-3.5" />
                                                        <span className="hidden sm:inline">Khôi phục</span>
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        onClick={() => handlePermanentDelete(s.id)}
                                                        disabled={deletingId === s.id}
                                                        className="h-8 w-8 p-0 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 shadow-sm disabled:opacity-50"
                                                        title="Xóa vĩnh viễn"
                                                    >
                                                        {deletingId === s.id ? (
                                                            <span className="animate-spin">⏳</span>
                                                        ) : (
                                                            <X className="w-4 h-4" />
                                                        )}
                                                    </Button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </DialogContent>
                        </Dialog>

                        <Button
                            onClick={() => setIsCreating(true)}
                            variant="default"
                            size="icon"
                            className="h-10 w-10 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all border-none rounded-xl"
                            title="Thêm tháng mới"
                        >
                            <Plus className="w-6 h-6 stroke-[3]" />
                        </Button>
                    </div>
                </>
            )}
        </div>
    );
}
