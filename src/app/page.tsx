'use client';

import React, { useEffect, useState } from 'react';
import SummaryTable from '@/components/Dashboard/SummaryTable';
import PrivateMatrix from '@/components/Dashboard/PrivateMatrix';
import HistoryTable from '@/components/Dashboard/HistoryTable';
import AddBillForm from '@/components/Forms/AddBillForm';
import SheetSelector from '@/components/Dashboard/SheetSelector';
import ActivityLogList from '@/components/Dashboard/ActivityLogList';

import MemberManager from '@/components/Dashboard/MemberManager';
import StatisticsSection from '@/components/Dashboard/StatisticsSection';
import Header from '@/components/Layout/Header';
import Footer from '@/components/Layout/Footer';

import { Bill, Member, CalculationResult, DebtTransaction, CurrentUser } from '@/types/expense';
import { calculateFinalBalances, calculatePrivateMatrix, calculateDebts } from '@/services/expenseService';

export default function Home() {
  const [loading, setLoading] = useState(true);

  // Workspace Data
  const [workspace, setWorkspace] = useState<{ id: number; name: string; sheets: any[] } | null>(null);
  const [sheets, setSheets] = useState<{ id: number; name: string }[]>([]);
  const [currentSheetId, setCurrentSheetId] = useState<number | null>(null);

  // Sheet Data
  const [sheetData, setSheetData] = useState<any>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [calculations, setCalculations] = useState<CalculationResult & { globalDebts: DebtTransaction[]; matrix: any } | null>(null);

  // User Data
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  // Initial Fetch: Workspace & Sheets & User
  useEffect(() => {
    fetchWorkspace();
    fetchUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const { user } = await res.json();
        if (!user) {
          // Zombie session (JWT valid but user deleted). Force logout.
          await fetch('/api/auth/logout', { method: 'POST' });
          window.location.href = '/login';
          return;
        }
        setCurrentUser(user);
      } else {
        // 401 or failed
        window.location.href = '/login';
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchWorkspace = async () => {
    try {
      const res = await fetch('/api/workspaces');
      const data = await res.json();
      // Assuming single workspace for now: id=1
      // In real app, we would select workspace. For now just take the seed one.
      const ws = data[0];
      if (ws) {
        setWorkspace(ws);
        setSheets(ws.sheets);
        // Default to latest sheet if not set
        if (!currentSheetId && ws.sheets.length > 0) {
          setCurrentSheetId(ws.sheets[ws.sheets.length - 1].id);
        }
      }
    } catch (e) { console.error(e); }
  };

  // Sheet Fetch: Whenever currentSheetId changes
  useEffect(() => {
    if (currentSheetId) fetchSheetData(currentSheetId);
  }, [currentSheetId]);

  const fetchSheetData = async (id: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/sheets/${id}`);
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

  // Auto-Refresh (Polling)
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        reload();
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSheetId]); // Re-bind if sheet changes

  const reload = () => {
    if (currentSheetId) fetchSheetData(currentSheetId);
    // Also reload workspace to get new members/sheets if needed
    fetchWorkspace();
  };

  const handleOptimisticAdd = (newBill: Bill) => {
    if (!sheetData || !members) return;

    // 1. Update List
    const updatedExpenses = [...sheetData.expenses, {
      ...newBill,
      // Mock relation structures if needed by UI, though we mapped them in 'bills' variable
      payer: { name: newBill.payer },
      splits: (newBill.beneficiaries || []).map(name => ({ member: { name } }))
    }];

    // Update raw sheet data so 'bills' mapping in render works
    setSheetData({
      ...sheetData,
      expenses: updatedExpenses
    });

    // 2. Recalculate Logic
    // We need to map the raw expenses back to Bill[] format for the service
    const memberNames = members.map(m => m.name);

    // We can't just use 'bills' const here because it's derived in render. 
    // We must reconstruct bills array from the updatedExpenses
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

    // Update calculations state
    setCalculations({
      balances,
      stats,
      privateBalances,
      matrix: { matrix: pMatrix, totals: matrixTotals },
      globalDebts,
      // privateDebts is missing in state type above but logic exists in service. 
      // We can ignore or add if needed, but 'calculations' state type in line 30 might need update if we used it.
      // Looking at line 30: CalculationResult & { globalDebts: ...; matrix: ... }
      // It doesn't seem to strictly require privateDebts.
    } as any);
  };

  if (!workspace && !loading) return <div style={{ padding: 20 }}>No Workspace Found. Seed database.</div>;
  if (loading && !workspace) return <div style={{ padding: 20 }}>Loading...</div>;

  const { globalDebts, matrix } = calculations || {};
  const currentSheet = sheetData || { expenses: [] }; // Fallback

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

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/30">
      <Header user={currentUser} title={activeSheetName} />

      <main className="flex-1 container mx-auto max-w-[1600px] px-4 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">

          {/* SIDEBAR actions - Sticky and focused */}
          <aside className="xl:col-span-3 space-y-6 sidebar-action-sticky">
            {workspace && (
              <SheetSelector
                sheets={sheets}
                currentSheetId={currentSheetId}
                workspaceId={workspace.id}
                onChange={setCurrentSheetId}
                onCreated={reload}
              />
            )}

            <AddBillForm
              members={members}
              sheetId={currentSheetId!}
              onAdd={reload}
              onOptimisticAdd={handleOptimisticAdd}
            />

            <ActivityLogList members={members} />

            {currentUser?.role === 'ADMIN' && (
              <MemberManager members={members} workspaceId={workspace!.id} onUpdate={reload} />
            )}
          </aside>

          {/* MAIN CONTENT Area */}
          <section className="xl:col-span-9 space-y-8 min-w-0">
            {calculations && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* 1. TOP STATS CARDS */}
                <StatisticsSection members={members} calculations={calculations} />

                {/* 2. REPORTING AREA: Summary & Matrix grouped */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
                  <SummaryTable members={members} calculations={calculations} />
                  <PrivateMatrix members={members} matrixData={matrix} />
                </div>

                {/* 3. MAIN HUB: TABLE AREA (Move to bottom) */}
                <div className="space-y-6">
                  <HistoryTable
                    bills={bills}
                    members={members}
                    onDelete={reload}
                    currentUser={currentUser}
                  />
                </div>
              </div>
            )}
          </section>

        </div>
      </main>

      <Footer />
    </div>
  );
}
