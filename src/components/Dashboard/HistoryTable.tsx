import React, { useState } from 'react';
import { Bill, Member } from '@/types/expense';
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
}

const formatMoney = (amount: number) => amount.toLocaleString('vi-VN') + ' ₫';

export default function HistoryTable({ bills, members, onDelete, onUpdate }: Props) {
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
    try {
      // If memberName is provided, we settle for that specific split
      // Otherwise fallback to old behavior (or maybe ignore if we only want split settlement)

      const payload: any = { isSettled: !bill.isSettled }; // Defaut legacy

      if (memberName) {
        const split = bill.splits?.find(s => s.member.name === memberName);
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

      if (!res.ok) throw new Error('Failed to update status');

      addToast('Đã cập nhật trạng thái thanh toán', 'success');
      if (onDelete) onDelete(); // Reload
      if (onUpdate) onUpdate();
    } catch (e) {
      addToast('Lỗi cập nhật trạng thái', 'error');
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
                  <TableHead className="w-[40px] text-center p-2">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={toggleAll}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                    />
                  </TableHead>
                  <TableHead className="w-[100px] text-xs font-semibold uppercase text-slate-500">Ngày</TableHead>
                  <TableHead className="min-w-[200px] text-xs font-semibold uppercase text-slate-500">Nội dung</TableHead>
                  <TableHead className="w-[120px] text-right text-xs font-semibold uppercase text-slate-500">Số tiền</TableHead>
                  <TableHead className="w-[140px] text-left text-xs font-semibold uppercase text-slate-500 pl-6">Người chi</TableHead>
                  <TableHead className="w-[140px] text-left text-xs font-semibold uppercase text-slate-500">Chia cho</TableHead>
                  <TableHead className="w-[100px] text-center text-xs font-semibold uppercase text-slate-500">Trạng thái</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
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
                            className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                          />
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="flex flex-col">
                            <span className={cn("text-xs font-semibold", b.isSettled ? "text-slate-500 line-through" : "text-slate-700")}>
                              {b.date ? new Date(b.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) : '-'}
                            </span>
                            <span className={cn(
                              "text-[10px] uppercase font-bold mt-0.5 w-fit",
                              b.type === 'SHARED' ? "text-blue-500" : "text-orange-500"
                            )}>
                              {b.type === 'SHARED' ? 'CHUNG' : 'RIÊNG'}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="py-3">
                          <div className="flex items-center gap-2">
                            <span className={cn("text-sm font-medium", b.isSettled ? "text-slate-500 line-through decoration-slate-400" : "text-slate-800")}>
                              {b.note}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="text-right py-3">
                          <span className={cn("text-sm font-bold tabular-nums", b.isSettled ? "text-slate-400 line-through" : "text-slate-900")}>
                            {formatMoney(b.amount)}
                          </span>
                        </TableCell>

                        <TableCell className="pl-6 py-3">
                          <div className="flex items-center gap-2">
                            <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-white font-bold text-[9px] shadow-sm ring-1 ring-white", getAvatarColor(b.payer))}>
                              {b.payer.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm text-slate-600 font-medium truncate max-w-[80px]">{b.payer}</span>
                          </div>
                        </TableCell>

                        <TableCell className="py-3">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {b.type === 'SHARED' ? (
                              <span className="text-xs text-slate-400 font-medium italic">Tất cả</span>
                            ) : (
                              (b.beneficiaries || []).map((name, idx) => {
                                // Find split status
                                const split = b.splits?.find(s => s.member.name === name);
                                const isPaid = split?.isPaid;

                                return (
                                  <button key={idx}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleToggleSettle(b, name);
                                    }}
                                    className={cn(
                                      "flex items-center gap-1.5 border rounded-full pl-0.5 pr-2 py-0.5 transition-all hover:shadow-md active:scale-95",
                                      isPaid
                                        ? "bg-green-50 border-green-200 hover:bg-green-100"
                                        : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                                    )}
                                    title={isPaid ? `${name} đã trả (Click để hoàn tác)` : `Đánh dấu ${name} đã trả`}
                                  >
                                    <div className={cn("w-4 h-4 rounded-full flex items-center justify-center text-white font-bold text-[8px] relative", getAvatarColor(name))}>
                                      {name.charAt(0).toUpperCase()}
                                      {isPaid && (
                                        <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full w-2.5 h-2.5 border border-white flex items-center justify-center">
                                          <svg className="w-1.5 h-1.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                                          </svg>
                                        </div>
                                      )}
                                    </div>
                                    <span className={cn("text-[10px] font-semibold", isPaid ? "text-green-700 decoration-green-500" : "text-slate-700")}>{name}</span>
                                  </button>
                                )
                              })
                            )}
                          </div>
                        </TableCell>

                        {/* Status Column - Compact Logic */}
                        <TableCell className="text-center py-3">
                          <button
                            onClick={() => handleToggleSettle(b)}
                            className={cn(
                              "relative inline-flex items-center justify-center p-1.5 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-100",
                              b.isSettled
                                ? "bg-green-100 text-green-600 hover:bg-green-200 ring-1 ring-green-200"
                                : "bg-white text-slate-300 border border-slate-200 hover:border-blue-300 hover:text-blue-400 hover:shadow-sm"
                            )}
                            title={b.isSettled ? "Đã thanh toán (Click để hoàn tác)" : "Đánh dấu đã thanh toán"}
                          >
                            {b.isSettled ? (
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <div className="w-4 h-4 border-2 border-current rounded-full" />
                            )}
                          </button>
                        </TableCell>

                        <TableCell className="py-3 text-right pr-3">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                              onClick={() => setEditingBill(b)}
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50"
                              onClick={() => handleDeleteClick(b.id)}
                            >
                              {deletingId === b.id ? (
                                <span className="animate-spin text-[10px]">⏳</span>
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
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
