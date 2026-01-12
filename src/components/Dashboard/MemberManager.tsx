'use client';
import React, { useState } from 'react';
import { Member } from '@/types/expense';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import { useToast } from '@/components/ui/ToastProvider';

interface Props {
    members: Member[];
    workspaceId: number;
    onUpdate: () => void;
}

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, UserPlus, Trash2, Edit, Save, X } from "lucide-react";
import { cn } from "@/lib/utils";

// ... (imports)

export default function MemberManager({ members, workspaceId, onUpdate }: Props) {
    // ... (logic)
    const { confirm } = useConfirm();
    const { addToast } = useToast();
    const [isAdding, setIsAdding] = useState(false);
    const [newName, setNewName] = useState('');
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editName, setEditName] = useState('');

    const handleAdd = async () => {
        if (!newName) return;
        try {
            await fetch('/api/members', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ workspaceId, name: newName })
            });
            setNewName('');
            setIsAdding(false);
            onUpdate(); // Reload members list
            addToast('Đã thêm thành viên', 'success');
        } catch (e) {
            console.error(e);
            addToast('Lỗi thêm thành viên', 'error');
        }
    };

    const handleDelete = async (id: number) => {
        const ok = await confirm({
            title: 'Xóa thành viên',
            message: 'Bạn có chắc chắn muốn xóa thành viên này? Dữ liệu chi tiêu liên quan có thể bị ảnh hưởng.',
            type: 'danger',
            confirmText: 'Xóa',
            cancelText: 'Hủy'
        });
        if (!ok) return;

        try {
            const res = await fetch(`/api/members/${id}`, { method: 'DELETE' });
            if (!res.ok) {
                const json = await res.json();
                throw new Error(json.error || 'Failed');
            }
            addToast('Đã xóa thành viên', 'success');
            onUpdate();
        } catch (e: any) {
            addToast(e.message || 'Lỗi xóa thành viên', 'error');
        }
    };

    const startEdit = (m: Member) => {
        setEditingId(m.id);
        setEditName(m.name);
    };

    const saveEdit = async (id: number) => {
        try {
            await fetch(`/api/members/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: editName })
            });
            setEditingId(null);
            onUpdate();
            addToast('Đã cập nhật tên', 'success');
        } catch (e) {
            console.error(e);
            addToast('Lỗi cập nhật', 'error');
        }
    };

    return (
        <Card className="w-full shadow-md hover:shadow-lg transition-all duration-300 border-t-4 border-t-indigo-500 bg-white">
            <CardHeader className="p-4 pb-2 border-b border-slate-50 bg-indigo-50/20">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2 text-indigo-800">
                        <Users className="w-5 h-5 text-indigo-500" />
                        Thành Viên
                    </CardTitle>
                    <Button
                        size="sm"
                        variant={isAdding ? "secondary" : "default"}
                        onClick={() => setIsAdding(!isAdding)}
                        className={cn("h-8 text-xs font-semibold shadow-sm", isAdding ? "bg-slate-200 text-slate-700 hover:bg-slate-300" : "bg-indigo-600 hover:bg-indigo-700 text-white")}
                    >
                        {isAdding ? <><X className="w-3 h-3 mr-1" /> Đóng</> : <><UserPlus className="w-3 h-3 mr-1" /> Thêm</>}
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-4 pt-4">
                {isAdding && (
                    <div className="flex gap-2 mb-4 animate-in slide-in-from-top-2 duration-200">
                        <Input
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                            placeholder="Tên thành viên..."
                            autoFocus
                            className="h-9 text-sm"
                            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                        />
                        <Button
                            className="h-9 px-3 bg-green-600 hover:bg-green-700 text-white"
                            onClick={handleAdd}
                        >
                            <Save className="w-4 h-4" />
                        </Button>
                    </div>
                )}

                <div className="space-y-1">
                    {members.map(m => (
                        <div
                            key={m.id}
                            className={cn(
                                "group flex items-center justify-between p-2 rounded-md hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100",
                                editingId === m.id ? "bg-blue-50/50 border-blue-100" : ""
                            )}
                        >
                            {editingId === m.id ? (
                                <div className="flex gap-2 w-full animate-in fade-in duration-200">
                                    <Input
                                        value={editName}
                                        onChange={e => setEditName(e.target.value)}
                                        className="h-8 text-sm flex-1 bg-white"
                                        autoFocus
                                        onKeyDown={(e) => e.key === 'Enter' && saveEdit(m.id)}
                                    />
                                    <Button size="icon" className="h-8 w-8 bg-green-600 hover:bg-green-700 text-white" onClick={() => saveEdit(m.id)}>
                                        <Save className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-500 hover:bg-slate-200" onClick={() => setEditingId(null)}>
                                        <X className="w-3.5 h-3.5" />
                                    </Button>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
                                            {m.name.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="font-medium text-slate-700 text-sm">{m.name}</span>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-7 w-7 text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                                            onClick={() => startEdit(m)}
                                            title="Sửa"
                                        >
                                            <Edit className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50"
                                            onClick={() => handleDelete(m.id)}
                                            title="Xóa"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
