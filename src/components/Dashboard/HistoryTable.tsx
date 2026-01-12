import React, { useState } from 'react';
import { Bill, Member } from '@/types/expense';
import EditBillModal from './EditBillModal';
import { useConfirm } from '@/components/UI/ConfirmProvider';
import { useToast } from '@/components/UI/ToastProvider';

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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0, fontSize: '1.5rem' }}>
              <span style={{ fontSize: '1.75rem' }}>🕰️</span> Lịch Sử Chi Tiêu
            </h2>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>

              {/* Bulk Delete Button */}
              {selectedIds.size > 0 && (
                <button
                  onClick={handleBulkDelete}
                  disabled={isBulkDeleting}
                  className="fade-in"
                  style={{
                    background: '#fee2e2', color: '#ef4444', border: 'none',
                    padding: '0.6rem 1rem', borderRadius: '10px', fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer'
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

              <div className="filter-group" style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', pointerEvents: 'none', color: '#6b7280' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style={{ width: '16px', height: '16px' }}>
                    <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                </span>
                <select
                  value={filterType}
                  onChange={e => setFilterType(e.target.value)}
                  style={{
                    padding: '0.6rem 1rem 0.6rem 2.2rem',
                    borderRadius: '10px',
                    border: '1px solid #e5e7eb',
                    background: '#f9fafb',
                    fontSize: '0.9rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    outline: 'none',
                    minWidth: '130px'
                  }}
                >
                  <option value="ALL">Tất cả loại</option>
                  <option value="SHARED">Chung</option>
                  <option value="PRIVATE">Riêng</option>
                </select>
              </div>

              <div className="filter-group" style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', pointerEvents: 'none', color: '#6b7280' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style={{ width: '16px', height: '16px' }}>
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                </span>
                <select
                  value={filterPayer}
                  onChange={e => setFilterPayer(e.target.value)}
                  style={{
                    padding: '0.6rem 1rem 0.6rem 2.2rem',
                    borderRadius: '10px',
                    border: '1px solid #e5e7eb',
                    background: '#f9fafb',
                    fontSize: '0.9rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    outline: 'none',
                    minWidth: '130px'
                  }}
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
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'separate', borderSpacing: '0 8px', width: '100%' }}>
            <thead>
              <tr>
                <th style={{ padding: '0 1rem', border: 'none', width: '40px' }}>
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={toggleAll}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                </th>
                <th style={{ color: '#9ca3af', fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase', padding: '0 1rem', border: 'none', width: '50px' }}>STT</th>
                <th style={{ color: '#9ca3af', fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase', padding: '0 1rem', border: 'none' }}>Nội dung</th>
                <th style={{ color: '#9ca3af', fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase', padding: '0 1rem', border: 'none' }}>Người chi</th>
                <th style={{ color: '#9ca3af', fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase', padding: '0 1rem', border: 'none', textAlign: 'right' }}>Số tiền</th>
                <th style={{ color: '#9ca3af', fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase', padding: '0 1rem', border: 'none' }}>Chia cho</th>
                <th style={{ border: 'none' }}></th>
              </tr>
            </thead>
            <tbody>
              {filteredBills.map((b, index) => {
                const typeColor = b.type === 'SHARED' ? { bg: '#dbeafe', text: '#1e40af' } : { bg: '#ffedd5', text: '#9a3412' };
                const typeLabel = b.type === 'SHARED' ? 'CHUNG' : 'RIÊNG';
                const isSelected = selectedIds.has(b.id);

                return (
                  <tr key={b.id} style={{ background: isSelected ? '#f0fdf4' : 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', transition: 'background 0.1s' }}>

                    <td style={{ padding: '1rem', borderTopLeftRadius: '12px', borderBottomLeftRadius: '12px', border: '1px solid #f3f4f6', borderRight: 'none' }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleRow(b.id)}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                    </td>

                    <td style={{ padding: '1rem', border: '1px solid #f3f4f6', borderLeft: 'none', borderRight: 'none', fontWeight: 600, color: '#6b7280' }}>
                      {index + 1}
                    </td>

                    <td style={{ padding: '1rem', border: '1px solid #f3f4f6', borderRight: 'none', borderLeft: 'none' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '999px',
                            backgroundColor: typeColor.bg,
                            color: typeColor.text,
                            letterSpacing: '0.5px'
                          }}>
                            {typeLabel}
                          </span>
                          <span style={{ fontWeight: 600, fontSize: '1.05rem', color: '#1f2937' }}>{b.note}</span>
                        </div>
                        {b.date && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#9ca3af', fontSize: '0.85rem', marginLeft: '2px' }}>
                            <span>🗓</span> {new Date(b.date).toLocaleDateString('vi-VN')}
                          </div>
                        )}
                      </div>
                    </td>

                    <td style={{ padding: '1rem', border: '1px solid #f3f4f6', borderLeft: 'none', borderRight: 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          width: '32px', height: '32px', borderRadius: '50%',
                          background: getAvatarColor(b.payer),
                          color: 'white', fontWeight: 'bold', fontSize: '0.9rem',
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                          {b.payer.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 500, color: '#374151' }}>{b.payer}</span>
                      </div>
                    </td>

                    <td style={{ padding: '1rem', textAlign: 'right', border: '1px solid #f3f4f6', borderLeft: 'none', borderRight: 'none' }}>
                      <span style={{ fontWeight: 700, fontSize: '1.1rem', color: '#111827' }}>
                        {formatMoney(b.amount)}
                      </span>
                    </td>

                    <td style={{ padding: '1rem', border: '1px solid #f3f4f6', borderLeft: 'none', borderRight: 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {b.type === 'SHARED' ? (
                          <span style={{
                            background: 'linear-gradient(135deg, #e0e7ff 0%, #d1e0ff 100%)', // subtle blue gradient
                            color: '#3730a3',
                            padding: '4px 10px', borderRadius: '20px',
                            fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px'
                          }}>
                            👥 Tất cả
                          </span>
                        ) : (
                          (b.beneficiaries || []).map((name, idx) => (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <div style={{
                                width: '28px', height: '28px', borderRadius: '50%',
                                background: getAvatarColor(name), color: 'white',
                                fontSize: '0.8rem', fontWeight: 'bold',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}>
                                {name.charAt(0).toUpperCase()}
                              </div>
                              <span style={{ fontSize: '0.9rem', fontWeight: 500, color: '#374151' }}>{name}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </td>

                    <td style={{ padding: '1rem', textAlign: 'right', borderTopRightRadius: '12px', borderBottomRightRadius: '12px', border: '1px solid #f3f4f6', borderLeft: 'none' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.5rem' }}>
                        <button
                          onClick={() => setEditingBill(b)}
                          onClick={() => handleDeleteClick(b.id)}
                          disabled={deletingId === b.id}
                          style={{
                            width: '36px',
                            height: '36px',
                            padding: 0,
                            borderRadius: '10px',
                            background: '#fee2e2', // Light red
                            border: 'none',
                            color: '#ef4444',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: deletingId === b.id ? 0.7 : 1,
                            transition: 'all 0.2s',
                            cursor: 'pointer'
                          }}
                          onMouseOver={(e) => { e.currentTarget.style.background = '#fecaca'; e.currentTarget.style.color = '#dc2626'; }}
                          onMouseOut={(e) => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#ef4444'; }}
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
