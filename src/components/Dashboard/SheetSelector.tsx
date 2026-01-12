'use client';
import React, { useState } from 'react';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import { useToast } from '@/components/ui/ToastProvider';

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
            // Parent will likely reset currentSheetId if it was deleted, but we trigger reload
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
            onCreated(); // Reload to update name in list
        } catch (e) {
            console.error(e);
            addToast('Lỗi khi cập nhật tên', 'error');
        }
    };

    return (
        <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', height: '40px' }}>
            {isEditing ? (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        style={{ margin: 0, padding: '0.5rem', width: '200px', fontWeight: 'bold' }}
                        autoFocus
                    />
                    <button onClick={saveEdit} style={{ width: 'auto', padding: '0.5rem 1rem' }}>Lưu</button>
                    <button onClick={() => setIsEditing(false)} className="secondary" style={{ width: 'auto', padding: '0.5rem 1rem' }}>Hủy</button>
                </div>
            ) : isCreating ? (
                <div className="fade-in" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', width: '100%' }}>
                    <input type="number" value={month} onChange={e => setMonth(parseInt(e.target.value))} style={{ width: '60px', margin: 0, padding: '0.5rem' }} min={1} max={12} placeholder="T" />
                    <span style={{ fontWeight: 'bold' }}>/</span>
                    <input type="number" value={year} onChange={e => setYear(parseInt(e.target.value))} style={{ width: '80px', margin: 0, padding: '0.5rem' }} placeholder="Năm" />

                    <button onClick={handleCreate} style={{ width: 'auto', margin: 0, padding: '0.5rem 1rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px' }}>Tạo</button>

                    <button
                        onClick={() => setIsCreating(false)}
                        title="Hủy"
                        style={{
                            width: '36px',
                            height: '36px',
                            padding: 0,
                            borderRadius: '8px',
                            background: '#fee2e2',
                            border: '1px solid #fecaca',
                            color: 'var(--danger)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s',
                        }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '20px', height: '20px' }}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            ) : (
                <>
                    <select
                        value={currentSheetId || ''}
                        onChange={(e) => onChange(parseInt(e.target.value))}
                        style={{ width: 'auto', flex: 1, minWidth: '0', marginBottom: 0, padding: '0.5rem', fontWeight: 'bold', fontSize: '1.1rem' }}
                    >
                        {sheets.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>

                    <button
                        onClick={startEdit}
                        title="Đổi tên"
                        className="h-9 w-9 p-0 flex items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition-all shadow-sm"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '18px', height: '18px' }}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                        </svg>
                    </button>

                    <button
                        onClick={handleDelete}
                        title="Xóa tháng này"
                        className="h-9 w-9 p-0 flex items-center justify-center rounded-md border border-red-200 bg-red-50 text-red-500 hover:text-red-700 hover:bg-red-100 hover:border-red-300 transition-all shadow-sm"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '18px', height: '18px' }}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                        </svg>
                    </button>

                    <div style={{ width: '1px', height: '20px', background: '#e2e8f0', margin: '0 0.25rem', flexShrink: 0 }}></div>

                    <button
                        onClick={() => setIsCreating(true)}
                        title="Thêm tháng mới"
                        className="h-9 w-9 p-0 flex items-center justify-center rounded-md border border-blue-200 bg-blue-50 text-blue-600 hover:text-blue-700 hover:bg-blue-100 hover:border-blue-300 transition-all shadow-sm"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '20px', height: '20px' }}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                    </button>
                </>
            )}
        </div>
    );
}
