'use client';
import React, { useState } from 'react';
import { Member } from '@/types/expense';
import { useConfirm } from '@/components/UI/ConfirmProvider';
import { useToast } from '@/components/UI/ToastProvider';

interface Props {
    members: Member[];
    workspaceId: number;
    onUpdate: () => void;
}

export default function MemberManager({ members, workspaceId, onUpdate }: Props) {
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
            addToast('Đã cập nhật tên', 'success');
        } catch (e) {
            console.error(e);
            addToast('Lỗi cập nhật', 'error');
        }
    };

    return (
        <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2>👥 Thành Viên</h2>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    style={{ width: 'auto', padding: '0.25rem 0.75rem', fontSize: '0.85rem' }}
                >
                    {isAdding ? 'Đóng' : '+ Thêm'}
                </button>
            </div>

            {isAdding && (
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                    <input
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        placeholder="Tên thành viên..."
                        autoFocus
                    />
                    <button onClick={handleAdd} style={{ width: 'auto' }}>Lưu</button>
                </div>
            )}

            <ul style={{ listStyle: 'none', padding: 0 }}>
                {members.map(m => (
                    <li key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #f1f5f9' }}>
                        {editingId === m.id ? (
                            <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                                <input value={editName} onChange={e => setEditName(e.target.value)} style={{ margin: 0 }} />
                                <button onClick={() => saveEdit(m.id)} style={{ width: 'auto', padding: '0.25rem 0.5rem' }}>Lưu</button>
                                <button onClick={() => setEditingId(null)} className="secondary" style={{ width: 'auto', padding: '0.25rem 0.5rem' }}>Hủy</button>
                            </div>
                        ) : (
                            <>
                                <span style={{ fontWeight: 500 }}>{m.name}</span>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button
                                        onClick={() => startEdit(m)}
                                        title="Sửa"
                                        style={{
                                            width: '32px',
                                            height: '32px',
                                            padding: 0,
                                            borderRadius: '6px',
                                            background: 'white',
                                            border: '1px solid var(--border-color)',
                                            color: 'var(--primary)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '16px', height: '16px' }}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={() => handleDelete(m.id)}
                                        title="Xóa"
                                        style={{
                                            width: '32px',
                                            height: '32px',
                                            padding: 0,
                                            borderRadius: '6px',
                                            background: '#fee2e2',
                                            border: '1px solid #fecaca',
                                            color: 'var(--danger)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '16px', height: '16px' }}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                        </svg>
                                    </button>
                                </div>
                            </>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}
