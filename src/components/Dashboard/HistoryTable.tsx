import React, { useState } from 'react';
import { Bill, Member } from '@/types/expense';
import EditBillModal from './EditBillModal';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import { useToast } from '@/components/ui/ToastProvider';

interface Props {
  bills: Bill[];
  members: Member[];
  onDelete: () => void;
}

const formatMoney = (amount: number) => amount.toLocaleString('vi-VN') + ' ₫';

export default function HistoryTable({ bills, members, onDelete }: Props) {
  const { confirm } = useConfirm();
  const { addToast } = useToast();
  const [deletingId, setDeletingId] = useState<number | string | null>(null);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);

  // Selection State
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Filters
  const [filterPayer, setFilterPayer] = useState<string>('ALL');
  const [filterType, setFilterType] = useState<string>('ALL');

  // Logic: Sort by Date Descending -> Filter
  const filteredBills = [...bills]
    .sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateB - dateA; // Newest first
    })
    .filter(b => {
      if (filterPayer !== 'ALL' && b.payer !== filterPayer) return false;
      if (filterType !== 'ALL' && b.type !== filterType) return false;
      return true;
    });

  // Bulk Delete Handlers
  const toggleRow = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleAll = () => {
    if (selectedIds.size === filteredBills.length && filteredBills.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredBills.map(b => b.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    const ok = await confirm({
      title: 'Xóa nhiều hóa đơn',
      message: `Bạn có chắc chắn muốn xóa ${selectedIds.size} hóa đơn đã chọn không? hành động này không thể hoàn tác.`,
      type: 'danger',
      confirmText: `Xóa ${selectedIds.size} hóa đơn`,
      cancelText: 'Hủy'
    });

    if (!ok) return;

    setIsBulkDeleting(true);
    let successCount = 0;
    try {
      // Execute in parallel (or sequential if preferred, parallel is faster)
      await Promise.all(
        Array.from(selectedIds).map(async (id) => {
          const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
          if (res.ok) successCount++;
        })
      );

      addToast(`Đã xóa ${successCount}/${selectedIds.size} hóa đơn`, 'success');
      setSelectedIds(new Set());
      onDelete(); // Reload parent
    } catch (e) {
      console.error(e);
      addToast('Có lỗi xảy ra khi xóa', 'error');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleDeleteClick = async (id: number | string) => {
    if (deletingId) return;

    const ok = await confirm({
      title: 'Xác nhận xóa',
      message: 'Bạn có chắc chắn muốn xóa hóa đơn này không? Hành động này không thể hoàn tác.',
      type: 'danger',
      confirmText: 'Xóa',
      cancelText: 'Hủy'
    });

    if (!ok) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      addToast('Đã xóa hóa đơn', 'success');
      onDelete();
    } catch (e) {
      addToast('Xóa thất bại', 'error');
      console.error(e);
    } finally {
      setDeletingId(null);
    }
  };

  // Helper for Payer Avatar
  const getAvatarColor = (name: string) => {
    const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  const isAllSelected = filteredBills.length > 0 && selectedIds.size === filteredBills.length;

  return (
    <>
      <div className="card">
        {/* Header & Filters Toolbar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0, fontSize: '1.5rem' }}>
              <span style={{ fontSize: '1.75rem' }}>🕰️</span> Lịch Sử Chi Tiêu
            </h2>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>

              {/* Bulk Delete Button */}
              {selectedIds.size > 0 && (
                <button
                  onClick={handleBulkDelete}
                  disabled={isBulkDeleting}
                  className="fade-in danger"
                  style={{
                    padding: '0.6rem 1rem', borderRadius: '10px',
                    display: 'flex', alignItems: 'center', gap: '0.5rem'
                  }}
                >
                  {isBulkDeleting ? 'Đang xóa...' : `Xóa (${selectedIds.size})`}
                  {!isBulkDeleting && (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '18px', height: '18px' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                  )}
                </button>
              )}

              <div className="filter-group">
                <span>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style={{ width: '16px', height: '16px' }}>
                    <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                </span>
                <select
                  className="filter-select"
                  value={filterType}
                  onChange={e => setFilterType(e.target.value)}
                >
                  <option value="ALL">Tất cả loại</option>
                  <option value="SHARED">Chung</option>
                  <option value="PRIVATE">Riêng</option>
                </select>
              </div>

              <div className="filter-group">
                <span>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style={{ width: '16px', height: '16px' }}>
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                </span>
                <select
                  className="filter-select"
                  value={filterPayer}
                  onChange={e => setFilterPayer(e.target.value)}
                >
                  <option value="ALL">Tất cả người chi</option>
                  {members.map(m => (
                    <option key={m.id} value={m.name}>{m.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Beautiful Table */}
        <div className="table-container">
          <table className="table-history">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={toggleAll}
                    style={{ width: '18px', height: '18px', cursor: 'pointer', margin: 0 }}
                  />
                </th>
                <th style={{ width: '50px' }}>STT</th>
                <th>Nội dung</th>
                <th>Người chi</th>
                <th className="text-right">Số tiền</th>
                <th>Chia cho</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredBills.map((b, index) => {
                const typeClass = b.type === 'SHARED' ? 'tag tag-shared' : 'tag tag-private';
                const typeLabel = b.type === 'SHARED' ? 'CHUNG' : 'RIÊNG';
                const isSelected = selectedIds.has(b.id);

                return (
                  <tr key={b.id} className={isSelected ? 'selected' : ''}>

                    <td>
                      <div className="flex-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleRow(b.id)}
                          style={{ width: '18px', height: '18px', cursor: 'pointer', margin: 0 }}
                        />
                      </div>
                    </td>

                    <td className="font-bold text-muted text-center" style={{ width: '50px' }}>
                      {index + 1}
                    </td>

                    <td>
                      <div className="flex-col gap-1">
                        <div className="flex-center" style={{ justifyContent: 'flex-start', gap: '0.75rem' }}>
                          <span className={typeClass}>
                            {typeLabel}
                          </span>
                          <span style={{ fontWeight: 600, fontSize: '1.05rem', color: '#1f2937' }}>{b.note}</span>
                        </div>
                        {b.date && (
                          <div className="flex-center" style={{ justifyContent: 'flex-start', gap: '4px', color: '#9ca3af', fontSize: '0.85rem' }}>
                            <span>🗓</span> {new Date(b.date).toLocaleDateString('vi-VN')}
                          </div>
                        )}
                      </div>
                    </td>

                    <td>
                      <div className="flex-center" style={{ justifyContent: 'flex-start', gap: '0.75rem' }}>
                        <div className="avatar" style={{ background: getAvatarColor(b.payer) }}>
                          {b.payer.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium">{b.payer}</span>
                      </div>
                    </td>

                    <td className="text-right">
                      <span style={{ fontWeight: 700, fontSize: '1.1rem', color: '#111827' }}>
                        {formatMoney(b.amount)}
                      </span>
                    </td>

                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {b.type === 'SHARED' ? (
                          <span className="tag" style={{ background: '#e0e7ff', color: '#3730a3' }}>
                            👥 Tất cả
                          </span>
                        ) : (
                          (b.beneficiaries || []).map((name, idx) => (
                            <div key={idx} className="flex-center" style={{ gap: '0.5rem' }}>
                              <div className="avatar avatar-sm" style={{ background: getAvatarColor(name) }}>
                                {name.charAt(0).toUpperCase()}
                              </div>
                              <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{name}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </td>

                    <td>
                      <div className="flex-center" style={{ justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <button
                          className="btn-icon btn-icon-gray"
                          onClick={() => setEditingBill(b)}
                          title="Sửa"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '20px', height: '20px' }}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                          </svg>
                        </button>

                        <button
                          className="btn-icon btn-icon-danger"
                          onClick={() => handleDeleteClick(b.id)}
                          disabled={deletingId === b.id}
                        >
                          {deletingId === b.id ? '...' : (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '20px', height: '20px' }}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {editingBill && (
          <EditBillModal
            bill={editingBill}
            members={members}
            onClose={() => setEditingBill(null)}
            onSave={() => {
              setEditingBill(null);
              onDelete();
            }}
          />
        )}
      </div>
    </>
  );
}
