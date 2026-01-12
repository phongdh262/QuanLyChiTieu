'use client';
import React, { useState } from 'react';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import { useToast } from '@/components/ui/ToastProvider';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, X, Trash2, Edit, Plus } from "lucide-react";

interface Sheet {
    id: number;
    name: string;
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
    const [editName, setEditName] = useState('');

    const handleCreate = async () => {
        try {
            const res = await fetch('/api/sheets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ workspaceId, month, year })
            });
            if (!res.ok) throw new Error('Failed');
            const newSheet = await res.json();
            setIsCreating(false);
            onCreated();
            onChange(newSheet.id);
            addToast('Đã tạo bảng mới', 'success');
        } catch (e) {
            console.error(e);
            addToast('Lỗi khi tạo bảng mới', 'error');
        }
    };

    const handleDelete = async () => {
        if (!currentSheetId) return;
        const ok = await confirm({
            title: 'Xóa bảng chi tiêu',
            message: '⚠️ CẢNH BÁO: Hành động này sẽ xóa TOÀN BỘ dữ liệu chi tiêu trong tháng này và KHÔNG THỂ khôi phục.\n\nBạn có chắc chắn muốn xóa?',
            type: 'danger',
            confirmText: 'Xóa vĩnh viễn',
            cancelText: 'Hủy'
        });
        if (!ok) return;

        try {
            const res = await fetch(`/api/sheets/${currentSheetId}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed');
            onCreated(); // Reload workspace
            // Parent will likely reset currentSheetId if it was deleted
            addToast('Đã xóa bảng', 'success');
        } catch (e) {
            console.error(e);
            addToast('Lỗi khi xóa bảng', 'error');
        }
    };

    const startEdit = () => {
        if (!currentSheetId) return;
        const current = sheets.find(s => s.id === currentSheetId);
        if (current) {
            setEditName(current.name);
            setIsEditing(true);
        }
    };

    const saveEdit = async () => {
        if (!currentSheetId) return;
        try {
            const res = await fetch(`/api/sheets/${currentSheetId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: editName })
            });
            if (!res.ok) throw new Error('Failed');
            setIsEditing(false);
            onCreated();
            addToast('Đã cập nhật tên', 'success');
        } catch (e) {
            console.error(e);
            addToast('Lỗi khi cập nhật tên', 'error');
        }
    };

    return (
        <div className="mb-6 flex items-center gap-2 h-10 w-full">
            {isEditing ? (
                <div className="flex gap-2 items-center flex-1 animate-in fade-in duration-200">
                    <Input
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className="h-10 font-bold bg-white text-lg"
                        autoFocus
                    />
                    <Button onClick={saveEdit} size="icon" className="bg-green-600 hover:bg-green-700 h-10 w-10 shrink-0">
                        <Check className="w-5 h-5" />
                    </Button>
                    <Button onClick={() => setIsEditing(false)} variant="secondary" size="icon" className="h-10 w-10 shrink-0">
                        <X className="w-5 h-5" />
                    </Button>
                </div>
            ) : isCreating ? (
                <div className="flex gap-2 items-center flex-1 animate-in fade-in duration-200 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 px-2">
                        <span className="text-sm font-semibold text-slate-500 whitespace-nowrap">Tháng:</span>
                        <Input
                            type="number"
                            value={month}
                            onChange={e => setMonth(parseInt(e.target.value))}
                            className="w-16 h-8 text-center font-bold"
                            min={1} max={12}
                        />
                        <span className="text-slate-300">/</span>
                        <Input
                            type="number"
                            value={year}
                            onChange={e => setYear(parseInt(e.target.value))}
                            className="w-20 h-8 text-center font-bold"
                        />
                    </div>

                    <div className="flex items-center gap-1 ml-auto">
                        <Button
                            onClick={handleCreate}
                            className="bg-blue-600 hover:bg-blue-700 h-8 px-3 text-xs"
                        >
                            <Check className="w-3.5 h-3.5 mr-1" /> Tạo
                        </Button>
                        <Button
                            onClick={() => setIsCreating(false)}
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50"
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

                    <div className="flex items-center gap-1 shrink-0">
                        <Button
                            onClick={startEdit}
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 text-slate-400 hover:text-blue-600 border-slate-200 hover:bg-blue-50"
                            title="Đổi tên"
                        >
                            <Edit className="w-4 h-4" />
                        </Button>

                        <Button
                            onClick={handleDelete}
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 text-slate-400 hover:text-red-600 border-slate-200 hover:bg-red-50 hover:border-red-200"
                            title="Xóa tháng này"
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>

                        <div className="w-px h-5 bg-slate-200 mx-1"></div>

                        <Button
                            onClick={() => setIsCreating(true)}
                            variant="default"
                            size="icon"
                            className="h-9 w-9 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                            title="Thêm tháng mới"
                        >
                            <Plus className="w-5 h-5" />
                        </Button>
                    </div>
                </>
            )}
        </div>
    );
}
