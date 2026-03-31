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
        'from-blue-500 to-indigo-600',
        'from-sky-500 to-cyan-600',
        'from-emerald-500 to-teal-600',
        'from-indigo-500 to-blue-600',
        'from-cyan-500 to-blue-600',
        'from-slate-500 to-slate-700',
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
                    className="fixed inset-0 bg-slate-900/20 dark:bg-black/50 backdrop-blur-md z-40 lg:hidden animate-in fade-in duration-200"
                    onClick={onToggle}
                />
            )}

            {/* Sidebar */}
            <aside
                className={cn(
                    "fixed top-0 left-0 h-full z-50 lg:sticky lg:top-0 lg:h-screen lg:z-auto",
                    "w-[272px] flex flex-col",
                    "bg-slate-50 dark:bg-[#0c0e16] text-slate-700 dark:text-white",
                    "shadow-2xl shadow-slate-200/50 dark:shadow-black/50 lg:shadow-xl lg:shadow-slate-200/50 dark:lg:shadow-black/50",
                    "transition-transform duration-300 ease-out",
                    "border-r border-slate-200/60 dark:border-white/[0.04]",
                    isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
                    "transition-colors duration-300"
                )}
                style={{
                    backgroundImage: theme === 'dark' ? 'radial-gradient(ellipse at 20% 0%, rgba(59, 130, 246, 0.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 100%, rgba(6, 182, 212, 0.05) 0%, transparent 50%)' : 'radial-gradient(ellipse at 20% 0%, rgba(59, 130, 246, 0.04) 0%, transparent 60%), radial-gradient(ellipse at 80% 100%, rgba(6, 182, 212, 0.03) 0%, transparent 50%)',
                }}
            >
                {/* ===== LOGO ===== */}
                <div className="flex items-center justify-between px-5 h-16 border-b border-slate-200/60 dark:border-white/[0.05] shrink-0 transition-colors duration-300">
                    <div className="flex items-center gap-3.5 cursor-pointer group" onClick={() => window.location.href = '/'}>
                        <div className="relative">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-indigo-500/30 group-hover:shadow-indigo-500/50 group-hover:scale-105 transition-all duration-300">
                                <Sparkles className="w-5 h-5" />
                            </div>
                            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-indigo-400 to-blue-500 blur-lg opacity-20 group-hover:opacity-40 transition-opacity" />
                        </div>
                        <div>
                            <p className="font-extrabold text-[15px] tracking-tight text-slate-800 dark:text-white/95 leading-none transition-colors duration-300">
                                ChiTiêu<span className="text-indigo-600 dark:text-indigo-400 transition-colors duration-300">App</span>
                            </p>
                            <p className="text-[9px] text-slate-400 dark:text-white/20 font-semibold tracking-[0.18em] mt-1 transition-colors duration-300">QUẢN LÝ CHI TIÊU</p>
                        </div>
                    </div>
                    <button onClick={onToggle} className="lg:hidden p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400 dark:text-white/40 transition-colors">
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
                            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-white/25 transition-colors duration-300">{t('sheets')}</h3>
                            <ChevronDown className={cn(
                                "w-3 h-3 text-slate-400 dark:text-white/15 transition-transform duration-200 group-hover:text-slate-500 dark:group-hover:text-white/30",
                                sheetsExpanded ? "rotate-180" : ""
                            )} />
                        </button>

                        {/* Active Sheet */}
                        {activeSheet && (
                            <button
                                key={activeSheet.id}
                                onClick={() => { if (sheets.length > 1) setSheetsExpanded(prev => !prev); }}
                                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left transition-all duration-200 bg-indigo-50 dark:bg-indigo-500/[0.12] text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-400/[0.15] hover:bg-indigo-100 dark:hover:bg-indigo-500/[0.18] group relative"
                                style={theme === 'dark' ? { boxShadow: '0 0 20px rgba(99, 102, 241, 0.08), inset 0 1px 0 rgba(255,255,255,0.03)' } : {}}
                            >
                                <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center transition-colors duration-300">
                                    <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 transition-colors duration-300" />
                                </div>
                                <span className="text-[13px] truncate font-semibold">{activeSheet.name}</span>
                                {isLocked && (
                                    <Lock className="w-3 h-3 text-amber-500 dark:text-amber-400/80 ml-auto shrink-0 transition-colors duration-300" />
                                )}
                                {sheets.length > 1 && (
                                    <span className="ml-auto text-[9px] font-bold text-indigo-600 dark:text-indigo-300/60 bg-indigo-200 dark:bg-indigo-500/20 px-2 py-0.5 rounded-md transition-colors duration-300">
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
                                        className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-left transition-all duration-150 text-slate-500 dark:text-white/50 hover:bg-slate-100 dark:hover:bg-white/[0.05] hover:text-slate-800 dark:hover:text-white/75"
                                    >
                                        <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-white/[0.03] flex items-center justify-center transition-colors duration-300">
                                            <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-white/25 transition-colors duration-300" />
                                        </div>
                                        <span className="text-[13px] truncate font-medium">{sheet.name}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="mx-5 border-t border-slate-200/60 dark:border-white/[0.04] transition-colors duration-300" />

                    {/* --- MEMBERS --- */}
                    <div className="px-4 pt-4 pb-3">
                        <div className="flex items-center justify-between mb-3 px-1">
                            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-white/25 transition-colors duration-300">{t('members')}</h3>
                            {currentUser?.role === 'ADMIN' && (
                                <button
                                    onClick={() => { onShowMemberManager(); if (window.innerWidth < 1024) onToggle(); }}
                                    className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400/80 hover:text-indigo-500 dark:hover:text-indigo-300 transition-colors"
                                >
                                    {t('manage')}
                                </button>
                            )}
                        </div>
                        <div className="space-y-1">
                            {activeMembers.map(member => (
                                <div key={member.id} className="flex items-center gap-3 px-2.5 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-all duration-150 group">
                                    <div className={cn(
                                        "w-8 h-8 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-bold text-[10px] ring-1 ring-slate-200 dark:ring-white/[0.08] shadow-sm shadow-slate-200 dark:shadow-black/20 group-hover:ring-slate-300 dark:group-hover:ring-white/[0.15] transition-all",
                                        getAvatarColor(member.name)
                                    )}>
                                        {member.name.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="text-[13px] font-medium text-slate-600 dark:text-white/65 group-hover:text-slate-900 dark:group-hover:text-white/85 truncate transition-colors">{member.name}</span>
                                    {member.name === currentUser?.name && (
                                        <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-300/80 bg-indigo-100 dark:bg-indigo-500/15 px-2 py-0.5 rounded-md ml-auto border border-indigo-200 dark:border-indigo-400/10 transition-colors duration-300">
                                            {language === 'vi' ? 'bạn' : 'you'}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="mx-5 border-t border-slate-200/60 dark:border-white/[0.04] transition-colors duration-300" />

                    {/* --- DEBT SUMMARY --- */}
                    {globalDebts && globalDebts.length > 0 && (
                        <div className="px-4 pt-4 pb-3">
                            <div className="mb-3 px-1">
                                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-white/25 transition-colors duration-300">
                                    {t('finalSettlement')}
                                </h3>
                                <p className="mt-1 text-[10px] leading-relaxed text-slate-400/90 dark:text-white/30 transition-colors duration-300">
                                    {t('finalSettlementScope')}
                                </p>
                            </div>
                            <div className="space-y-1.5">
                                {globalDebts.slice(0, 5).map((debt, idx) => (
                                    <div key={idx} className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white dark:bg-white/[0.025] border border-slate-200/60 dark:border-white/[0.03] text-[12px] hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all duration-150 shadow-sm dark:shadow-none">
                                        <span className="font-semibold text-slate-600 dark:text-white/55 truncate max-w-[60px] transition-colors duration-300">{debt.from}</span>
                                        <ArrowRight className="w-3 h-3 text-slate-400 dark:text-white/15 shrink-0 transition-colors duration-300" />
                                        <span className="font-semibold text-slate-600 dark:text-white/55 truncate max-w-[60px] transition-colors duration-300">{debt.to}</span>
                                        <span className="ml-auto font-bold text-rose-500 dark:text-rose-400/90 tabular-nums text-[11px] tracking-tight transition-colors duration-300">{formatMoney(debt.amount)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* ===== BOTTOM NAV ===== */}
                <div className="border-t border-slate-200/60 dark:border-white/[0.04] p-3 space-y-0.5 shrink-0 transition-colors duration-300">
                    {/* Nav items */}
                    {[
                        { icon: History, label: t('activityLog'), onClick: () => { onShowActivityLog(); if (window.innerWidth < 1024) onToggle(); }, badge: 0 },
                        { icon: Bell, label: t('notifications'), onClick: () => { onShowNotifications(); if (window.innerWidth < 1024) onToggle(); }, badge: pendingNotifications || 0 },
                        { icon: KeyRound, label: t('changePassword'), onClick: onChangePassword, badge: 0 },
                    ].map(({ icon: Icon, label, onClick, badge }) => (
                        <button
                            key={label}
                            onClick={onClick}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-slate-500 dark:text-white/45 hover:bg-slate-100 dark:hover:bg-white/[0.05] hover:text-slate-800 dark:hover:text-white/80 transition-all duration-150 group"
                        >
                            <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-white/[0.04] flex items-center justify-center group-hover:bg-slate-200 dark:group-hover:bg-white/[0.08] transition-colors">
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
                            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[11px] font-bold text-slate-500 dark:text-white/45 bg-white dark:bg-white/[0.03] hover:bg-slate-50 dark:hover:bg-white/[0.07] hover:text-slate-800 dark:hover:text-white/75 transition-all duration-200 border border-slate-200/60 dark:border-white/[0.03] hover:border-slate-300 dark:hover:border-white/[0.06] shadow-sm dark:shadow-none"
                        >
                            {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400/80" /> : <Moon className="w-3.5 h-3.5 text-indigo-500" />}
                            {theme === 'dark' ? t('lightMode') : t('darkMode')}
                        </button>

                        <button
                            onClick={() => setLanguage(language === 'en' ? 'vi' : 'en')}
                            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[11px] font-bold text-slate-500 dark:text-white/45 bg-white dark:bg-white/[0.03] hover:bg-slate-50 dark:hover:bg-white/[0.07] hover:text-slate-800 dark:hover:text-white/75 transition-all duration-200 border border-slate-200/60 dark:border-white/[0.03] hover:border-slate-300 dark:hover:border-white/[0.06] shadow-sm dark:shadow-none"
                        >
                            <Globe className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400/70" />
                            {language === 'en' ? 'Tiếng Việt' : 'English'}
                        </button>
                    </div>
                </div>

                {/* ===== USER INFO ===== */}
                <div className="border-t border-slate-200/60 dark:border-white/[0.04] p-3.5 shrink-0 transition-colors duration-300">
                    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.04] hover:bg-slate-50 dark:hover:bg-white/[0.05] transition-all duration-200 group shadow-sm dark:shadow-none"
                        style={theme === 'dark' ? { boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.02)' } : {}}
                    >
                        <div className="relative">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white flex items-center justify-center font-black text-sm shadow-lg shadow-indigo-500/20">
                                {currentUser?.name?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-[#0c0e16]" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-700 dark:text-white/85 truncate leading-tight transition-colors duration-300">{currentUser?.name || 'User'}</p>
                            <p className="text-[10px] text-slate-400 dark:text-white/25 truncate mt-0.5 transition-colors duration-300">@{currentUser?.username}</p>
                        </div>
                        <button
                            onClick={onLogout}
                            className="p-2 rounded-lg text-slate-400 dark:text-white/20 hover:text-rose-500 hover:bg-rose-50 dark:hover:text-rose-400 dark:hover:bg-rose-500/10 transition-all duration-200"
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
                    className="fixed top-3 left-3 z-40 lg:hidden p-2.5 rounded-xl bg-white/90 dark:bg-[#0c0e16]/90 backdrop-blur-md shadow-xl shadow-slate-200/30 dark:shadow-black/30 text-slate-600 dark:text-white/70 hover:text-slate-900 dark:hover:text-white transition-all duration-200 border border-slate-200/60 dark:border-white/[0.06]"
                >
                    <Menu className="w-5 h-5" />
                </button>
            )}
        </>
    );
}
