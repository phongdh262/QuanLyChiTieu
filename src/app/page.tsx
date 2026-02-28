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
import Header from '@/components/Layout/Header';
import Footer from '@/components/Layout/Footer';
import ErrorBoundary from '@/components/ui/ErrorBoundary';

import { Bill, Member, CalculationResult, DebtTransaction, CurrentUser } from '@/types/expense';
import { calculateFinalBalances, calculatePrivateMatrix, calculateDebts } from '@/services/expenseService';

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

  // Mobile FAB
  const [showFAB, setShowFAB] = useState(false);

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
      <div className="min-h-screen flex flex-col bg-slate-50/30">
        <Header
          user={currentUser}
          title={activeSheetName}
          onUpdated={reload}
          onShowActivityLog={() => setShowActivityLog(true)}
          onShowMemberManager={() => setShowMemberManager(true)}
        />

        <main className="flex-1 container mx-auto max-w-[1400px] px-4 py-6">
          <div className="space-y-6">

            {/* TOP BAR: Sheet Selector - Full Width */}
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

                {/* QUICK STATS - 4 column cards */}
                <QuickStats members={members} calculations={calculations} bills={bills} />

                {/* ADD EXPENSE FORM */}
                <AddBillForm
                  members={members}
                  sheetId={currentSheetId!}
                  onAdd={reload}
                  onOptimisticAdd={handleOptimisticAdd}
                  isLocked={isLocked}
                />

                {/* REPORTING: Summary + Matrix - only show if there are expenses */}
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

        {/* SLIDE-OVER PANELS */}
        {/* Activity Log Drawer */}
        {showActivityLog && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowActivityLog(false)} />
            <div className="relative w-full max-w-md bg-white shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-slate-100">
                <h2 className="text-lg font-black text-slate-800">Activity Log</h2>
                <button
                  onClick={() => setShowActivityLog(false)}
                  className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <ActivityLogList
                  members={members}
                  sheetId={currentSheetId!}
                  month={sheetData?.month}
                  year={sheetData?.year}
                  sheetName={activeSheetName}
                />
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
                <button
                  onClick={() => setShowMemberManager(false)}
                  className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <MemberManager members={members} workspaceId={workspace!.id} onUpdate={reload} />
              </div>
            </div>
          </div>
        )}

        {/* Mobile FAB - Scroll to Add Form */}
        {showFAB && (
          <button
            onClick={() => {
              const form = document.getElementById('add-bill-form');
              if (form) form.scrollIntoView({ behavior: 'smooth' });
            }}
            className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-2xl shadow-green-500/30 flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-300 md:hidden animate-in zoom-in duration-200"
            title="Add Expense"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
          </button>
        )}

        <Footer />
      </div>
    </ErrorBoundary>
  );
}
