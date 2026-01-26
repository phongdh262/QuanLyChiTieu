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
import { Users, UserPlus, Trash2, Edit, Save, X, RotateCcw, History, Search, Lock, Key } from "lucide-react";
import { cn } from "@/lib/utils";


export default function MemberManager({ members, workspaceId, onUpdate }: Props) {
    const { confirm } = useConfirm();
    const { addToast } = useToast();
    const [isAdding, setIsAdding] = useState(false);
    const [newName, setNewName] = useState('');
    const [newUsername, setNewUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');
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
        if (!newName) {
            addToast('Name is required', 'warning');
            return;
        }
        try {
            const res = await fetch('/api/members', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    workspaceId,
                    name: newName,
                    username: newUsername || undefined,
                    password: newPassword || undefined
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to add member');
            }

            setNewName('');
            setNewUsername('');
            setNewPassword('');
            setIsAdding(false);
            onUpdate(); // Reload members list
            addToast('Member added', 'success');
        } catch (e: any) {
            console.error(e);
            addToast(e.message || 'Error adding member', 'error');
        }
    };

    const handleDelete = async (id: number) => {
        const ok = await confirm({
            title: 'Delete Member',
            message: '⚠️ Are you sure you want to delete this member? They will be moved to the Recycle Bin and can be restored.',
            type: 'danger',
            confirmText: 'Move to Trash',
            cancelText: 'Cancel'
        });
        if (!ok) return;

        try {
            const res = await fetch(`/api/members/${id}`, { method: 'DELETE' });
            if (!res.ok) {
                const json = await res.json();
                throw new Error(json.error || 'Failed');
            }
            addToast('Moved to Trash', 'success');
            onUpdate();
        } catch (e: any) {
            addToast(e.message || 'Error deleting member', 'error');
        }
    };

    const handleRestore = async (id: number) => {
        try {
            const res = await fetch(`/api/members/${id}/restore`, { method: 'POST' });
            if (!res.ok) throw new Error('Failed');
            onUpdate();
            fetchDeletedMembers();
            addToast('Member restored', 'success');
        } catch (e) {
            console.error(e);
            addToast('Error restoring member', 'error');
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
            addToast('Name updated', 'success');
        } catch (e) {
            console.error(e);
            addToast('Error updating', 'error');
        }
    };

    return (
        <Card className="w-full premium-card overflow-hidden border-none soft-shadow group/manager">
            <CardHeader className="p-4 pb-4 border-b border-indigo-50/50 bg-gradient-to-br from-indigo-50/50 via-white to-transparent">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-3 text-slate-800">
                        <div className="p-2 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl shadow-lg shadow-indigo-100 group-hover/manager:scale-110 group-hover/manager:rotate-3 transition-all duration-500">
                            <Users className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-black tracking-tight">Members</span>
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
                                    title="Recycle Bin"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                                <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2 text-purple-700">
                                        <History className="w-5 h-5 text-purple-500" />
                                        Deleted Members (Trash)
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
                                            No members in trash.
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
                                                    Restore
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
                            {isAdding ? <><X className="w-3 h-3 mr-1" /> Cancel</> : <><UserPlus className="w-3 h-3 mr-1.5" /> Add</>}
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-4 pt-4">
                {isAdding && (
                    <div className="flex flex-col gap-3 mb-6 p-4 rounded-2xl bg-indigo-50/30 border border-indigo-100 animate-in slide-in-from-top-2 duration-300">
                        <div className="grid grid-cols-1 gap-3">
                            <div className="relative">
                                <Users className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                                <Input
                                    value={newName}
                                    onChange={e => setNewName(e.target.value)}
                                    placeholder="Enter full name..."
                                    autoFocus
                                    className="h-9 text-sm pl-9 border-white bg-white/80 focus:bg-white transition-all shadow-sm"
                                    onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="relative">
                                    <Lock className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                                    <Input
                                        value={newUsername}
                                        onChange={e => setNewUsername(e.target.value)}
                                        placeholder="Username (optional)"
                                        className="h-9 text-sm pl-9 border-white bg-white/80 focus:bg-white transition-all shadow-sm"
                                        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                                    />
                                </div>
                                <div className="relative">
                                    <Key className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                                    <Input
                                        type="password"
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                        placeholder="Password (optional)"
                                        className="h-9 text-sm pl-9 border-white bg-white/80 focus:bg-white transition-all shadow-sm"
                                        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                    setNewName('');
                                    setNewUsername('');
                                    setNewPassword('');
                                    setIsAdding(false);
                                }}
                                className="h-8 text-slate-500 hover:text-slate-700"
                            >
                                Cancel
                            </Button>
                            <Button
                                className="h-8 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md hover:shadow-indigo-200 transition-all active:scale-95 text-xs uppercase tracking-wider"
                                onClick={handleAdd}
                            >
                                Create Member <Save className="w-3 h-3 ml-2" />
                            </Button>
                        </div>
                    </div>
                )}

                <div className="space-y-1.5 h-[280px] overflow-y-auto custom-scrollbar pr-1">
                    {members.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 italic gap-2 opacity-60">
                            <Search className="w-8 h-8 opacity-20" />
                            <p className="text-xs font-semibold uppercase tracking-widest">No members found</p>
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
                                                title="Edit"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                                onClick={() => handleDelete(m.id)}
                                                title="Delete"
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
