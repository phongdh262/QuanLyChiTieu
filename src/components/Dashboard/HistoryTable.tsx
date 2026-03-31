'use client';

import React, { useState, useMemo, useRef, useCallback } from 'react';
import { Bill, Member, CurrentUser } from '@/types/expense';
import EditBillModal from './EditBillModal';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import { useToast } from '@/components/ui/ToastProvider';
import { useLanguage } from '@/components/LanguageProvider';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  Clock,
  Trash2,
  Edit,
  RefreshCw,
  Calendar,
  ChevronDown,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  bills: Bill[];
  members: Member[];
  onDelete: () => void;
  onUpdate?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  currentUser: CurrentUser | null;
  isLocked?: boolean;
}

const formatMoney = (amount: number) => amount.toLocaleString('vi-VN') + ' ₫';

// Group bills by date string
interface DateGroup {
  dateKey: string;
  dateLabel: string;
  bills: Bill[];
  total: number;
}

export default function HistoryTable({ bills, members, onDelete, onUpdate, onRefresh, isRefreshing, currentUser, isLocked }: Props) {
  const { t } = useLanguage();
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

  // Collapsed date groups
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // Swipe state for mobile
  const [swipedId, setSwipedId] = useState<number | null>(null);
  const touchStartX = useRef(0);
  const touchCurrentX = useRef(0);

  // Logic: Sort by Date Descending -> Filter
  const filteredBills = useMemo(() => [...bills]
    .sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateB - dateA;
    })
    .filter(b => {
      if (filterPayer !== 'ALL' && b.payer !== filterPayer) return false;
      if (filterType !== 'ALL' && b.type !== filterType) return false;
      const note = b.note || '';
      if (searchTerm && !note.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    }), [bills, filterPayer, filterType, searchTerm]);

  // --- FEATURE 1: Group by Date ---
  const dateGroups = useMemo((): DateGroup[] => {
    const groups: Record<string, DateGroup> = {};
    filteredBills.forEach(bill => {
      const dateKey = bill.date
        ? new Date(bill.date).toISOString().split('T')[0]
        : 'no-date';
      const dateLabel = bill.date
        ? new Date(bill.date).toLocaleDateString('vi-VN', {
          weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric'
        })
        : t('noDate');

      if (!groups[dateKey]) {
        groups[dateKey] = { dateKey, dateLabel, bills: [], total: 0 };
      }
      groups[dateKey].bills.push(bill);
      groups[dateKey].total += bill.amount;
    });
    return Object.values(groups);
  }, [filteredBills, t]);

  // --- FEATURE 3: Filter Totals ---
  const filterTotal = useMemo(() => filteredBills.reduce((s, b) => s + b.amount, 0), [filteredBills]);
  const isFiltered = filterPayer !== 'ALL' || filterType !== 'ALL' || searchTerm !== '';

  // Toggle group collapse
  const toggleGroup = (dateKey: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(dateKey)) next.delete(dateKey);
      else next.add(dateKey);
      return next;
    });
  };

  // Bulk Delete Handlers
  const toggleRow = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleAll = () => {
    const deletableBills = filteredBills.filter(b => currentUser?.name === b.payer);
    if (selectedIds.size === deletableBills.length && deletableBills.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(deletableBills.map(b => b.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const ok = await confirm({
      title: t('deleteMultiple'),
      message: t('confirmDeleteMultiple').replace('{count}', selectedIds.size.toString()),
      type: 'danger',
      confirmText: `${t('delete')} (${selectedIds.size})`,
      cancelText: t('cancel')
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
      addToast(`${t('deleteSuccess')} ${successCount}/${selectedIds.size}`, 'success');
      setSelectedIds(new Set());
      onDelete();
    } catch (e) {
      console.error(e);
      addToast(t('deleteError'), 'error');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleDeleteClick = async (id: number | string) => {
    if (deletingId) return;
    const ok = await confirm({
      title: t('deleteConfirm'),
      message: t('deleteWarning'),
      type: 'danger',
      confirmText: t('delete'),
      cancelText: t('cancel')
    });
    if (!ok) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      addToast(t('deleteSuccess'), 'success');
      onDelete();
    } catch (e) {
      addToast(t('deleteError'), 'error');
      console.error(e);
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleSettle = async (bill: Bill, memberName?: string) => {
    const canSettleGlobal = currentUser?.name === bill.payer;
    let forceReject = false;

    const split = memberName ? bill.splits?.find(s => s.member.name === memberName) : null;
    const isCurrentlyPaid = memberName ? split?.isPaid : bill.isSettled;

    if (isCurrentlyPaid && !canSettleGlobal && currentUser?.name !== memberName) {
      addToast('You do not have permission to cancel this payment confirmation!', 'warning');
      return;
    }

    if (memberName && !isCurrentlyPaid && currentUser?.name === bill.payer) {
      const result = await confirm({
        title: t('settleConfirm'),
        message: t('settleWarning').replace('{name}', memberName),
        type: 'info',
        confirmText: t('confirmPaid'),
        cancelText: t('cancel'),
        rejectText: t('reject')
      });
      if (result === false) return;
      if (result === 'reject') forceReject = true;
    }

    if (isCurrentlyPaid) {
      const ok = await confirm({
        title: t('cancelPaymentConfirm'),
        message: t('cancelPaymentWarning').replace('{name}', memberName || t('all')),
        type: 'danger',
        confirmText: t('yes'),
        cancelText: t('cancel')
      });
      if (!ok) return;
    }

    try {
      const payload: { isSettled: boolean; paymentFor?: string; isPaid?: boolean } = { isSettled: !bill.isSettled };
      if (memberName) {
        if (split) {
          payload.paymentFor = memberName;
          let nextState = !split.isPaid;
          if (forceReject) nextState = false;
          if (split.isPending && currentUser?.name === memberName) nextState = false;
          payload.isPaid = nextState;
        }
      }
      const res = await fetch(`/api/expenses/${bill.id}/settle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        if (res.status === 403) throw new Error('Permission denied');
        throw new Error('Failed to update status');
      }
      const data = await res.json();
      if (data.isPending) {
        addToast('Confirmation request sent to Payer. Waiting for approval.', 'warning');
      } else {
        addToast(t('paymentStatusUpdated'), 'success');
      }
      if (onDelete) onDelete();
      if (onUpdate) onUpdate();
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : t('updateStatusError');
      addToast(errorMessage, 'error');
      console.error(e);
    }
  };

  const AVATAR_GRADIENTS = [
    'linear-gradient(135deg, #8B1A1A, #6B0F0F)',
    'linear-gradient(135deg, #7A2020, #5C1010)',
    'linear-gradient(135deg, #8B3414, #6B260D)',
    'linear-gradient(135deg, #6B3020, #4F1E10)',
    'linear-gradient(135deg, #9B4020, #7A2E10)',
    'linear-gradient(135deg, #B08D40, #8A6C28)',
  ];
  const getAvatarColor = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
  };

  // --- FEATURE 6: Payment status summary ---
  const getPaymentSummary = (bill: Bill) => {
    const beneficiaries = (bill.beneficiaries || []).filter(name => name !== bill.payer);
    if (beneficiaries.length === 0) return null;
    const paidCount = beneficiaries.filter(name => {
      const split = bill.splits?.find(s => s.member.name === name);
      return split?.isPaid;
    }).length;
    const pendingCount = beneficiaries.filter(name => {
      const split = bill.splits?.find(s => s.member.name === name);
      return split?.isPending && !split?.isPaid;
    }).length;
    return { paid: paidCount, total: beneficiaries.length, pending: pendingCount };
  };

  const getStatusChip = (bill: Bill) => {
    const paymentSummary = getPaymentSummary(bill);
    if (!paymentSummary) return null;

    if (paymentSummary.paid === paymentSummary.total) {
      return {
        className: "bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/20",
        label: 'Done'
      };
    }

    if (paymentSummary.pending > 0) {
      return {
        className: "bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/20",
        label: `${paymentSummary.pending} pending`
      };
    }

    return {
      className: "bg-slate-100 text-slate-600 border border-slate-200 dark:bg-white/[0.04] dark:text-slate-300 dark:border-white/[0.08]",
      label: `${paymentSummary.paid}/${paymentSummary.total} paid`
    };
  };

  // --- FEATURE 5: Swipe handlers ---
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchCurrentX.current = e.touches[0].clientX;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    touchCurrentX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback((id: number) => {
    const diff = touchStartX.current - touchCurrentX.current;
    if (diff > 60) {
      setSwipedId(id);
    } else if (diff < -30) {
      setSwipedId(null);
    }
  }, []);

  const deletableBills = filteredBills.filter(b => currentUser?.name === b.payer);
  const isAllSelected = deletableBills.length > 0 && selectedIds.size === deletableBills.length;

  // ========================= RENDER =========================
  return (
    <>
      <Card className="w-full premium-card border-none soft-shadow group/history overflow-visible">
        {/* --- FEATURE 4: Sticky Filter Bar --- */}
        <CardHeader className="pb-4 border-b border-border/60 sticky top-0 z-30 backdrop-blur-md" style={{ background: 'hsl(40,48%,97%/0.92)' }}>
          <div className="flex flex-col gap-4">
            {/* Title Row */}
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg sm:text-xl flex items-center gap-3">
                <div className="p-2.5 rounded-lg group-hover/history:scale-110 group-hover/history:rotate-3 transition-all duration-500" style={{ background: 'linear-gradient(135deg, #8B1A1A, #6B0F0F)', boxShadow: '0 4px 14px rgba(139,26,26,0.3)' }}>
                  <Clock className="w-5 h-5 drop-shadow-sm" style={{ color: '#F5EDD8' }} />
                </div>
                <span className="font-bold tracking-tight" style={{ fontFamily: 'var(--font-cormorant), Georgia, serif', fontSize: '20px', color: 'rgba(44,24,16,0.85)' }}>{t('expenseHistory')}</span>
              </CardTitle>

              <div className="flex items-center gap-2">
                {selectedIds.size > 0 && (
                  <Button variant="destructive" size="sm" onClick={handleBulkDelete} disabled={isBulkDeleting} className="animate-in fade-in zoom-in duration-200 shadow-md">
                    {isBulkDeleting ? <span className="animate-spin mr-2">⏳</span> : <Trash2 className="w-4 h-4 mr-1" />}
                    {t('delete')} ({selectedIds.size})
                  </Button>
                )}
                {onRefresh && (
                  <Button variant="outline" size="icon" onClick={onRefresh} disabled={isRefreshing} className="backdrop-blur-sm transition-all shadow-sm rounded-xl" style={{ background: 'rgba(255,255,255,0.8)', borderColor: 'rgba(201,163,78,0.3)' }} title="Refresh Data">
                    <RefreshCw className={cn("w-4 h-4", isRefreshing ? "animate-spin" : "")} style={{ color: isRefreshing ? '#8B1A1A' : 'rgba(44,24,16,0.45)' }} />
                  </Button>
                )}
              </div>
            </div>

            {/* Filter Row */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('searchDescription')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 h-9 shadow-sm transition-all rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.85)', borderColor: 'rgba(201,163,78,0.3)', color: 'rgba(44,24,16,0.8)' }}
                />
              </div>

              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[130px] h-9 rounded-xl backdrop-blur-sm shadow-sm transition-all font-bold text-[11px] tracking-wide" style={{ borderColor: 'rgba(201,163,78,0.3)', background: 'rgba(255,255,255,0.8)', color: 'rgba(44,24,16,0.7)' }}>
                  <div className="flex items-center gap-1.5 truncate">
                    <Filter className="w-3 h-3" style={{ color: 'rgba(44,24,16,0.35)' }} />
                    <SelectValue placeholder={t('all')} />
                  </div>
                </SelectTrigger>
                <SelectContent className="rounded-xl shadow-xl backdrop-blur-md" style={{ borderColor: 'rgba(201,163,78,0.25)', background: 'hsl(40,50%,98%)' }}>
                  <SelectItem value="ALL" className="font-medium cursor-pointer py-2.5" style={{ color: 'rgba(44,24,16,0.75)' }}>{t('all')}</SelectItem>
                  <SelectItem value="SHARED" className="font-medium cursor-pointer py-2.5" style={{ color: '#8B1A1A' }}>
                    <span className="flex items-center gap-2">Shared</span>
                  </SelectItem>
                  <SelectItem value="PRIVATE" className="font-medium cursor-pointer py-2.5" style={{ color: '#8A6C28' }}>
                    <span className="flex items-center gap-2">Private</span>
                  </SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterPayer} onValueChange={setFilterPayer}>
                <SelectTrigger className="min-w-[170px] w-auto h-9 rounded-xl backdrop-blur-sm shadow-sm transition-all font-bold text-[11px] tracking-wide" style={{ borderColor: 'rgba(201,163,78,0.3)', background: 'rgba(255,255,255,0.8)', color: 'rgba(44,24,16,0.7)' }}>
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="font-normal text-[10px]" style={{ color: 'rgba(44,24,16,0.4)' }}>{t('payerLabel')}:</span>
                    <SelectValue placeholder={t('all')} />
                  </div>
                </SelectTrigger>
                <SelectContent className="rounded-xl shadow-xl backdrop-blur-md max-h-[300px]" style={{ borderColor: 'rgba(201,163,78,0.25)', background: 'hsl(40,50%,98%)' }}>
                  <SelectItem value="ALL" className="font-medium cursor-pointer py-2.5" style={{ color: 'rgba(44,24,16,0.75)' }}>{t('allMembers')}</SelectItem>
                  {members.map(m => (
                    <SelectItem key={m.id} value={m.name} className="font-medium cursor-pointer py-2.5" style={{ color: 'rgba(44,24,16,0.75)' }}>
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold" style={{ background: getAvatarColor(m.name), color: '#E8D9B8' }}>
                          {m.name.charAt(0).toUpperCase()}
                        </div>
                        {m.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Select All Checkbox */}
              <label className="hidden md:flex items-center gap-1.5 text-xs cursor-pointer select-none transition-colors" style={{ color: 'rgba(44,24,16,0.5)' }}>
                <input type="checkbox" checked={isAllSelected} onChange={toggleAll} className="h-3.5 w-3.5 rounded cursor-pointer" style={{ accentColor: '#8B1A1A' }} />
                {t('all')}
              </label>
            </div>

            {/* --- FEATURE 3: Filter Totals --- */}
            {filteredBills.length > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span style={{ color: 'rgba(44,24,16,0.45)' }}>
                  <span className="font-bold" style={{ color: 'rgba(44,24,16,0.7)' }}>{filteredBills.length}</span> {t('expensesCount')}
                  {isFiltered && <span className="ml-1" style={{ color: '#8B1A1A' }}>({t('filtered')})</span>}
                </span>
                <span className="font-black text-base tabular-nums" style={{ fontFamily: 'var(--font-cormorant), Georgia, serif', fontSize: '17px', color: '#8B1A1A' }}>
                  {formatMoney(filterTotal)}
                </span>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="max-h-[600px] overflow-auto custom-scrollbar">
            {filteredBills.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 space-y-4 animate-in fade-in duration-500">
                <div className="w-20 h-20 rounded-full flex items-center justify-center shadow-inner" style={{ background: 'linear-gradient(135deg, rgba(201,163,78,0.12), rgba(139,26,26,0.08))' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'rgba(201,163,78,0.5)' }}>
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <path d="M14 2v6h6" /><path d="M12 18v-6" /><path d="M9 15h6" />
                  </svg>
                </div>
                <div className="space-y-1.5 text-center">
                  <p className="text-base font-bold" style={{ color: 'rgba(44,24,16,0.6)' }}>{t('noExpensesYet')}</p>
                  <p className="text-sm max-w-sm" style={{ color: 'rgba(44,24,16,0.38)' }}>
                    {isFiltered ? t('noRecordsMatch') : t('startAddingExpense')}
                  </p>
                </div>
                {!isFiltered && (
                  <button
                    onClick={() => document.getElementById('add-bill-form')?.scrollIntoView({ behavior: 'smooth' })}
                    className="mt-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-105 active:scale-95"
                    style={{ background: 'linear-gradient(135deg, #8B1A1A, #6B0F0F)', color: '#F5EDD8', boxShadow: '0 4px 16px rgba(139,26,26,0.3)' }}
                  >
                    + {t('addFirstExpense')}
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* ========== DESKTOP TABLE (hidden on mobile) ========== */}
                <div className="hidden md:block">
                  {dateGroups.map((group) => {
                    const isCollapsed = collapsedGroups.has(group.dateKey);
                    return (
                      <div key={group.dateKey} className="border-b last:border-0" style={{ borderColor: 'rgba(201,163,78,0.12)' }}>
                        {/* --- FEATURE 1: Date Group Header --- */}
                        <button
                          onClick={() => toggleGroup(group.dateKey)}
                          className="w-full flex items-center justify-between px-5 py-3 transition-all duration-200 border-b"
                          style={{ background: 'rgba(201,163,78,0.05)', borderColor: 'rgba(201,163,78,0.1)' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(201,163,78,0.1)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(201,163,78,0.05)')}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn("transition-transform duration-200", isCollapsed ? "" : "rotate-90")}>
                              <ChevronRight className="w-4 h-4" style={{ color: 'rgba(201,163,78,0.6)' }} />
                            </div>
                            <Calendar className="w-4 h-4" style={{ color: '#C9A34E' }} />
                            <span className="font-bold text-sm sm:text-[15px]" style={{ color: 'rgba(44,24,16,0.75)' }}>{group.dateLabel}</span>
                            <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md" style={{ color: 'rgba(44,24,16,0.4)', background: 'rgba(201,163,78,0.1)' }}>
                              {group.bills.length} {t('expensesCount')}
                            </span>
                          </div>
                            <span className="font-black tabular-nums" style={{ fontFamily: 'var(--font-cormorant), Georgia, serif', fontSize: '16px', color: '#8B1A1A' }}>
                              {formatMoney(group.total)}
                            </span>
                          </button>

                        {/* Bills in this group */}
                        {!isCollapsed && (
                          <div className="grid gap-3 p-4">
                            {group.bills.map((b) => {
                              const isSelected = selectedIds.has(b.id);
                              const isPayer = currentUser?.name === b.payer;
                              const canDelete = isPayer && !isLocked;
                              const paymentSummary = getPaymentSummary(b);
                              const statusChip = getStatusChip(b);
                              const nonPayerBeneficiaries = (b.beneficiaries || []).filter((name) => name !== b.payer);

                              return (
                                <div
                                  key={b.id}
                                  className={cn("rounded-xl border px-4 py-4 transition-all duration-200", b.isSettled ? "opacity-50" : "")}
                                  style={{
                                    borderColor: isSelected ? 'rgba(139,26,26,0.35)' : 'rgba(201,163,78,0.2)',
                                    background: isSelected ? 'rgba(139,26,26,0.04)' : 'rgba(255,253,248,0.95)',
                                    boxShadow: isSelected ? '0 0 0 2px rgba(139,26,26,0.08)' : '0 1px 4px rgba(44,24,16,0.04)',
                                  }}
                                >
                                  <div className="grid grid-cols-[auto_minmax(220px,1.8fr)_minmax(240px,2fr)_minmax(160px,1fr)] items-start gap-4 lg:gap-5">
                                    <div className="pt-1">
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => toggleRow(b.id)}
                                        disabled={!canDelete}
                                        className={cn("h-4 w-4 rounded", canDelete ? "cursor-pointer" : "cursor-not-allowed opacity-30")}
                                        style={{ accentColor: '#8B1A1A' }}
                                      />
                                    </div>

                                    <div className="min-w-0 space-y-3">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span
                                          className="text-[10px] uppercase font-bold px-2 py-1 rounded-md tracking-[0.18em]"
                                          style={b.type === 'SHARED'
                                            ? { color: '#8B1A1A', background: 'rgba(139,26,26,0.08)' }
                                            : { color: '#8A6C28', background: 'rgba(201,163,78,0.12)' }}
                                        >
                                          {b.type === 'SHARED' ? 'Shared' : 'Private'}
                                        </span>
                                        {statusChip && (
                                          <span className={cn("text-[11px] font-bold px-2.5 py-1 rounded-full", statusChip.className)}>
                                            {statusChip.label}
                                          </span>
                                        )}
                                      </div>

                                      <div className="space-y-1.5 min-w-0">
                                        <p
                                          className={cn("text-base font-black tracking-tight", b.isSettled ? "line-through" : "")}
                                          style={{ color: b.isSettled ? 'rgba(44,24,16,0.3)' : 'rgba(44,24,16,0.85)' }}
                                        >
                                          {b.note || 'Untitled expense'}
                                        </p>
                                        <div className="flex flex-wrap items-center gap-2 text-xs">
                                          <span className="font-semibold uppercase tracking-[0.16em] text-[10px]" style={{ color: 'rgba(44,24,16,0.35)' }}>Paid by</span>
                                          <div className="flex items-center gap-2 rounded-full px-2.5 py-1" style={{ border: '1px solid rgba(201,163,78,0.2)', background: 'rgba(201,163,78,0.06)' }}>
                                            <div className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px]" style={{ background: getAvatarColor(b.payer), color: '#E8D9B8' }}>
                                              {b.payer.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="font-semibold" style={{ color: 'rgba(44,24,16,0.75)' }}>{b.payer}</span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="min-w-0 space-y-2 pl-4" style={{ borderLeft: '1px solid rgba(201,163,78,0.18)' }}>
                                      <div className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: 'rgba(44,24,16,0.38)' }}>
                                        Beneficiaries
                                      </div>
                                      <div className="flex flex-wrap items-center gap-2">
                                        {nonPayerBeneficiaries.map((name, idx) => {
                                          const split = b.splits?.find((s) => s.member.name === name);
                                          const isPaid = split?.isPaid;
                                          const isPending = split?.isPending;
                                          const isBeneficiary = currentUser?.name === name;
                                          const canToggle = (isPayer || isBeneficiary) && !isLocked;

                                          const splitStyle = isPaid
                                            ? { background: 'rgba(46,125,85,0.07)', borderColor: 'rgba(46,125,85,0.25)', color: '#2E7D55' }
                                            : isPending
                                              ? { background: 'rgba(201,163,78,0.08)', borderColor: 'rgba(201,163,78,0.3)', color: '#8A6C28' }
                                              : { background: 'rgba(201,163,78,0.04)', borderColor: 'rgba(201,163,78,0.15)', color: 'rgba(44,24,16,0.55)' };

                                          return (
                                            <button
                                              key={idx}
                                              onClick={(e) => { e.stopPropagation(); handleToggleSettle(b, name); }}
                                              disabled={!canToggle}
                                              className={cn("flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-all", canToggle ? "hover:shadow-sm active:scale-95" : "cursor-not-allowed opacity-60")}
                                              style={splitStyle}
                                            >
                                              <div className="w-5 h-5 rounded-full flex items-center justify-center font-bold text-[9px]" style={{ background: getAvatarColor(name), color: '#E8D9B8' }}>
                                                {name.charAt(0).toUpperCase()}
                                              </div>
                                              <span>{name}</span>
                                              {isPaid ? <span className="text-[10px]">✓</span> : isPending ? <span className="text-[10px]">⏳</span> : null}
                                            </button>
                                          );
                                        })}
                                      </div>

                                      {paymentSummary && (
                                        <button
                                          onClick={() => handleToggleSettle(b)}
                                          disabled={!isPayer || isLocked}
                                          className={cn("rounded-lg px-3 py-1.5 text-xs font-bold border transition-all", isPayer && !isLocked ? "hover:shadow-sm active:scale-95" : "cursor-not-allowed opacity-60")}
                                          style={paymentSummary.paid === paymentSummary.total
                                            ? { background: 'rgba(46,125,85,0.08)', color: '#2E7D55', borderColor: 'rgba(46,125,85,0.2)' }
                                            : paymentSummary.pending > 0
                                              ? { background: 'rgba(201,163,78,0.1)', color: '#8A6C28', borderColor: 'rgba(201,163,78,0.25)' }
                                              : { background: 'rgba(201,163,78,0.05)', color: 'rgba(44,24,16,0.5)', borderColor: 'rgba(201,163,78,0.15)' }}
                                        >
                                          {paymentSummary.paid === paymentSummary.total ? 'Done' : `${paymentSummary.paid}/${paymentSummary.total} paid`}
                                        </button>
                                      )}
                                    </div>

                                    <div className="flex flex-col items-end gap-3 pl-4" style={{ borderLeft: '1px solid rgba(201,163,78,0.18)' }}>
                                      <div className="text-right">
                                        <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: 'rgba(44,24,16,0.35)' }}>Amount</p>
                                        <p
                                          className={cn("mt-1 font-black tabular-nums tracking-tight", b.isSettled ? "line-through" : "")}
                                          style={{ fontFamily: 'var(--font-cormorant), Georgia, serif', fontSize: '18px', color: b.isSettled ? 'rgba(44,24,16,0.25)' : '#8B1A1A' }}
                                        >
                                          {formatMoney(b.amount)}
                                        </p>
                                      </div>

                                      <div className="flex items-center gap-1">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className={cn("h-9 w-9 rounded-lg transition-all", isPayer && !isLocked ? "hover:bg-[rgba(201,163,78,0.12)]" : "cursor-not-allowed opacity-30")}
                                          style={{ color: isPayer && !isLocked ? 'rgba(44,24,16,0.45)' : 'rgba(44,24,16,0.2)' }}
                                          onClick={() => isPayer && !isLocked && setEditingBill(b)}
                                          disabled={!isPayer || isLocked}
                                        >
                                          <Edit className="w-4 h-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className={cn("h-9 w-9 rounded-lg transition-all", canDelete ? "hover:bg-[rgba(139,26,26,0.08)]" : "cursor-not-allowed opacity-30")}
                                          style={{ color: canDelete ? 'rgba(44,24,16,0.45)' : 'rgba(44,24,16,0.2)' }}
                                          onClick={() => canDelete && handleDeleteClick(b.id)}
                                          disabled={!canDelete}
                                        >
                                          {deletingId === b.id ? <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#8B1A1A', borderTopColor: 'transparent' }} /> : <Trash2 className="w-4 h-4" />}
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* ========== MOBILE CARDS (visible on mobile only) ========== */}
                  <div className="md:hidden divide-y divide-slate-100 dark:divide-white/[0.06]">
                  {dateGroups.map((group) => {
                    const isCollapsed = collapsedGroups.has(group.dateKey);
                    return (
                      <div key={group.dateKey}>
                        {/* Mobile Date Header */}
                        <button
                          onClick={() => toggleGroup(group.dateKey)}
                          className="w-full flex items-center justify-between px-4 py-3 bg-slate-50/80 dark:bg-white/[0.03] active:bg-slate-100 dark:active:bg-white/[0.06] transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform duration-200", isCollapsed ? "-rotate-90" : "")} />
                            <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                            <span className="font-bold text-xs text-slate-700 dark:text-slate-200">{group.dateLabel}</span>
                            <span className="text-[10px] text-slate-400">({group.bills.length})</span>
                          </div>
                          <span className="font-bold text-xs tabular-nums text-blue-700 dark:text-blue-400">{formatMoney(group.total)}</span>
                        </button>

                        {/* Mobile Cards */}
                        {!isCollapsed && group.bills.map((b) => {
                          const isPayer = currentUser?.name === b.payer;
                          const canDelete = isPayer && !isLocked;
                          const paymentSummary = getPaymentSummary(b);
                          const isSwiped = swipedId === b.id;

                          return (
                            <div
                              key={b.id}
                              className="relative overflow-hidden"
                              onTouchStart={handleTouchStart}
                              onTouchMove={handleTouchMove}
                              onTouchEnd={() => handleTouchEnd(b.id)}
                            >
                              {/* --- FEATURE 5: Swipe reveal actions --- */}
                              <div className="absolute right-0 top-0 bottom-0 flex items-stretch z-0">
                                <button
                                  onClick={() => { if (isPayer && !isLocked) setEditingBill(b); setSwipedId(null); }}
                                  className={cn("w-16 flex items-center justify-center transition-colors", isPayer ? "bg-blue-600 text-white active:bg-blue-700" : "bg-slate-200 text-slate-400")}
                                  disabled={!isPayer || isLocked}
                                >
                                  <Edit className="w-5 h-5" />
                                </button>
                                <button
                                  onClick={() => { if (canDelete) handleDeleteClick(b.id); setSwipedId(null); }}
                                  className={cn("w-16 flex items-center justify-center transition-colors", canDelete ? "bg-red-500 text-white active:bg-red-600" : "bg-slate-200 text-slate-400")}
                                  disabled={!canDelete}
                                >
                                  <Trash2 className="w-5 h-5" />
                                </button>
                              </div>

                              {/* Card content */}
                              <div
                                  className={cn(
                                  "relative z-10 bg-white dark:bg-[#1f2639] px-4 py-3.5 transition-transform duration-200 ease-out",
                                  isSwiped ? "-translate-x-32" : "translate-x-0",
                                  b.isSettled ? "opacity-50" : ""
                                )}
                                onClick={() => isSwiped && setSwipedId(null)}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  {/* Left: Info */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1.5">
                                      <span className={cn(
                                        "text-[9px] uppercase font-bold px-1.5 py-0.5 rounded tracking-wider",
                                        b.type === 'SHARED' ? "text-indigo-600 bg-indigo-50 dark:bg-indigo-500/20 dark:text-indigo-300" : "text-cyan-700 bg-cyan-50 dark:bg-cyan-500/20 dark:text-cyan-300"
                                      )}>
                                        {b.type}
                                      </span>
                                      <span className={cn("text-sm font-semibold truncate", b.isSettled ? "text-slate-400 dark:text-slate-500 line-through" : "text-slate-800 dark:text-slate-100")}>
                                        {b.note}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                      <div className="flex items-center gap-1">
                                        <div className={cn("w-4 h-4 rounded-full flex items-center justify-center text-white font-bold text-[7px]", getAvatarColor(b.payer))}>
                                          {b.payer.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="font-medium">{b.payer}</span>
                                      </div>
                                      {paymentSummary && (
                                        <>
                                          <span className="text-slate-300">·</span>
                                          <span className={cn("font-bold",
                                            paymentSummary.paid === paymentSummary.total ? "text-emerald-600" :
                                              paymentSummary.pending > 0 ? "text-amber-600" : "text-slate-400"
                                          )}>
                                            {paymentSummary.paid}/{paymentSummary.total} paid
                                          </span>
                                        </>
                                      )}
                                    </div>

                                    {/* Mobile beneficiary pills */}
                                    <div className="flex flex-wrap gap-1 mt-2">
                                      {(b.beneficiaries || []).filter(name => name !== b.payer).map((name, idx) => {
                                        const split = b.splits?.find(s => s.member.name === name);
                                        const isPaid = split?.isPaid;
                                        const isPending = split?.isPending;
                                        const isBeneficiary = currentUser?.name === name;
                                        const canToggle = (isPayer || isBeneficiary) && !isLocked;

                                        return (
                                          <button
                                            key={idx}
                                            onClick={(e) => { e.stopPropagation(); handleToggleSettle(b, name); }}
                                            disabled={!canToggle}
                                            className={cn(
                                              "text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all",
                                              canToggle ? "active:scale-95" : "opacity-60",
                                              isPaid ? "bg-emerald-50 border-emerald-200 text-emerald-700" :
                                                isPending ? "bg-amber-50 border-amber-200 text-amber-700" :
                                                    "bg-slate-50 dark:bg-white/[0.05] border-slate-200 dark:border-white/[0.08] text-slate-500 dark:text-slate-300"
                                            )}
                                          >
                                            {isPaid ? '✓ ' : isPending ? '⏳ ' : ''}{name}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>

                                  {/* Right: Amount */}
                                  <div className="text-right shrink-0">
                                    <span className={cn("text-base font-black tabular-nums", b.isSettled ? "text-slate-300 dark:text-slate-500 line-through" : "text-slate-900 dark:text-slate-100")}>
                                      {formatMoney(b.amount)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </CardContent>

        {editingBill && (
          <EditBillModal
            bill={editingBill}
            members={members}
            onClose={() => setEditingBill(null)}
            onSave={() => { setEditingBill(null); onDelete(); }}
          />
        )}
      </Card>
    </>
  );
}
