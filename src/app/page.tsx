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

import { Bill, Member, CalculationResult, DebtTransaction, CurrentUser } from '@/types/expense';
import { calculateFinalBalances, calculatePrivateMatrix, calculateDebts } from '@/services/expenseService';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function Home() {
  const [loading, setLoading] = useState(true);

  // Workspace Data
  const [workspace, setWorkspace] = useState<{ id: number; name: string; sheets: any[] } | null>(null);
  const [sheets, setSheets] = useState<{ id: number; name: string; month: number; year: number }[]>([]);
  const [currentSheetId, setCurrentSheetId] = useState<number | null>(null);

  // Sheet Data
  const [sheetData, setSheetData] = useState<any>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [calculations, setCalculations] = useState<CalculationResult & { globalDebts: DebtTransaction[]; matrix: any } | null>(null);

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
  const { data: notifications, mutate: mutateNotifications } = useSWR('/api/notifications', fetcher, {
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
      const data = await res.json();

      const ws = data[0];
      if (ws) {
        setWorkspace(ws);
        setSheets(ws.sheets);

        const sheetExists = ws.sheets.some((s: any) => s.id === currentSheetId);
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
      const json = await res.json();

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
    }];

    setSheetData({
      ...sheetData,
      expenses: updatedExpenses
    });

    const memberNames = members.map(m => m.name);
    const currentBills: Bill[] = updatedExpenses.map((e: any) => ({
      id: e.id,
      amount: e.amount,
      payer: e.payer.name,
      type: e.type,
      beneficiaries: e.splits.map((s: any) => s.member.name),
      note: e.description,
      date: e.date
    }));

    const { balances, stats, privateBalances } = calculateFinalBalances(memberNames, currentBills);
    const { matrix: pMatrix, totals: matrixTotals } = calculatePrivateMatrix(memberNames, currentBills);
    const globalDebts = calculateDebts(balances);

    setCalculations({
      balances,
      stats,
      privateBalances,
      matrix: { matrix: pMatrix, totals: matrixTotals },
      globalDebts,
    } as any);
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  if (!workspace && !loading) return <div style={{ padding: 20 }}>No Workspace Found. Seed database.</div>;
  if (loading && !workspace) return <div style={{ padding: 20 }}>Loading...</div>;

  const { globalDebts, matrix } = calculations || {};
  const currentSheet = sheetData || { expenses: [] };

  const bills: Bill[] = (currentSheet.expenses || []).map((e: any) => ({
    id: e.id,
    amount: e.amount,
    payer: e.payer.name,
    type: e.type,
    beneficiaries: e.splits.map((s: any) => s.member.name),
    note: e.description,
    date: e.date,
    isSettled: e.isSettled,
    splits: e.splits ? e.splits.map((s: any) => ({
      member: { name: s.member?.name || s.member || '' },
      isPaid: s.isPaid,
      isPending: s.isPending,
      paidAt: s.paidAt,
      amount: s.amount
    })) : []
  }));

  const activeSheetName = sheets.find(s => s.id === currentSheetId)?.name || 'QUẢN LÝ CHI TIÊU';
  const isLocked = sheetData?.status === 'LOCKED';
  const hasExpenses = bills.length > 0;

  return (
    <ErrorBoundary>
      <div className="min-h-screen flex bg-slate-50/30">
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
          {/* Compact Header */}
          <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-100/80 h-14 flex items-center px-4 lg:px-6 gap-3">
            {/* Mobile menu button spacer */}
            <div className="w-10 lg:hidden" />

            {/* Sheet Title */}
            <h1 className="text-sm font-black text-slate-600 uppercase tracking-[0.15em] truncate">
              {activeSheetName}
            </h1>

            <div className="flex-1" />

            {/* Notification bell (quick access) */}
            <button
              onClick={() => setIsNotificationsOpen(true)}
              className="relative p-2 rounded-xl hover:bg-slate-50 text-slate-500 hover:text-indigo-600 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {pendingCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-red-600 text-[9px] font-black text-white ring-2 ring-white min-w-[18px] h-[18px]">
                  {pendingCount}
                </span>
              )}
            </button>

            {/* User avatar */}
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center font-black text-xs shadow-md ring-2 ring-white cursor-pointer hover:scale-105 transition-transform"
              title={currentUser?.name || 'User'}
            >
              {currentUser?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 px-4 lg:px-8 py-6">
            <div className="space-y-6">

              {/* SheetSelector Toolbar (create/edit/delete/lock actions) */}
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

              {calculations && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">

                  {/* QUICK STATS */}
                  <QuickStats members={members} calculations={calculations} bills={bills} />

                  {/* ADD EXPENSE FORM */}
                  <AddBillForm
                    members={members}
                    sheetId={currentSheetId!}
                    onAdd={reload}
                    onOptimisticAdd={handleOptimisticAdd}
                    isLocked={isLocked}
                  />

                  {/* REPORTING */}
                  {hasExpenses && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <SummaryTable members={members} calculations={calculations} />
                      <PrivateMatrix members={members} matrixData={matrix} />
                    </div>
                  )}

                  {/* EXPENSE HISTORY */}
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
            <div className="relative w-full max-w-md bg-white shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-slate-100">
                <h2 className="text-lg font-black text-slate-800">Activity Log</h2>
                <button onClick={() => setShowActivityLog(false)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <ActivityLogList members={members} sheetId={currentSheetId!} month={sheetData?.month} year={sheetData?.year} sheetName={activeSheetName} />
              </div>
            </div>
          </div>
        )}

        {/* Member Manager Drawer */}
        {showMemberManager && currentUser?.role === 'ADMIN' && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowMemberManager(false)} />
            <div className="relative w-full max-w-md bg-white shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-slate-100">
                <h2 className="text-lg font-black text-slate-800">Member Manager</h2>
                <button onClick={() => setShowMemberManager(false)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
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
            className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-2xl shadow-green-500/30 flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-300 lg:hidden animate-in zoom-in duration-200"
            title="Add Expense"
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
