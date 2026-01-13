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
  Trash2,
  Edit,
  Clock,
  Search
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
    // Permission Check
    const canSettleGlobal = currentUser?.role === 'ADMIN' || currentUser?.name === bill.payer;

    // Special logic for unmarking a PAID split
    const split = memberName ? bill.splits?.find(s => s.member.name === memberName) : null;
    const isCurrentlyPaid = memberName ? split?.isPaid : bill.isSettled;

    if (isCurrentlyPaid && !canSettleGlobal) {
      addToast('Chỉ người chi hoặc Admin mới có quyền hủy xác nhận thanh toán!', 'warning');
      return;
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
      const payload: any = { isSettled: !bill.isSettled };

      if (memberName) {
        if (split) {
          payload.paymentFor = memberName;
          payload.isPaid = !split.isPaid;
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
    } catch (e: any) {
      addToast(e.message || 'Lỗi cập nhật trạng thái', 'error');
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
      <Card className="w-full shadow-lg border-t-4 border-t-blue-500 bg-white">
        <CardHeader className="pb-4 bg-gradient-to-r from-blue-50/50 to-transparent">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <CardTitle className="text-xl flex items-center gap-2 text-blue-800">
              <Clock className="w-6 h-6 text-blue-600" />
              Lịch Sử Chi Tiêu
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

              <div className="relative flex-1 md:w-40 lg:w-56">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm nội dung..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 h-9 bg-white shadow-sm"
                />
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <select
                    className="h-9 w-[150px] rounded-md border border-input bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 font-medium"
                    value={filterType}
                    onChange={e => setFilterType(e.target.value)}
                  >
                    <option value="ALL">Tất cả loại</option>
                    <option value="SHARED">Chung</option>
                    <option value="PRIVATE">Riêng</option>
                  </select>
                </div>

                <div className="relative">
                  <select
                    className="h-9 w-[180px] rounded-md border border-input bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 font-medium"
                    value={filterPayer}
                    onChange={e => setFilterPayer(e.target.value)}
                  >
                    <option value="ALL">Người chi: Tất cả</option>
                    {members.map(m => (
                      <option key={m.id} value={m.name}>{m.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50 border-b border-slate-100">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[50px] text-center p-2">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={toggleAll}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                    />
                  </TableHead>
                  <TableHead className="w-[110px] text-xs font-semibold uppercase text-slate-500 whitespace-nowrap">Ngày</TableHead>
                  <TableHead className="w-auto min-w-[250px] text-xs font-semibold uppercase text-slate-500">Nội dung</TableHead>
                  <TableHead className="w-[150px] text-right text-xs font-semibold uppercase text-slate-500">Số tiền</TableHead>
                  <TableHead className="w-[180px] text-left text-xs font-semibold uppercase text-slate-500 pl-6">Người chi</TableHead>
                  <TableHead className="w-[30%] min-w-[300px] text-left text-xs font-semibold uppercase text-slate-500">Chia cho</TableHead>
                  <TableHead className="w-[120px] text-center text-xs font-semibold uppercase text-slate-500">Trạng thái</TableHead>
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
                    // Permission for Layout Global Settle (Only Payer/Admin)
                    const canSettleGlobal = currentUser?.role === 'ADMIN' || currentUser?.name === b.payer;

                    return (
                      <TableRow
                        key={b.id}
                        className={cn(
                          "group transition-colors duration-200 border-b border-slate-50 last:border-0",
                          isSelected ? "bg-blue-50/60" : "hover:bg-slate-50/80",
                          b.isSettled ? "opacity-60 bg-slate-50/30" : "bg-white"
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
                        <TableCell className="py-4">
                          <div className="flex flex-col">
                            <span className={cn("text-sm font-semibold", b.isSettled ? "text-slate-500 line-through" : "text-slate-700")}>
                              {b.date ? new Date(b.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) : '-'}
                            </span>
                            <span className={cn(
                              "text-[10px] uppercase font-bold mt-1 w-fit px-1.5 py-0.5 rounded-sm bg-opacity-10",
                              b.type === 'SHARED' ? "text-blue-600 bg-blue-100" : "text-orange-600 bg-orange-100"
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

                        <TableCell className="text-right py-4">
                          <span className={cn("text-base font-bold tabular-nums", b.isSettled ? "text-slate-400 line-through" : "text-slate-900")}>
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
                              const canToggle = isPaid
                                ? canSettleGlobal
                                : (canSettleGlobal || currentUser?.name === name);

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
                                      ? (isPaid ? 'Chỉ người chi mới được hủy xác nhận' : 'Bạn không có quyền thao tác phần này')
                                      : isPaid
                                        ? `${name} đã trả (Xác nhận lúc: ${formattedPaidAt}). Click để hoàn tác.`
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
                            disabled={!canSettleGlobal}
                            className={cn(
                              "relative inline-flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-100",
                              canSettleGlobal ? "cursor-pointer" : "cursor-not-allowed opacity-40 grayscale",
                              b.isSettled
                                ? "bg-green-100 text-green-600 hover:bg-green-200 ring-1 ring-green-200 shadow-sm"
                                : "bg-white text-slate-300 border-2 border-slate-200 hover:border-blue-400 hover:text-blue-500"
                            )}
                            title={!canSettleGlobal ? "Chỉ người chi mới có quyền xác nhận toàn bộ" : (b.isSettled ? "Đã thanh toán hết (Click để hoàn tác)" : "Đánh dấu tất cả đã trả")}
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

                        <TableCell className="py-4 text-right pr-3">
                          <div className="flex items-center justify-end gap-1 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full"
                              onClick={() => setEditingBill(b)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full"
                              onClick={() => handleDeleteClick(b.id)}
                            >
                              {deletingId === b.id ? (
                                <span className="animate-spin text-[10px]">⏳</span>
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </Button>
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
