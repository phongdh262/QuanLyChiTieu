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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Users, UserPlus, Trash2, Edit, Save, X, RotateCcw, History, Search } from "lucide-react";
import { cn } from "@/lib/utils";


export default function MemberManager({ members, workspaceId, onUpdate }: Props) {
    const { confirm } = useConfirm();
    const { addToast } = useToast();
    const [isAdding, setIsAdding] = useState(false);
    const [newName, setNewName] = useState('');
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editName, setEditName] = useState('');

    // Recycle Bin State
    const [isBinOpen, setIsBinOpen] = useState(false);
    const [deletedMembers, setDeletedMembers] = useState<Member[]>([]);
    const [loadingBin, setLoadingBin] = useState(false);

    const fetchDeletedMembers = async () => {
        setLoadingBin(true);
        try {
            const res = await fetch('/api/members/deleted');
            if (res.ok) {
                const data = await res.json();
                setDeletedMembers(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingBin(false);
        }
    };

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
            message: '⚠️ Bạn có chắc chắn muốn xóa thành viên này? Thông tin sẽ được chuyển vào Thùng rác và có thể khôi phục lại để bảo toàn dữ liệu chi tiêu.',
            type: 'danger',
            confirmText: 'Chuyển vào thùng rác',
            cancelText: 'Hủy'
        });
        if (!ok) return;

        try {
            const res = await fetch(`/api/members/${id}`, { method: 'DELETE' });
            if (!res.ok) {
                const json = await res.json();
                throw new Error(json.error || 'Failed');
            }
            addToast('Đã chuyển vào thùng rác', 'success');
            onUpdate();
        } catch (e: any) {
            addToast(e.message || 'Lỗi xóa thành viên', 'error');
        }
    };

    const handleRestore = async (id: number) => {
        try {
            const res = await fetch(`/api/members/${id}/restore`, { method: 'POST' });
            if (!res.ok) throw new Error('Failed');
            onUpdate();
            fetchDeletedMembers();
            addToast('Đã khôi phục thành viên', 'success');
        } catch (e) {
            console.error(e);
            addToast('Lỗi khi khôi phục', 'error');
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
        <Card className="w-full shadow-md hover:shadow-lg transition-all duration-300 border-t-4 border-t-indigo-500 bg-white group/manager">
            <CardHeader className="p-4 pb-2 border-b border-slate-50 bg-gradient-to-r from-indigo-50/50 to-transparent">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2 text-indigo-800">
                        <Users className="w-5 h-5 text-indigo-500" />
                        Thành Viên
                    </CardTitle>
                    <div className="flex items-center gap-1.5">
                        {/* USER RECYCLE BIN */}
                        <Dialog open={isBinOpen} onOpenChange={(open) => {
                            setIsBinOpen(open);
                            if (open) fetchDeletedMembers();
                        }}>
                            <DialogTrigger asChild>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 w-8 p-0 text-slate-400 hover:text-purple-600 hover:bg-purple-50 border-transparent hover:border-purple-100"
                                    title="Thùng rác User"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                                <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2 text-purple-700">
                                        <History className="w-5 h-5 text-purple-500" />
                                        Thành viên đã xóa (Thùng rác)
                                    </DialogTitle>
                                </DialogHeader>
                                <div className="space-y-3 py-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
                                    {loadingBin ? (
                                        <div className="text-center py-8 text-slate-400 italic flex flex-col items-center gap-2">
                                            <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                                            Đang tải dữ liệu...
                                        </div>
                                    ) : deletedMembers.length === 0 ? (
                                        <div className="text-center py-10 text-slate-400 italic">
                                            Không có thành viên nào trong thùng rác.
                                        </div>
                                    ) : (
                                        deletedMembers.map(m => (
                                            <div key={m.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-xs font-bold grayscale">
                                                        {m.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="font-bold text-slate-600 italic line-through opacity-60 font-mono text-sm">{m.name}</span>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={() => handleRestore(m.id)}
                                                    className="h-8 px-3 gap-1.5 bg-white border border-slate-200 hover:bg-green-50 hover:text-green-600 hover:border-green-200 shadow-sm transition-all active:scale-95"
                                                >
                                                    <RotateCcw className="w-3.5 h-3.5" />
                                                    Khôi phục
                                                </Button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </DialogContent>
                        </Dialog>

                        <div className="w-px h-4 bg-slate-200 mx-0.5"></div>

                        <Button
                            size="sm"
                            variant={isAdding ? "secondary" : "default"}
                            onClick={() => setIsAdding(!isAdding)}
                            className={cn(
                                "h-8 text-[11px] font-bold shadow-sm transition-all active:scale-95 uppercase tracking-wide px-3",
                                isAdding ? "bg-slate-200 text-slate-700 hover:bg-slate-300" : "bg-indigo-600 hover:bg-indigo-700 text-white"
                            )}
                        >
                            {isAdding ? <><X className="w-3 h-3 mr-1" /> Huỷ</> : <><UserPlus className="w-3 h-3 mr-1.5" /> Thêm</>}
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-4 pt-4">
                {isAdding && (
                    <div className="flex gap-2 mb-4 animate-in slide-in-from-top-2 duration-300">
                        <div className="relative flex-1">
                            <Users className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                            <Input
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                placeholder="Nhập tên thành viên..."
                                autoFocus
                                className="h-9 text-sm pl-9 border-indigo-100 focus:border-indigo-300 focus:ring-indigo-100"
                                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                            />
                        </div>
                        <Button
                            className="h-9 px-4 bg-green-600 hover:bg-green-700 text-white font-bold shadow-md hover:shadow-lg transition-all active:scale-95"
                            onClick={handleAdd}
                        >
                            Lưu <Save className="w-3.5 h-3.5 ml-1.5" />
                        </Button>
                    </div>
                )}

                <div className="space-y-1.5 h-[280px] overflow-y-auto custom-scrollbar pr-1">
                    {members.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 italic gap-2 opacity-60">
                            <Search className="w-8 h-8 opacity-20" />
                            <p className="text-xs font-semibold uppercase tracking-widest">Danh sách trống</p>
                        </div>
                    ) : (
                        members.map(m => (
                            <div
                                key={m.id}
                                className={cn(
                                    "group flex items-center justify-between p-2.5 rounded-xl hover:bg-indigo-50/50 transition-all duration-200 border border-transparent hover:border-indigo-100 shadow-sm hover:shadow-md",
                                    editingId === m.id ? "bg-blue-50/50 border-blue-200 shadow-inner" : "bg-white"
                                )}
                            >
                                {editingId === m.id ? (
                                    <div className="flex gap-2 w-full animate-in fade-in zoom-in-95 duration-200">
                                        <Input
                                            value={editName}
                                            onChange={e => setEditName(e.target.value)}
                                            className="h-8 text-sm flex-1 bg-white border-blue-200"
                                            autoFocus
                                            onKeyDown={(e) => e.key === 'Enter' && saveEdit(m.id)}
                                        />
                                        <Button size="icon" className="h-8 w-8 bg-green-600 hover:bg-green-700 text-white shadow-sm" onClick={() => saveEdit(m.id)}>
                                            <Save className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-500 hover:bg-slate-200" onClick={() => setEditingId(null)}>
                                            <X className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 text-white flex items-center justify-center text-xs font-black shadow-inner">
                                                {m.name.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="font-bold text-slate-700 text-sm tracking-tight">{m.name}</span>
                                        </div>
                                        <div className="flex gap-1 items-center opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-1 group-hover:translate-x-0">
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-8 w-8 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                                                onClick={() => startEdit(m)}
                                                title="Sửa"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                                onClick={() => handleDelete(m.id)}
                                                title="Xóa"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
