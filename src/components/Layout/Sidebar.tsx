'use client';

import React from 'react';
import {
    Calendar,
    History,
    Bell,
    Lock,
    LogOut,
    KeyRound,
    Menu,
    X,
    ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Member, CurrentUser, DebtTransaction } from '@/types/expense';

interface Sheet {
    id: number;
    name: string;
    month: number;
    year: number;
}

interface Props {
    sheets: Sheet[];
    currentSheetId: number | null;
    members: Member[];
    currentUser: CurrentUser | null;
    globalDebts?: DebtTransaction[];
    isLocked?: boolean;
    pendingNotifications?: number;
    onSheetChange: (id: number) => void;
    onShowActivityLog: () => void;
    onShowMemberManager: () => void;
    onShowNotifications: () => void;
    onChangePassword: () => void;
    onLogout: () => void;
    isOpen: boolean;
    onToggle: () => void;
}

const formatMoney = (amount: number) => amount.toLocaleString('vi-VN') + 'đ';

const getAvatarColor = (name: string) => {
    const colors = [
        'bg-blue-400', 'bg-rose-400', 'bg-emerald-400',
        'bg-amber-400', 'bg-violet-400', 'bg-pink-400'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
};

export default function Sidebar({
    sheets, currentSheetId, members, currentUser, globalDebts, isLocked,
    pendingNotifications,
    onSheetChange, onShowActivityLog, onShowMemberManager, onShowNotifications,
    onChangePassword, onLogout,
    isOpen, onToggle,
}: Props) {
    const activeMembers = members.filter(m => m.status !== 'DELETED');

    return (
        <>
            {/* Mobile overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden animate-in fade-in duration-200"
                    onClick={onToggle}
                />
            )}

            {/* Sidebar — dark premium theme */}
            <aside
                className={cn(
                    "fixed top-0 left-0 h-full z-50 lg:sticky lg:top-0 lg:z-auto",
                    "w-[260px] flex flex-col",
                    "bg-[#1a1d2e] text-white",
                    "shadow-2xl lg:shadow-xl",
                    "transition-transform duration-300 ease-out",
                    isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
                )}
            >
                {/* ===== LOGO ===== */}
                <div className="flex items-center justify-between px-5 h-14 border-b border-white/[0.06] shrink-0">
                    <div className="flex items-center gap-2.5 cursor-pointer group" onClick={() => window.location.href = '/'}>
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white font-black text-base shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                            $
                        </div>
                        <span className="font-black text-lg tracking-tight text-white/90">
                            Chi<span className="text-indigo-400">Tiêu</span>
                        </span>
                    </div>
                    <button onClick={onToggle} className="lg:hidden p-1 rounded-md hover:bg-white/10 text-white/50">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* ===== SCROLLABLE CONTENT ===== */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {/* --- SHEETS --- */}
                    <div className="px-3 pt-5 pb-2">
                        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 mb-2 px-2">Sheets</h3>
                        <div className="space-y-0.5">
                            {sheets.slice().reverse().map(sheet => {
                                const isActive = sheet.id === currentSheetId;
                                return (
                                    <button
                                        key={sheet.id}
                                        onClick={() => { onSheetChange(sheet.id); if (window.innerWidth < 1024) onToggle(); }}
                                        className={cn(
                                            "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all duration-150",
                                            isActive
                                                ? "bg-indigo-500/20 text-indigo-300 border border-indigo-400/20"
                                                : "text-white/60 hover:bg-white/[0.06] hover:text-white/80"
                                        )}
                                    >
                                        <Calendar className={cn("w-3.5 h-3.5 shrink-0", isActive ? "text-indigo-400" : "text-white/30")} />
                                        <span className={cn("text-[13px] truncate", isActive ? "font-semibold" : "font-medium")}>
                                            {sheet.name}
                                        </span>
                                        {isActive && isLocked && (
                                            <Lock className="w-3 h-3 text-amber-400 ml-auto shrink-0" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="mx-4 border-t border-white/[0.06] my-1" />

                    {/* --- MEMBERS --- */}
                    <div className="px-3 pt-3 pb-2">
                        <div className="flex items-center justify-between mb-2 px-2">
                            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">Members</h3>
                            {currentUser?.role === 'ADMIN' && (
                                <button
                                    onClick={() => { onShowMemberManager(); if (window.innerWidth < 1024) onToggle(); }}
                                    className="text-[10px] font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
                                >
                                    Manage
                                </button>
                            )}
                        </div>
                        <div className="space-y-0.5">
                            {activeMembers.map(member => (
                                <div key={member.id} className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-white/[0.04] transition-colors">
                                    <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-[9px] ring-1 ring-white/10", getAvatarColor(member.name))}>
                                        {member.name.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="text-[13px] font-medium text-white/70 truncate">{member.name}</span>
                                    {member.name === currentUser?.name && (
                                        <span className="text-[9px] font-bold text-indigo-300 bg-indigo-500/20 px-1.5 py-0.5 rounded ml-auto">you</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="mx-4 border-t border-white/[0.06] my-1" />

                    {/* --- DEBT SUMMARY --- */}
                    {globalDebts && globalDebts.length > 0 && (
                        <div className="px-3 pt-3 pb-2">
                            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 mb-2 px-2">Debts</h3>
                            <div className="space-y-1">
                                {globalDebts.slice(0, 5).map((debt, idx) => (
                                    <div key={idx} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.03] text-[12px]">
                                        <span className="font-medium text-white/60 truncate max-w-[55px]">{debt.from}</span>
                                        <ArrowRight className="w-3 h-3 text-white/20 shrink-0" />
                                        <span className="font-medium text-white/60 truncate max-w-[55px]">{debt.to}</span>
                                        <span className="ml-auto font-bold text-rose-400 tabular-nums text-[11px]">{formatMoney(debt.amount)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* ===== BOTTOM NAV ===== */}
                <div className="border-t border-white/[0.06] p-2.5 space-y-0.5 shrink-0">
                    <button
                        onClick={() => { onShowActivityLog(); if (window.innerWidth < 1024) onToggle(); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium text-white/50 hover:bg-white/[0.06] hover:text-white/80 transition-colors"
                    >
                        <History className="w-4 h-4" />
                        Activity Log
                    </button>

                    <button
                        onClick={() => { onShowNotifications(); if (window.innerWidth < 1024) onToggle(); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium text-white/50 hover:bg-white/[0.06] hover:text-white/80 transition-colors"
                    >
                        <Bell className="w-4 h-4" />
                        Notifications
                        {(pendingNotifications || 0) > 0 && (
                            <span className="ml-auto flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white px-1">
                                {pendingNotifications}
                            </span>
                        )}
                    </button>

                    <button
                        onClick={onChangePassword}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium text-white/50 hover:bg-white/[0.06] hover:text-white/80 transition-colors"
                    >
                        <KeyRound className="w-4 h-4" />
                        Change Password
                    </button>

                    <div className="border-t border-white/[0.06] my-1.5" />

                    {/* User info + Logout */}
                    <div className="flex items-center gap-2.5 px-3 py-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-400 to-violet-500 text-white flex items-center justify-center font-black text-xs shadow-md">
                            {currentUser?.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-semibold text-white/80 truncate">{currentUser?.name || 'User'}</p>
                            <p className="text-[10px] text-white/30 truncate">@{currentUser?.username}</p>
                        </div>
                        <button
                            onClick={onLogout}
                            className="p-1.5 rounded-md text-white/30 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title="Sign Out"
                        >
                            <LogOut className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Mobile hamburger */}
            {!isOpen && (
                <button
                    onClick={onToggle}
                    className="fixed top-3 left-3 z-40 lg:hidden p-2 rounded-lg bg-[#1a1d2e]/90 backdrop-blur-sm shadow-lg text-white/70 hover:text-white transition-colors"
                >
                    <Menu className="w-5 h-5" />
                </button>
            )}
        </>
    );
}
