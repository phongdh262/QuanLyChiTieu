'use client';

import React, { useEffect, useState } from 'react';
import SummaryTable from '@/components/Dashboard/SummaryTable';
import PrivateMatrix from '@/components/Dashboard/PrivateMatrix';
import DebtsTable from '@/components/Dashboard/DebtsTable';
import HistoryTable from '@/components/Dashboard/HistoryTable';
import AddBillForm from '@/components/Forms/AddBillForm';
import SheetSelector from '@/components/Dashboard/SheetSelector';
import ActivityLogList from '@/components/Dashboard/ActivityLogList';

import MemberManager from '@/components/Dashboard/MemberManager';
import StatisticsSection from '@/components/Dashboard/StatisticsSection';
import Header from '@/components/Layout/Header';
import Footer from '@/components/Layout/Footer';

import { Bill, Member, CalculationResult, DebtTransaction } from '@/types/expense';

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
  const [billToDuplicate, setBillToDuplicate] = useState<any>(null); // State for duplication

  // User Data
  const [currentUser, setCurrentUser] = useState<{ id: number; role: string; name?: string; username?: string } | null>(null);

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

  if (!workspace && !loading) return <div style={{ padding: 20 }}>No Workspace Found. Seed database.</div>;
  if (!sheetData && !loading) return <div style={{ padding: 20 }}>No Sheet Selected. Create one.</div>;
  if (loading && !sheetData) return <div style={{ padding: 20 }}>Loading...</div>;

  const { globalDebts, matrix } = calculations || {};
  const currentSheet = sheetData;

  const bills: Bill[] = currentSheet.expenses.map((e: any) => ({
    id: e.id,
    amount: e.amount,
    payer: e.payer.name,
    type: e.type,
    beneficiaries: e.splits.map((s: any) => s.member.name),
    note: e.description,
    date: e.date
  }));

  const activeSheetName = sheets.find(s => s.id === currentSheetId)?.name || 'QUẢN LÝ CHI TIÊU';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/30">
      <Header user={currentUser} title={activeSheetName} />

      <main className="flex-1 container mx-auto max-w-7xl px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 space-y-6">
            {/* LEFT COLUMN: Controls */}
            <div className="sticky top-24 space-y-4">
              <SheetSelector
                sheets={sheets}
                currentSheetId={currentSheetId}
                workspaceId={workspace!.id}
                onChange={setCurrentSheetId}
                onCreated={reload}
              />
              <ActivityLogList />
              <AddBillForm
                members={members}
                sheetId={currentSheetId!}
                onAdd={reload}
                initialData={billToDuplicate}
              />
              {currentUser?.role === 'ADMIN' && (
                <MemberManager members={members} workspaceId={workspace!.id} onUpdate={reload} />
              )}
            </div>
          </div>

          <div className="lg:col-span-8 space-y-6">
            {/* RIGHT COLUMN: Data */}
            {calculations && (
              <>
                <StatisticsSection members={members} calculations={calculations} />
                <SummaryTable members={members} calculations={calculations} />
                <PrivateMatrix members={members} matrixData={matrix} />
              </>
            )}
            <HistoryTable
              bills={bills}
              members={members}
              onDelete={reload}
            />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
