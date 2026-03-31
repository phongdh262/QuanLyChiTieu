'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import SummaryTable from '@/components/Dashboard/SummaryTable';
import PrivateMatrix from '@/components/Dashboard/PrivateMatrix';
import HistoryTable from '@/components/Dashboard/HistoryTable';
const AddBillForm = dynamic(() => import('@/components/Forms/AddBillForm'), {
  ssr: false,
  loading: () => (
    <div className="w-full rounded-xl border bg-card p-6 animate-pulse">
      <div className="h-6 w-48 bg-slate-200 rounded mb-4" />
      <div className="h-10 bg-slate-100 rounded" />
    </div>
  ),
});
import SheetSelector from '@/components/Dashboard/SheetSelector';
import ActivityLogList from '@/components/Dashboard/ActivityLogList';
import MemberManager from '@/components/Dashboard/MemberManager';
import QuickStats from '@/components/Dashboard/QuickStats';
import Sidebar from '@/components/Layout/Sidebar';
import Footer from '@/components/Layout/Footer';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import ChangePasswordModal from '@/components/Auth/ChangePasswordModal';
import ConfirmationModal from '@/components/Dashboard/ConfirmationModal';
import { useLanguage } from '@/components/LanguageProvider';

import { Bill, Member, CalculationResult, DebtTransaction, CurrentUser } from '@/types/expense';
import { calculateFinalBalances, calculatePrivateMatrix, calculateDebts } from '@/services/expenseService';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(res => res.json());

interface WorkspaceSheet {
  id: number;
  name: string;
  month: number;
  year: number;
}

interface WorkspaceData {
  id: number;
  name: string;
  sheets: WorkspaceSheet[];
}

interface ApiExpenseSplit {
  member?: { name?: string } | string;
  isPaid?: boolean;
  isPending?: boolean;
  paidAt?: string | null;
  amount?: number;
}

interface ApiExpense {
  id: number;
  amount: number;
  payer: { name: string };
  type: 'SHARED' | 'PRIVATE';
  splits: ApiExpenseSplit[];
  description?: string;
  date?: string;
  isSettled?: boolean;
}

interface SheetData {
  status?: string;
  month?: number;
  year?: number;
  expenses: ApiExpense[];
}

interface MatrixData {
  matrix: Record<string, Record<string, number>>;
  totals: Record<string, number>;
}

interface DashboardCalculations extends CalculationResult {
  globalDebts: DebtTransaction[];
  matrix: MatrixData;
}

interface SheetPayload {
  sheet: SheetData;
  members: Member[];
  calculations: DashboardCalculations;
}

interface NotificationsPayload {
  totalPending?: number;
}

const getSplitMemberName = (member: ApiExpenseSplit['member']): string => {
  if (!member) return '';
  return typeof member === 'string' ? member : member.name || '';
};

export default function Home() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);

  // Workspace Data
  const [workspace, setWorkspace] = useState<WorkspaceData | null>(null);
  const [sheets, setSheets] = useState<WorkspaceSheet[]>([]);
  const [currentSheetId, setCurrentSheetId] = useState<number | null>(null);

  // Sheet Data
  const [sheetData, setSheetData] = useState<SheetData | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [calculations, setCalculations] = useState<DashboardCalculations | null>(null);

  // User Data
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  // Panel States
  const [showActivityLog, setShowActivityLog] = useState(false);
  const [showMemberManager, setShowMemberManager] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Modal States
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Mobile FAB
  const [showFAB, setShowFAB] = useState(false);

  // Notifications
  const { data: notifications, mutate: mutateNotifications } = useSWR<NotificationsPayload>('/api/notifications', fetcher, {
    refreshInterval: 10000
  });
  const pendingCount = notifications?.totalPending || 0;

  useEffect(() => {
    fetchWorkspace();
    fetchUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Show FAB when scrolled past the form
  useEffect(() => {
    const handleScroll = () => {
      setShowFAB(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const { user } = await res.json();
        if (!user) {
          await fetch('/api/auth/logout', { method: 'POST' });
          window.location.href = '/login';
          return;
        }
        setCurrentUser(user);
      } else {
        window.location.href = '/login';
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchWorkspace = async () => {
    try {
      const res = await fetch('/api/workspaces');
      if (!res.ok) throw new Error('Failed to fetch workspace');
      const data = await res.json() as WorkspaceData[];

      const ws = data[0];
      if (ws) {
        setWorkspace(ws);
        setSheets(ws.sheets);

        const sheetExists = ws.sheets.some((s) => s.id === currentSheetId);
        if (!sheetExists && ws.sheets.length > 0) {
          setCurrentSheetId(ws.sheets[ws.sheets.length - 1].id);
        } else if (ws.sheets.length === 0) {
          setCurrentSheetId(null);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (currentSheetId) fetchSheetData(currentSheetId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSheetId]);

  const fetchSheetData = async (id: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/sheets/${id}`);
      if (res.status === 404) {
        fetchWorkspace();
        return;
      }
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json() as SheetPayload;

      setSheetData(json.sheet);
      setMembers(json.members);
      setCalculations(json.calculations);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const reload = () => {
    if (currentSheetId) fetchSheetData(currentSheetId);
    fetchWorkspace();
  };

  const handleOptimisticAdd = (newBill: Bill) => {
    if (!sheetData || !members) return;

    const updatedExpenses = [...sheetData.expenses, {
      ...newBill,
      payer: { name: newBill.payer },
      splits: (newBill.beneficiaries || []).map(name => ({ member: { name } }))
    }] as ApiExpense[];

    setSheetData({
      ...sheetData,
      expenses: updatedExpenses
    });

    const memberNames = members.map(m => m.name);
    const currentBills: Bill[] = updatedExpenses.map((expense) => ({
      id: expense.id,
      amount: expense.amount,
      payer: expense.payer.name,
      type: expense.type,
      beneficiaries: expense.splits.map(split => getSplitMemberName(split.member)),
      note: expense.description,
      date: expense.date
    }));

    const { balances, stats, privateBalances } = calculateFinalBalances(memberNames, currentBills);
    const { matrix: pMatrix, totals: matrixTotals } = calculatePrivateMatrix(memberNames, currentBills);
    const globalDebts = calculateDebts(balances);

    const nextCalculations: DashboardCalculations = {
      balances,
      stats,
      privateBalances,
      matrix: { matrix: pMatrix, totals: matrixTotals },
      globalDebts,
    };
    setCalculations(nextCalculations);
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  if (!workspace && !loading) return <div style={{ padding: 20 }}>No Workspace Found. Seed database.</div>;
  if (loading && !workspace) return <div style={{ padding: 20 }}>{t('loading')}</div>;

  const globalDebts = calculations?.globalDebts;
  const currentSheetExpenses = sheetData?.expenses || [];

  const bills: Bill[] = currentSheetExpenses.map((expense) => ({
    id: expense.id,
    amount: expense.amount,
    payer: expense.payer.name,
    type: expense.type,
    beneficiaries: expense.splits.map(split => getSplitMemberName(split.member)),
    note: expense.description,
    date: expense.date,
    isSettled: expense.isSettled,
    splits: expense.splits.map((split) => ({
      member: { name: getSplitMemberName(split.member) },
      isPaid: !!split.isPaid,
      isPending: split.isPending,
      paidAt: split.paidAt ?? undefined,
      amount: split.amount
    }))
  }));

  const activeSheetName = sheets.find(s => s.id === currentSheetId)?.name || t('appTitle');
  const isLocked = sheetData?.status === 'LOCKED';
  const hasExpenses = bills.length > 0;

  return (
    <ErrorBoundary>
      <div className="min-h-screen flex bg-slate-50/30 dark:bg-transparent">
        {/* ===== SIDEBAR ===== */}
        <Sidebar
          sheets={sheets}
          currentSheetId={currentSheetId}
          members={members}
          currentUser={currentUser}
          globalDebts={globalDebts}
          isLocked={isLocked}
          pendingNotifications={pendingCount}
          onSheetChange={setCurrentSheetId}
          onShowActivityLog={() => setShowActivityLog(true)}
          onShowMemberManager={() => setShowMemberManager(true)}
          onShowNotifications={() => setIsNotificationsOpen(true)}
          onChangePassword={() => setIsChangePasswordOpen(true)}
          onLogout={handleLogout}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(prev => !prev)}
        />

        {/* ===== MAIN CONTENT ===== */}
        <div className="flex-1 flex flex-col min-h-screen min-w-0">
          {/* Compact Header with SheetSelector */}
          <header className="sticky top-0 z-30 bg-white/90 dark:bg-[#1e2235]/90 backdrop-blur-xl border-b border-slate-200/70 dark:border-white/[0.06] min-h-14 px-4 lg:px-6">
            <div className="content-shell flex min-h-14 items-center gap-3">
              {/* Mobile menu button spacer */}
              <div className="w-10 lg:hidden shrink-0" />

              <div className="flex min-w-0 flex-1 items-center justify-center lg:justify-start">
                {workspace && (
                  <SheetSelector
                    sheets={sheets}
                    currentSheetId={currentSheetId}
                    workspaceId={workspace.id}
                    onChange={setCurrentSheetId}
                    onCreated={reload}
                    isLocked={isLocked}
                    currentUser={currentUser}
                  />
                )}
              </div>

              {/* Right side controls */}
              <div className="flex items-center gap-2 sm:gap-3">
              {/* Notification bell */}
              <button
                onClick={() => setIsNotificationsOpen(true)}
                className="relative p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-white/[0.06] text-slate-400 hover:text-indigo-600 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {pendingCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center rounded-full bg-rose-500 text-[8px] font-black text-white min-w-[16px] h-[16px] px-1 ring-2 ring-white">
                    {pendingCount}
                  </span>
                )}
              </button>

              {/* User avatar */}
              <div className="w-7 h-7 rounded-md bg-gradient-to-br from-indigo-500 to-blue-600 text-white flex items-center justify-center font-black text-[10px] shadow-sm cursor-default"
                title={currentUser?.name || 'User'}
              >
                {currentUser?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
            </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 px-4 sm:px-5 lg:px-7 py-5 lg:py-6">
            <div className="content-shell space-y-5">

              {calculations && (
                <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-700">

                  {/* QUICK STATS */}
                  <div className="section-enter">
                    <QuickStats members={members} calculations={calculations} bills={bills} />
                  </div>

                  {/* ADD EXPENSE FORM */}
                  <div className="section-enter section-enter-delay-1">
                    <AddBillForm
                      members={members}
                      sheetId={currentSheetId!}
                      onAdd={reload}
                      onOptimisticAdd={handleOptimisticAdd}
                      isLocked={isLocked}
                    />
                  </div>

                  {/* REPORTING */}
                  {hasExpenses && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 section-enter section-enter-delay-2">
                      <SummaryTable members={members} calculations={calculations} />
                      <PrivateMatrix members={members} matrixData={calculations.matrix} />
                    </div>
                  )}

                  {/* EXPENSE HISTORY */}
                  <div className="section-enter section-enter-delay-3">
                    <HistoryTable
                      bills={bills}
                      members={members}
                      onDelete={reload}
                      onRefresh={reload}
                      isRefreshing={loading}
                      currentUser={currentUser}
                      isLocked={isLocked}
                    />
                  </div>
                </div>
              )}
            </div>
          </main>

          <Footer />
        </div>

        {/* ===== DRAWERS (unchanged logic) ===== */}
        {/* Activity Log Drawer */}
        {showActivityLog && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowActivityLog(false)} />
            <div className="relative w-full max-w-md h-screen bg-white dark:bg-[#1e2235] shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-white/[0.06] shrink-0">
                <h2 className="text-lg font-black text-slate-800 dark:text-slate-100">{t('activityLog')}</h2>
                <button onClick={() => setShowActivityLog(false)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <ActivityLogList members={members} sheetId={currentSheetId!} month={sheetData?.month} year={sheetData?.year} sheetName={activeSheetName} />
              </div>
            </div>
          </div>
        )}

        {/* Member Manager Drawer */}
        {showMemberManager && currentUser?.role === 'ADMIN' && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowMemberManager(false)} />
            <div className="relative w-full max-w-md h-screen bg-white dark:bg-[#1e2235] shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-white/[0.06]">
                <h2 className="text-lg font-black text-slate-800 dark:text-slate-100">{t('memberManager')}</h2>
                <button onClick={() => setShowMemberManager(false)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <MemberManager members={members} workspaceId={workspace!.id} onUpdate={reload} />
              </div>
            </div>
          </div>
        )}

        {/* Mobile FAB */}
        {showFAB && (
          <button
            onClick={() => document.getElementById('add-bill-form')?.scrollIntoView({ behavior: 'smooth' })}
            className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-600 text-white shadow-2xl shadow-indigo-500/30 flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-300 lg:hidden animate-in zoom-in duration-200"
            title={t('addNewExpense')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
          </button>
        )}

        {/* Modals */}
        <ChangePasswordModal open={isChangePasswordOpen} onOpenChange={setIsChangePasswordOpen} />
        <ConfirmationModal
          open={isNotificationsOpen}
          onOpenChange={setIsNotificationsOpen}
          onUpdated={() => { reload(); mutateNotifications(); }}
        />
      </div>
    </ErrorBoundary>
  );
}
