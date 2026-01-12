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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Trash2,
  Edit,
  Clock,
  Calendar,
  Users,
  Search
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
                    className="h-9 w-[130px] rounded-md border border-input bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
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
                    className="h-9 w-[130px] rounded-md border border-input bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
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
              <TableHeader className="bg-slate-100/80">
                <TableRow>
                  <TableRow>
                    <TableHead className="w-[50px] text-center">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={toggleAll}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                      />
                    </TableHead>
                    <TableHead className="w-[60px] text-center font-bold text-slate-700">STT</TableHead>
                    <TableHead className="w-[280px] font-bold text-slate-700">Nội dung</TableHead>
                    <TableHead className="w-[180px] font-bold text-slate-700">Người chi</TableHead>
                    <TableHead className="w-[150px] text-right font-bold text-slate-700">Số tiền</TableHead>
                    <TableHead className="w-[200px] font-bold text-slate-700">Chia cho</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBills.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground italic bg-slate-50/30">
                      Không có dữ liệu hóa đơn nào.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBills.map((b, index) => {
                    const isSelected = selectedIds.has(b.id);
                    return (
                      <TableRow
                        key={b.id}
                        className={cn(
                          "group transition-all duration-200 border-b last:border-0",
                          isSelected ? "bg-blue-50 hover:bg-blue-100" : "hover:bg-slate-50",
                          index % 2 === 0 ? "bg-white" : "bg-slate-50/20"
                        )}
                      >
                        <TableCell className="text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleRow(b.id)}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600 mt-1"
                          />
                        </TableCell>
                        <TableCell className="text-center font-bold text-slate-400">
                          {index + 1}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2">
                              <Badge variant={b.type === 'SHARED' ? 'secondary' : 'default'} className={cn(
                                "shadow-sm px-2 py-0.5",
                                b.type === 'SHARED' ? "bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-200" : "bg-orange-100 text-orange-800 hover:bg-orange-200 border border-orange-200"
                              )}>
                                {b.type === 'SHARED' ? 'CHUNG' : 'RIÊNG'}
                              </Badge>
                              <span className="font-bold text-slate-800 text-base">{b.note}</span>
                            </div>
                            {b.date && (
                              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                                <Calendar className="w-3 h-3" />
                                {new Date(b.date).toLocaleDateString('vi-VN')}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md ring-2 ring-white", getAvatarColor(b.payer))}>
                              {b.payer.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-semibold text-slate-700">{b.payer}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-black text-lg text-slate-800 tabular-nums tracking-tight">
                            {formatMoney(b.amount)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {b.type === 'SHARED' ? (
                              <Badge variant="outline" className="bg-white text-slate-600 border-slate-200 gap-1.5 font-medium shadow-sm px-2">
                                <Users className="w-3 h-3" /> Tất cả
                              </Badge>
                            ) : (
                              (b.beneficiaries || []).map((name, idx) => (
                                <div key={idx} className="flex items-center bg-white border border-slate-200 rounded-full pl-0.5 pr-2 py-0.5 shadow-sm gap-1.5">
                                  <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white font-bold", getAvatarColor(name))}>
                                    {name.charAt(0).toUpperCase()}
                                  </div>
                                  <span className="text-xs font-semibold text-slate-600">{name}</span>
                                </div>
                              ))
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-x-2 group-hover:translate-x-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full"
                              onClick={() => setEditingBill(b)}
                              title="Sửa"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full"
                              onClick={() => handleDeleteClick(b.id)}
                              disabled={deletingId === b.id}
                              title="Xóa"
                            >
                              {deletingId === b.id ? (
                                <span className="animate-spin text-xs">⏳</span>
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
