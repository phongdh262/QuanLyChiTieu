'use client';

import React, { useState } from 'react';
import {
    Calendar,
    ChevronDown,
    History,
    Bell,
    Lock,
    LogOut,
    KeyRound,
    Menu,
    X,
    ArrowRight,
    Moon,
    Sun,
    Globe,
    Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/ThemeProvider';
import { useLanguage } from '@/components/LanguageProvider';
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
        'from-blue-400 to-blue-600',
        'from-rose-400 to-rose-600',
        'from-emerald-400 to-emerald-600',
        'from-amber-400 to-amber-600',
        'from-violet-400 to-violet-600',
        'from-pink-400 to-pink-600',
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
    const { theme, toggleTheme } = useTheme();
    const { t, language, setLanguage } = useLanguage();
    const [sheetsExpanded, setSheetsExpanded] = useState(false);

    const activeSheet = sheets.find(s => s.id === currentSheetId);
    const otherSheets = sheets.filter(s => s.id !== currentSheetId).slice().reverse();

    return (
        <>
            {/* Mobile overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-md z-40 lg:hidden animate-in fade-in duration-200"
                    onClick={onToggle}
                />
            )}

            {/* Sidebar */}
            <aside
                className={cn(
                    "fixed top-0 left-0 h-full z-50 lg:sticky lg:top-0 lg:h-screen lg:z-auto",
                    "w-[272px] flex flex-col",
                    "bg-[#0c0e16] text-white",
                    "shadow-2xl shadow-black/50 lg:shadow-xl",
                    "transition-transform duration-300 ease-out",
                    "border-r border-white/[0.04]",
                    isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
                )}
                style={{
                    backgroundImage: 'radial-gradient(ellipse at 20% 0%, rgba(99, 102, 241, 0.06) 0%, transparent 60%), radial-gradient(ellipse at 80% 100%, rgba(139, 92, 246, 0.04) 0%, transparent 50%)',
                }}
            >
                {/* ===== LOGO ===== */}
                <div className="flex items-center justify-between px-5 h-16 border-b border-white/[0.05] shrink-0">
                    <div className="flex items-center gap-3.5 cursor-pointer group" onClick={() => window.location.href = '/'}>
                        <div className="relative">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-indigo-500/30 group-hover:shadow-indigo-500/50 group-hover:scale-105 transition-all duration-300">
                                <Sparkles className="w-5 h-5" />
                            </div>
                            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-indigo-400 to-violet-500 blur-lg opacity-20 group-hover:opacity-40 transition-opacity" />
                        </div>
                        <div>
                            <p className="font-extrabold text-[15px] tracking-tight text-white/95 leading-none">
                                ChiTiêu<span className="text-indigo-400">App</span>
                            </p>
                            <p className="text-[9px] text-white/20 font-semibold tracking-[0.18em] mt-1">QUẢN LÝ CHI TIÊU</p>
                        </div>
                    </div>
                    <button onClick={onToggle} className="lg:hidden p-1.5 rounded-lg hover:bg-white/10 text-white/40 transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* ===== SCROLLABLE CONTENT ===== */}
                <div className="flex-1 overflow-y-auto sidebar-scrollbar">
                    {/* --- SHEETS --- */}
                    <div className="px-4 pt-6 pb-3">
                        <button
                            onClick={() => setSheetsExpanded(prev => !prev)}
                            className="w-full flex items-center justify-between mb-3 px-1 group"
                        >
                            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/25">{t('sheets')}</h3>
                            <ChevronDown className={cn(
                                "w-3 h-3 text-white/15 transition-transform duration-200 group-hover:text-white/30",
                                sheetsExpanded ? "rotate-180" : ""
                            )} />
                        </button>

                        {/* Active Sheet */}
                        {activeSheet && (
                            <button
                                key={activeSheet.id}
                                onClick={() => { if (sheets.length > 1) setSheetsExpanded(prev => !prev); }}
                                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left transition-all duration-200 bg-indigo-500/[0.12] text-indigo-300 border border-indigo-400/[0.15] hover:bg-indigo-500/[0.18] group relative"
                                style={{ boxShadow: '0 0 20px rgba(99, 102, 241, 0.08), inset 0 1px 0 rgba(255,255,255,0.03)' }}
                            >
                                <div className="w-7 h-7 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                                    <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                                </div>
                                <span className="text-[13px] truncate font-semibold">{activeSheet.name}</span>
                                {isLocked && (
                                    <Lock className="w-3 h-3 text-amber-400/80 ml-auto shrink-0" />
                                )}
                                {sheets.length > 1 && (
                                    <span className="ml-auto text-[9px] font-bold text-indigo-300/60 bg-indigo-500/20 px-2 py-0.5 rounded-md">
                                        {sheets.length}
                                    </span>
                                )}
                            </button>
                        )}

                        {/* Other Sheets */}
                        {sheetsExpanded && otherSheets.length > 0 && (
                            <div className="space-y-0.5 mt-1.5 animate-in slide-in-from-top-1 fade-in duration-200">
                                {otherSheets.map(sheet => (
                                    <button
                                        key={sheet.id}
                                        onClick={() => { onSheetChange(sheet.id); setSheetsExpanded(false); if (window.innerWidth < 1024) onToggle(); }}
                                        className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-left transition-all duration-150 text-white/50 hover:bg-white/[0.05] hover:text-white/75"
                                    >
                                        <div className="w-7 h-7 rounded-lg bg-white/[0.03] flex items-center justify-center">
                                            <Calendar className="w-3.5 h-3.5 text-white/25" />
                                        </div>
                                        <span className="text-[13px] truncate font-medium">{sheet.name}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="mx-5 border-t border-white/[0.04]" />

                    {/* --- MEMBERS --- */}
                    <div className="px-4 pt-4 pb-3">
                        <div className="flex items-center justify-between mb-3 px-1">
                            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/25">{t('members')}</h3>
                            {currentUser?.role === 'ADMIN' && (
                                <button
                                    onClick={() => { onShowMemberManager(); if (window.innerWidth < 1024) onToggle(); }}
                                    className="text-[10px] font-semibold text-indigo-400/80 hover:text-indigo-300 transition-colors"
                                >
                                    {t('manage')}
                                </button>
                            )}
                        </div>
                        <div className="space-y-1">
                            {activeMembers.map(member => (
                                <div key={member.id} className="flex items-center gap-3 px-2.5 py-2 rounded-xl hover:bg-white/[0.04] transition-all duration-150 group">
                                    <div className={cn(
                                        "w-8 h-8 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-bold text-[10px] ring-1 ring-white/[0.08] shadow-lg shadow-black/20 group-hover:ring-white/[0.15] transition-all",
                                        getAvatarColor(member.name)
                                    )}>
                                        {member.name.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="text-[13px] font-medium text-white/65 group-hover:text-white/85 truncate transition-colors">{member.name}</span>
                                    {member.name === currentUser?.name && (
                                        <span className="text-[9px] font-bold text-indigo-300/80 bg-indigo-500/15 px-2 py-0.5 rounded-md ml-auto border border-indigo-400/10">
                                            {language === 'vi' ? 'bạn' : 'you'}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="mx-5 border-t border-white/[0.04]" />

                    {/* --- DEBT SUMMARY --- */}
                    {globalDebts && globalDebts.length > 0 && (
                        <div className="px-4 pt-4 pb-3">
                            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/25 mb-3 px-1">{t('debts')}</h3>
                            <div className="space-y-1.5">
                                {globalDebts.slice(0, 5).map((debt, idx) => (
                                    <div key={idx} className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/[0.025] border border-white/[0.03] text-[12px] hover:bg-white/[0.04] transition-all duration-150">
                                        <span className="font-semibold text-white/55 truncate max-w-[60px]">{debt.from}</span>
                                        <ArrowRight className="w-3 h-3 text-white/15 shrink-0" />
                                        <span className="font-semibold text-white/55 truncate max-w-[60px]">{debt.to}</span>
                                        <span className="ml-auto font-bold text-rose-400/90 tabular-nums text-[11px] tracking-tight">{formatMoney(debt.amount)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* ===== BOTTOM NAV ===== */}
                <div className="border-t border-white/[0.04] p-3 space-y-0.5 shrink-0">
                    {/* Nav items */}
                    {[
                        { icon: History, label: t('activityLog'), onClick: () => { onShowActivityLog(); if (window.innerWidth < 1024) onToggle(); }, badge: 0 },
                        { icon: Bell, label: t('notifications'), onClick: () => { onShowNotifications(); if (window.innerWidth < 1024) onToggle(); }, badge: pendingNotifications || 0 },
                        { icon: KeyRound, label: t('changePassword'), onClick: onChangePassword, badge: 0 },
                    ].map(({ icon: Icon, label, onClick, badge }) => (
                        <button
                            key={label}
                            onClick={onClick}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-white/45 hover:bg-white/[0.05] hover:text-white/80 transition-all duration-150 group"
                        >
                            <div className="w-7 h-7 rounded-lg bg-white/[0.04] flex items-center justify-center group-hover:bg-white/[0.08] transition-colors">
                                <Icon className="w-3.5 h-3.5" />
                            </div>
                            <span>{label}</span>
                            {badge > 0 && (
                                <span className="ml-auto flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white px-1 shadow-lg shadow-rose-500/30">
                                    {badge}
                                </span>
                            )}
                        </button>
                    ))}

                    {/* Toggle Row */}
                    <div className="flex gap-1.5 px-1 pt-1.5">
                        <button
                            onClick={toggleTheme}
                            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[11px] font-bold text-white/45 bg-white/[0.03] hover:bg-white/[0.07] hover:text-white/75 transition-all duration-200 border border-white/[0.03] hover:border-white/[0.06]"
                        >
                            {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400/80" /> : <Moon className="w-3.5 h-3.5 text-blue-300" />}
                            {theme === 'dark' ? t('lightMode') : t('darkMode')}
                        </button>

                        <button
                            onClick={() => setLanguage(language === 'en' ? 'vi' : 'en')}
                            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[11px] font-bold text-white/45 bg-white/[0.03] hover:bg-white/[0.07] hover:text-white/75 transition-all duration-200 border border-white/[0.03] hover:border-white/[0.06]"
                        >
                            <Globe className="w-3.5 h-3.5 text-blue-400/70" />
                            {language === 'en' ? 'Tiếng Việt' : 'English'}
                        </button>
                    </div>
                </div>

                {/* ===== USER INFO ===== */}
                <div className="border-t border-white/[0.04] p-3.5 shrink-0">
                    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.04] hover:bg-white/[0.05] transition-all duration-200 group"
                        style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.02)' }}
                    >
                        <div className="relative">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 text-white flex items-center justify-center font-black text-sm shadow-lg shadow-indigo-500/20">
                                {currentUser?.name?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#0c0e16]" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white/85 truncate leading-tight">{currentUser?.name || 'User'}</p>
                            <p className="text-[10px] text-white/25 truncate mt-0.5">@{currentUser?.username}</p>
                        </div>
                        <button
                            onClick={onLogout}
                            className="p-2 rounded-lg text-white/20 hover:text-rose-400 hover:bg-rose-500/10 transition-all duration-200"
                            title="Đăng xuất"
                        >
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Mobile hamburger */}
            {!isOpen && (
                <button
                    onClick={onToggle}
                    className="fixed top-3 left-3 z-40 lg:hidden p-2.5 rounded-xl bg-[#0c0e16]/90 backdrop-blur-md shadow-xl shadow-black/30 text-white/70 hover:text-white transition-all duration-200 border border-white/[0.06]"
                >
                    <Menu className="w-5 h-5" />
                </button>
            )}
        </>
    );
}
