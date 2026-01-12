'use client';

import React, { useEffect, useState } from 'react';
import SummaryTable from '@/components/Dashboard/SummaryTable';
import PrivateMatrix from '@/components/Dashboard/PrivateMatrix';
import DebtsTable from '@/components/Dashboard/DebtsTable';
import HistoryTable from '@/components/Dashboard/HistoryTable';
import AddBillForm from '@/components/Forms/AddBillForm';
import SheetSelector from '@/components/Dashboard/SheetSelector';

import MemberManager from '@/components/Dashboard/MemberManager';
import StatisticsSection from '@/components/Dashboard/StatisticsSection';

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

  const handleSettle = async (fromName: string, toName: string, amount: number) => {
    try {
      const payer = members.find(m => m.name === fromName);
      const receiver = members.find(m => m.name === toName);

      if (!payer || !receiver) throw new Error('Member not found');

      await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetId: currentSheetId,
          payerId: payer.id,
          amount: amount,
          description: `Trả nợ (${fromName} -> ${toName})`,
          type: 'PRIVATE',
          beneficiaryIds: [receiver.id]
        })
      });
      reload();
    } catch (error) {
      console.error(error);
      alert('Lỗi thanh toán');
    }
  };

  const activeSheetName = sheets.find(s => s.id === currentSheetId)?.name || 'QUẢN LÝ CHI TIÊU';

  return (
    <main>
      <div style={{ width: '100%', padding: '0 2rem', marginBottom: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* User Header */}
        {currentUser && (
          <div style={{
            position: 'absolute',
            top: '1rem',
            right: '2rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            background: 'white',
            padding: '0.5rem 1rem',
            borderRadius: '99px',
            boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
            border: '1px solid #f3f4f6'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%',
                background: '#3b82f6', color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'
              }}>
                {currentUser.role === 'ADMIN' ? '👑' : '👤'}
              </div>
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{currentUser.name || 'Người dùng'}</div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>@{currentUser.username || 'user'}</div>
              </div>
            </div>
            <div style={{ width: '1px', height: '20px', background: '#e5e7eb' }}></div>
            <button
              onClick={async () => {
                await fetch('/api/auth/logout', { method: 'POST' });
                window.location.href = '/login';
              }}
              style={{
                background: 'none', border: 'none', color: '#ef4444',
                cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600
              }}
            >
              Đăng xuất
            </button>
          </div>
        )}

        <h1 style={{ textAlign: 'center', textTransform: 'uppercase', fontSize: '2.5rem', letterSpacing: '2px', color: 'var(--primary-dark)', width: '100%', marginTop: '2rem' }}>
          {activeSheetName}
        </h1>
      </div>

      <div className="row">
        <div>
          {/* LEFT COLUMN: Controls */}
          <div style={{ position: 'sticky', top: '2rem' }}>
            <SheetSelector
              sheets={sheets}
              currentSheetId={currentSheetId}
              workspaceId={workspace!.id}
              onChange={setCurrentSheetId}
              onCreated={reload}
            />
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

        <div>

          {/* RIGHT COLUMN: Data */}
          {calculations && (
            <>
              <StatisticsSection members={members} calculations={calculations} />
              <SummaryTable members={members} calculations={calculations} />
              <PrivateMatrix members={members} matrixData={matrix} />
              {/* All Debt Tables Removed as per request */}
            </>
          )}
          <HistoryTable
            bills={bills}
            members={members}
            onDelete={reload}
            onDuplicate={(bill) => {
              // Convert bill to AddForm format
              const payer = members.find(m => m.name === bill.payer);
              const beneficiaryIds = bill.beneficiaries
                ? bill.beneficiaries.map(name => members.find(m => m.name === name)?.id).filter(Boolean) as number[]
                : [];

              setBillToDuplicate({
                amount: bill.amount,
                description: bill.note || '',
                payerId: payer?.id || 0,
                type: bill.type,
                beneficiaryIds
              });
            }}
          />
        </div>
      </div>
    </main>
  );
}
