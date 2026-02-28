'use client';

import React from 'react';
import {
    Calendar,
    Users,
    History,
    Bell,
    Lock,
    ChevronLeft,
    ChevronRight,
    LogOut,
    KeyRound,
    Menu,
    X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Member, CurrentUser, DebtTransaction } from '@/types/expense';

interface Sheet {
    id: number;
    name: string;
    month: number;
    year: number;
}

interface Props {
    // Data
    sheets: Sheet[];
    currentSheetId: number | null;
    members: Member[];
    currentUser: CurrentUser | null;
    globalDebts?: DebtTransaction[];
    isLocked?: boolean;
    pendingNotifications?: number;

    // Callbacks
    onSheetChange: (id: number) => void;
    onShowActivityLog: () => void;
    onShowMemberManager: () => void;
    onShowNotifications: () => void;
    onChangePassword: () => void;
    onLogout: () => void;

    // Sidebar state
    isOpen: boolean;
    onToggle: () => void;
}

const formatMoney = (amount: number) => amount.toLocaleString('vi-VN') + 'đ';

const getAvatarColor = (name: string) => {
    const colors = ['bg-blue-500', 'bg-red-500', 'bg-green-500', 'bg-amber-500', 'bg-purple-500', 'bg-pink-500'];
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
                    className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden animate-in fade-in duration-200"
                    onClick={onToggle}
                />
            )}

            {/* Sidebar */}
            <aside
                className={cn(
                    "fixed top-0 left-0 h-full z-50 lg:sticky lg:top-0 lg:z-auto",
                    "w-[280px] bg-white/95 backdrop-blur-xl border-r border-slate-100/80",
                    "flex flex-col shadow-xl lg:shadow-none",
                    "transition-transform duration-300 ease-out",
                    isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
                )}
            >
                {/* ===== LOGO ===== */}
                <div className="flex items-center justify-between px-5 h-16 border-b border-slate-100/80 shrink-0">
                    <div className="flex items-center gap-2.5 cursor-pointer group" onClick={() => window.location.href = '/'}>
                        <div className="relative w-9 h-9">
                            <div className="absolute inset-0 bg-indigo-500 rounded-xl blur-md opacity-20 group-hover:opacity-40 transition-opacity"></div>
                            <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 via-blue-600 to-violet-700 flex items-center justify-center text-white font-black text-lg shadow-lg group-hover:scale-105 transition-transform z-10 border border-white/20">
                                $
                            </div>
                        </div>
                        <span className="font-black text-xl text-slate-800 tracking-tighter">
                            ChiTieu<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">App</span>
                        </span>
                    </div>
                    {/* Close button (mobile) */}
                    <button onClick={onToggle} className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* ===== SCROLLABLE CONTENT ===== */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {/* --- SHEETS --- */}
                    <div className="px-4 pt-5 pb-3">
                        <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-3 px-1">Sheets</h3>
                        <div className="space-y-1">
                            {sheets.slice().reverse().map(sheet => {
                                const isActive = sheet.id === currentSheetId;
                                return (
                                    <button
                                        key={sheet.id}
                                        onClick={() => { onSheetChange(sheet.id); if (window.innerWidth < 1024) onToggle(); }}
                                        className={cn(
                                            "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all duration-150",
                                            isActive
                                                ? "bg-gradient-to-r from-indigo-50 to-blue-50 text-indigo-700 shadow-sm border border-indigo-100/80"
                                                : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                                        )}
                                    >
                                        <Calendar className={cn("w-4 h-4 shrink-0", isActive ? "text-indigo-500" : "text-slate-400")} />
                                        <span className={cn("text-sm truncate", isActive ? "font-bold" : "font-medium")}>
                                            {sheet.name}
                                        </span>
                                        {isActive && isLocked && (
                                            <Lock className="w-3 h-3 text-amber-500 ml-auto shrink-0" />
                                        )}
                                    </button>
                                );
                            })}
                            {sheets.length === 0 && (
                                <p className="text-xs text-slate-400 px-3 py-2">No sheets yet</p>
                            )}
                        </div>
                    </div>

                    <div className="mx-4 border-t border-slate-100" />

                    {/* --- MEMBERS --- */}
                    <div className="px-4 pt-4 pb-3">
                        <div className="flex items-center justify-between mb-3 px-1">
                            <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Members</h3>
                            {currentUser?.role === 'ADMIN' && (
                                <button
                                    onClick={() => { onShowMemberManager(); if (window.innerWidth < 1024) onToggle(); }}
                                    className="text-[10px] font-bold text-indigo-500 hover:text-indigo-700 transition-colors"
                                >
                                    Manage
                                </button>
                            )}
                        </div>
                        <div className="space-y-0.5">
                            {activeMembers.map(member => (
                                <div key={member.id} className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                                    <div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-[10px] ring-2 ring-white shadow-sm", getAvatarColor(member.name))}>
                                        {member.name.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="text-sm font-medium text-slate-700 truncate">{member.name}</span>
                                    {member.name === currentUser?.name && (
                                        <span className="text-[9px] font-bold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded ml-auto">You</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="mx-4 border-t border-slate-100" />

                    {/* --- DEBT SUMMARY --- */}
                    {globalDebts && globalDebts.length > 0 && (
                        <div className="px-4 pt-4 pb-3">
                            <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-3 px-1">Debt Summary</h3>
                            <div className="space-y-1.5">
                                {globalDebts.slice(0, 5).map((debt, idx) => (
                                    <div key={idx} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50/50 text-xs">
                                        <span className="font-semibold text-slate-600 truncate max-w-[60px]">{debt.from}</span>
                                        <span className="text-slate-300">→</span>
                                        <span className="font-semibold text-slate-600 truncate max-w-[60px]">{debt.to}</span>
                                        <span className="ml-auto font-bold text-rose-600 tabular-nums">{formatMoney(debt.amount)}</span>
                                    </div>
                                ))}
                                {globalDebts.length > 5 && (
                                    <p className="text-[10px] text-slate-400 px-3">+{globalDebts.length - 5} more</p>
                                )}
                            </div>
                            <div className="mx-4 mt-3 border-t border-slate-100" />
                        </div>
                    )}
                </div>

                {/* ===== BOTTOM NAV ===== */}
                <div className="border-t border-slate-100/80 p-3 space-y-0.5 shrink-0 bg-white/50">
                    <button
                        onClick={() => { onShowActivityLog(); if (window.innerWidth < 1024) onToggle(); }}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors"
                    >
                        <History className="w-4 h-4 text-slate-400" />
                        Activity Log
                    </button>

                    <button
                        onClick={() => { onShowNotifications(); if (window.innerWidth < 1024) onToggle(); }}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors"
                    >
                        <Bell className="w-4 h-4 text-slate-400" />
                        Notifications
                        {(pendingNotifications || 0) > 0 && (
                            <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-red-600 text-[10px] font-black text-white">
                                {pendingNotifications}
                            </span>
                        )}
                    </button>

                    <button
                        onClick={onChangePassword}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors"
                    >
                        <KeyRound className="w-4 h-4 text-slate-400" />
                        Change Password
                    </button>

                    <div className="border-t border-slate-100 my-1" />

                    {/* User info + Logout */}
                    <div className="flex items-center gap-2.5 px-3 py-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center font-black text-xs shadow-md ring-2 ring-white">
                            {currentUser?.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-700 truncate">{currentUser?.name || 'User'}</p>
                            <p className="text-[10px] text-slate-400 truncate">@{currentUser?.username}</p>
                        </div>
                        <button
                            onClick={onLogout}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Sign Out"
                        >
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Mobile hamburger (visible when sidebar is closed) */}
            {!isOpen && (
                <button
                    onClick={onToggle}
                    className="fixed top-4 left-4 z-40 lg:hidden p-2.5 rounded-xl bg-white/90 backdrop-blur-sm shadow-lg border border-slate-100 text-slate-600 hover:text-indigo-600 transition-colors"
                >
                    <Menu className="w-5 h-5" />
                </button>
            )}
        </>
    );
}
