'use client';

import React, { useState } from 'react';
import { Bill, Member, CurrentUser } from '@/types/expense';
import EditBillModal from './EditBillModal';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import { useToast } from '@/components/ui/ToastProvider';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  ChevronDown,
  Clock,
  Trash2,
  Edit
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  bills: Bill[];
  members: Member[];
  onDelete: () => void;
  onUpdate?: () => void;
  currentUser: CurrentUser | null;
}

const formatMoney = (amount: number) => amount.toLocaleString('vi-VN') + ' ₫';

export default function HistoryTable({ bills, members, onDelete, onUpdate, currentUser }: Props) {
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
  const [searchTerm, setSearchTerm] = useState<string>('');

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
      const note = b.note || '';
      if (searchTerm && !note.toLowerCase().includes(searchTerm.toLowerCase())) return false;
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
      await Promise.all(
        Array.from(selectedIds).map(async (id) => {
          const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
          if (res.ok) successCount++;
        })
      );

      addToast(`Đã xóa ${successCount}/${selectedIds.size} hóa đơn`, 'success');
      setSelectedIds(new Set());
      onDelete();
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

  const handleToggleSettle = async (bill: Bill, memberName?: string) => {
    // Permission Check: Strictly Payer only
    const canSettleGlobal = currentUser?.name === bill.payer;
    let forceReject = false;

    // Special logic for unmarking a PAID split
    const split = memberName ? bill.splits?.find(s => s.member.name === memberName) : null;
    const isCurrentlyPaid = memberName ? split?.isPaid : bill.isSettled;

    if (isCurrentlyPaid && !canSettleGlobal && currentUser?.name !== memberName) {
      addToast('Bạn không có quyền hủy xác nhận thanh toán này!', 'warning');
      return;
    }

    // CASE: Payer marks an UNPAID split as PAID
    if (memberName && !isCurrentlyPaid && currentUser?.name === bill.payer) {
      const result = await confirm({
        title: 'Xác nhận khoản thu',
        message: `Bạn muốn xác nhận ${memberName} đã trả tiền hay từ chối yêu cầu này?`,
        type: 'info',
        confirmText: 'Xác nhận đã nhận',
        cancelText: 'Hủy',
        rejectText: 'Không xác nhận' // New 3rd option
      });

      if (result === false) return; // Cancel

      if (result === 'reject') {
        forceReject = true;
      }

      // If 'reject', we treat it as strictly *rejecting* a request (if any) or doing nothing if manual.
      // Actually, if manual marking, 'Not Confirming' just means cancelling.
      // But if it's a PENDING request, we need to handle Reject vs Confirm.
      // Wait, this block is for UNPAID split. So Payer is initiating. 
      // "Rejecting" implies they don't want to mark it paid. So essentially Cancel.
      // The USER asked for: "Xác nhận" or "Không xác nhận" when clicking on a PENDING avatar?
      // Let's verify where Pending logic is handled.
    }

    if (isCurrentlyPaid) {
      const ok = await confirm({
        title: 'Hủy xác nhận thanh toán?',
        message: `Bạn có chắc chắn muốn chuyển trạng thái khoản của ${memberName || 'tất cả'} sang 'Chưa trả' không?`,
        type: 'danger',
        confirmText: 'Đồng ý',
        cancelText: 'Hủy'
      });
      if (!ok) return;
    }

    try {
      const payload: { isSettled: boolean; paymentFor?: string; isPaid?: boolean } = { isSettled: !bill.isSettled };

      if (memberName) {
        if (split) {
          payload.paymentFor = memberName;
          // Standard toggle
          let nextState = !split.isPaid;

          if (forceReject) {
            nextState = false;
          }

          // Special Case: Debtor cancelling their own PENDING request
          // If it's Pending (and logically isPaid is false), clicking it should revert to false (Unpaid), not toggle to true.
          if (split.isPending && currentUser?.name === memberName) {
            nextState = false;
          }

          payload.isPaid = nextState;
        }
      }

      const res = await fetch(`/api/expenses/${bill.id}/settle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        if (res.status === 403) throw new Error('Không có quyền thực hiện');
        throw new Error('Failed to update status');
      }

      const data = await res.json();

      if (data.isPending) {
        addToast('Đã gửi yêu cầu xác nhận tới người chi tiền. Chờ xác nhận để cập nhật số dư.', 'warning');
      } else {
        addToast('Đã cập nhật trạng thái thanh toán', 'success');
      }

      if (onDelete) onDelete(); // Reload
      if (onUpdate) onUpdate();
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'Lỗi cập nhật trạng thái';
      addToast(errorMessage, 'error');
      console.error(e);
    }
  };

  // Helper for Payer Avatar
  const getAvatarColor = (name: string) => {
    const colors = ['bg-blue-500', 'bg-red-500', 'bg-green-500', 'bg-amber-500', 'bg-purple-500', 'bg-pink-500'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  const isAllSelected = filteredBills.length > 0 && selectedIds.size === filteredBills.length;

  return (
    <>
      <Card className="w-full premium-card border-none soft-shadow group/history overflow-visible">
        <CardHeader className="pb-6 bg-gradient-to-br from-indigo-50/50 via-white to-transparent border-b border-indigo-50/50">
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
            <CardTitle className="text-xl flex items-center gap-3 text-slate-800">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-100 group-hover/history:scale-110 group-hover/history:rotate-3 transition-all duration-500">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold tracking-tight text-slate-800">Lịch Sử Chi Tiêu</span>
            </CardTitle>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {/* Bulk Delete Button */}
              {selectedIds.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDelete}
                  disabled={isBulkDeleting}
                  className="animate-in fade-in zoom-in duration-200 shadow-md"
                >
                  {isBulkDeleting ? <span className="animate-spin mr-2">⏳</span> : <Trash2 className="w-4 h-4 mr-1" />}
                  Xóa ({selectedIds.size})
                </Button>
              )}

              <div className="relative flex-1 md:w-48 lg:w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm nội dung..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 h-9 bg-white shadow-sm"
                />
              </div>

              <div className="flex items-center gap-3">
                <div className="relative group/sel">
                  <select
                    className="h-9 w-[160px] appearance-none rounded-xl border border-slate-100 bg-white/50 pl-4 pr-10 text-xs font-bold uppercase tracking-wide text-slate-500 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all cursor-pointer hover:bg-white"
                    value={filterType}
                    onChange={e => setFilterType(e.target.value)}
                  >
                    <option value="ALL">Tất cả loại</option>
                    <option value="SHARED">Chung</option>
                    <option value="PRIVATE">Riêng</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none group-hover/sel:text-indigo-500 transition-colors" />
                </div>

                <div className="relative group/sel">
                  <select
                    className="h-9 w-[240px] appearance-none rounded-xl border border-slate-100 bg-white/50 pl-4 pr-10 text-xs font-bold uppercase tracking-wide text-slate-500 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all cursor-pointer hover:bg-white"
                    value={filterPayer}
                    onChange={e => setFilterPayer(e.target.value)}
                  >
                    <option value="ALL">Người chi: Tất cả</option>
                    {members.map(m => (
                      <option key={m.id} value={m.name}>{m.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none group-hover/sel:text-indigo-500 transition-colors" />
                </div>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50 border-b border-indigo-100/50">
                <TableRow className="hover:bg-transparent border-none">
                  <TableHead className="w-[50px] text-center p-2">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={toggleAll}
                      className="h-4 w-4 rounded-lg border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                    />
                  </TableHead>
                  <TableHead className="w-[110px] text-[10px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap px-4">Ngày</TableHead>
                  <TableHead className="w-auto min-w-[250px] text-[10px] font-bold uppercase tracking-wider text-slate-500 px-4">Nội dung</TableHead>
                  <TableHead className="w-[150px] text-right text-[10px] font-bold uppercase tracking-wider text-slate-500 px-4">Số tiền</TableHead>
                  <TableHead className="w-[180px] text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 pl-6">Người chi</TableHead>
                  <TableHead className="w-[30%] min-w-[300px] text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 px-4">Chia cho</TableHead>
                  <TableHead className="w-[120px] text-center text-[10px] font-bold uppercase tracking-wider text-slate-500">Trạng thái</TableHead>
                  <TableHead className="w-[70px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBills.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-muted-foreground italic text-sm">
                      Không có dữ liệu hóa đơn nào.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBills.map((b) => {
                    const isSelected = selectedIds.has(b.id);
                    // Permission: Strictly Payer only
                    const isPayer = currentUser?.name === b.payer;
                    const canDelete = isPayer;

                    return (
                      <TableRow
                        key={b.id}
                        className={cn(
                          "group transition-all duration-500 border-b border-indigo-50/50 last:border-0",
                          isSelected ? "bg-indigo-50/60" : "bg-white hover:bg-indigo-50/30",
                          b.isSettled ? "opacity-60 bg-slate-50/30 active:scale-[0.99]" : "active:scale-[0.995]"
                        )}
                      >
                        <TableCell className="text-center p-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleRow(b.id)}
                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                          />
                        </TableCell>
                        <TableCell className="py-5">
                          <div className="flex flex-col">
                            <span className={cn("text-sm font-semibold text-slate-700 font-mono", b.isSettled ? "text-slate-400 line-through" : "")}>
                              {b.date ? new Date(b.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) : '-'}
                            </span>
                            <span className={cn(
                              "text-[9px] uppercase font-bold mt-1.5 w-fit px-2 py-0.5 rounded-md tracking-wider border",
                              b.type === 'SHARED' ? "text-indigo-600 bg-indigo-50 border-indigo-100" : "text-amber-600 bg-amber-50 border-amber-100"
                            )}>
                              {b.type === 'SHARED' ? 'CHUNG' : 'RIÊNG'}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="py-4">
                          <div className="flex items-center gap-2">
                            <span className={cn("text-base font-medium", b.isSettled ? "text-slate-500 line-through decoration-slate-400" : "text-slate-800")}>
                              {b.note}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="text-right py-5">
                          <span className={cn("text-base font-bold tabular-nums tracking-tight", b.isSettled ? "text-slate-300 line-through" : "text-slate-900")}>
                            {formatMoney(b.amount)}
                          </span>
                        </TableCell>

                        <TableCell className="pl-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-sm ring-2 ring-white", getAvatarColor(b.payer))}>
                              {b.payer.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm text-slate-700 font-medium truncate max-w-[120px]">{b.payer}</span>
                          </div>
                        </TableCell>

                        <TableCell className="py-4">
                          <div className="flex flex-wrap items-center gap-2">
                            {(b.beneficiaries || []).map((name, idx) => {
                              // Find split status
                              const split = b.splits?.find(s => s.member.name === name);
                              const isPaid = split?.isPaid;
                              const isPending = split?.isPending;
                              const paidAt = split?.paidAt;

                              // Permission Logic:
                              // - If Paid: Only Payer/Admin can untoggle
                              // - If Pending: Debtor can cancel, Payer/Admin can confirm
                              // - If Unpaid: Both can mark as Paid (Debtor -> Pending, Payer -> Paid)
                              const isBeneficiary = currentUser?.name === name;

                              // UNLOCKED: Allow both Payer and Beneficiary to toggle status (Undo if needed)
                              const canToggle = isPayer || isBeneficiary;

                              const formattedPaidAt = paidAt ? new Date(paidAt).toLocaleString('vi-VN', {
                                day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                              }) : '';

                              return (
                                <button key={idx}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleSettle(b, name);
                                  }}
                                  disabled={!canToggle}
                                  className={cn(
                                    "flex items-center gap-2 border rounded-full pl-1 pr-3 py-1 transition-all duration-200",
                                    canToggle ? "hover:shadow-md active:scale-95 cursor-pointer" : "cursor-not-allowed opacity-70",
                                    isPaid
                                      ? "bg-green-50 border-green-200 hover:bg-green-100"
                                      : isPending
                                        ? "bg-amber-50 border-amber-200 hover:bg-amber-100"
                                        : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                                  )}
                                  title={
                                    !canToggle
                                      ? (isPaid ? 'Đã xác nhận thanh toán (Không thể hoàn tác)' : 'Bạn không có quyền thao tác phần này')
                                      : isPending
                                        ? `${name} đã trả (Xác nhận lúc: ${formattedPaidAt}).${currentUser?.name === name ? ' Click để hoàn tác.' : ''}`
                                        : isPending
                                          ? `${name} đang chờ người chi xác nhận. Click để hủy yêu cầu.`
                                          : `Đánh dấu ${name} đã trả`
                                  }
                                >
                                  <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-white font-bold text-[9px] relative", getAvatarColor(name))}>
                                    {name.charAt(0).toUpperCase()}
                                    {isPaid && (
                                      <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full w-3 h-3 border-2 border-white flex items-center justify-center">
                                        <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                                        </svg>
                                      </div>
                                    )}
                                    {isPending && !isPaid && (
                                      <div className="absolute -bottom-1 -right-1 bg-amber-500 rounded-full w-3 h-3 border-2 border-white flex items-center justify-center">
                                        <Clock className="w-2 h-2 text-white" />
                                      </div>
                                    )}
                                  </div>
                                  <span className={cn(
                                    "text-xs font-semibold",
                                    isPaid ? "text-green-700" : isPending ? "text-amber-700" : "text-slate-700"
                                  )}>
                                    {name}
                                    {isPending && !isPaid && <span className="ml-1 text-[9px] opacity-70">(Chờ...)</span>}
                                  </span>
                                </button>
                              )
                            })}
                          </div>
                        </TableCell>

                        {/* Status Column - Global Toggle */}
                        <TableCell className="text-center py-4">
                          <button
                            onClick={() => handleToggleSettle(b)}
                            disabled={!isPayer}
                            className={cn(
                              "relative inline-flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-100",
                              isPayer ? "cursor-pointer" : "cursor-not-allowed opacity-40 grayscale",
                              b.isSettled
                                ? "bg-green-100 text-green-600 hover:bg-green-200 ring-1 ring-green-200 shadow-sm"
                                : "bg-white text-slate-300 border-2 border-slate-200 hover:border-blue-400 hover:text-blue-500"
                            )}
                            title={!isPayer ? "Chỉ người chi mới có quyền xác nhận toàn bộ" : (b.isSettled ? "Hóa đơn đã quyết toán xong (Trạng thái đã khóa)" : "Đánh dấu tất cả đã trả")}
                          >
                            {b.isSettled ? (
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                                <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <div className="w-1.5 h-1.5 bg-current rounded-full" />
                            )}
                          </button>
                        </TableCell>

                        <TableCell className="py-4 text-right pr-4">
                          <div className="flex items-center justify-end gap-1.5 transition-opacity duration-300">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all active:scale-90"
                              onClick={() => setEditingBill(b)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <div title={canDelete ? "Xóa hóa đơn" : `Chỉ người chi (${b.payer}) mới có quyền xóa`}>
                              <Button
                                variant="ghost"
                                size="icon"
                                className={cn(
                                  "h-8 w-8 rounded-lg transition-all",
                                  canDelete
                                    ? "text-slate-400 hover:text-red-600 hover:bg-red-50"
                                    : "text-slate-200 cursor-not-allowed hover:bg-transparent opacity-50"
                                )}
                                onClick={() => canDelete && handleDeleteClick(b.id)}
                                disabled={!canDelete}
                              >
                                {deletingId === b.id ? (
                                  <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </Button>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>

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
      </Card>
    </>
  );
}
