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
        'from-[#8B1A1A] to-[#6B0F0F]',
        'from-[#7A2B0E] to-[#5C1F08]',
        'from-[#9B3520] to-[#7A2815]',
        'from-[#B08D40] to-[#8B6C28]',
        'from-[#5C2E14] to-[#3D1E0D]',
        'from-[#8B4513] to-[#6B340E]',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
};

/* ─── Dong Son drum concentric-circle logo ─── */
const DongSonDrum = ({ className }: { className?: string }) => (
    <svg width="30" height="30" viewBox="0 0 30 30" fill="none" className={className} aria-hidden="true">
        {/* Center filled sun */}
        <circle cx="15" cy="15" r="3.2" fill="currentColor" />
        {/* 12 small rays */}
        {Array.from({ length: 12 }).map((_, i) => {
            const a = ((i * 30 - 90) * Math.PI) / 180;
            return (
                <line
                    key={i}
                    x1={15 + 3.6 * Math.cos(a)} y1={15 + 3.6 * Math.sin(a)}
                    x2={15 + 5.4 * Math.cos(a)} y2={15 + 5.4 * Math.sin(a)}
                    stroke="currentColor" strokeWidth="0.9"
                />
            );
        })}
        {/* Ring 1 */}
        <circle cx="15" cy="15" r="7" stroke="currentColor" strokeWidth="0.65" fill="none" />
        {/* 8 dots on ring 1 */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => {
            const a = (deg * Math.PI) / 180;
            return <circle key={i} cx={15 + 7 * Math.cos(a)} cy={15 + 7 * Math.sin(a)} r="0.9" fill="currentColor" />;
        })}
        {/* Ring 2 */}
        <circle cx="15" cy="15" r="10" stroke="currentColor" strokeWidth="0.65" fill="none" />
        {/* Ring 3 */}
        <circle cx="15" cy="15" r="13" stroke="currentColor" strokeWidth="0.6" fill="none" />
        {/* Outer notched ring — alternating sawtooth */}
        {Array.from({ length: 16 }).map((_, i) => {
            const a1 = (((i * 22.5) - 11.25) * Math.PI) / 180;
            const a2 = ((i * 22.5) * Math.PI) / 180;
            const a3 = (((i * 22.5) + 11.25) * Math.PI) / 180;
            return (
                <path
                    key={i}
                    d={`M ${15 + 13 * Math.cos(a1)} ${15 + 13 * Math.sin(a1)} L ${15 + 14.4 * Math.cos(a2)} ${15 + 14.4 * Math.sin(a2)} L ${15 + 13 * Math.cos(a3)} ${15 + 13 * Math.sin(a3)}`}
                    stroke="currentColor" strokeWidth="0.5" fill="none"
                />
            );
        })}
    </svg>
);

/* ─── Large faint drum watermark behind the logo area ─── */
const DongSonWatermark = () => (
    <svg
        width="160" height="160" viewBox="0 0 160 160" fill="none"
        className="absolute -top-8 -right-12 opacity-[0.035] pointer-events-none select-none"
        aria-hidden="true"
    >
        <circle cx="80" cy="80" r="14" stroke="currentColor" strokeWidth="1" fill="none" />
        <circle cx="80" cy="80" r="28" stroke="currentColor" strokeWidth="1" fill="none" />
        <circle cx="80" cy="80" r="42" stroke="currentColor" strokeWidth="1" fill="none" />
        <circle cx="80" cy="80" r="56" stroke="currentColor" strokeWidth="0.8" fill="none" />
        <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="0.8" fill="none" />
        {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg, i) => {
            const a = (deg * Math.PI) / 180;
            return <circle key={i} cx={80 + 42 * Math.cos(a)} cy={80 + 42 * Math.sin(a)} r="2.5" fill="currentColor" />;
        })}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => {
            const a = (deg * Math.PI) / 180;
            return <circle key={i} cx={80 + 28 * Math.cos(a)} cy={80 + 28 * Math.sin(a)} r="2" fill="currentColor" />;
        })}
    </svg>
);

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

    /* Always the dark lacquer aesthetic regardless of theme */
    const sidebarBase = "bg-[#0D0403] text-[#E8D9B8]";
    const gold = "#C9A34E";

    return (
        <>
            {/* Mobile overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden animate-in fade-in duration-200"
                    onClick={onToggle}
                />
            )}

            {/* Sidebar */}
            <aside
                className={cn(
                    "fixed top-0 left-0 h-full z-50 lg:sticky lg:top-0 lg:h-screen lg:z-auto",
                    "w-[272px] flex flex-col",
                    sidebarBase,
                    "shadow-2xl shadow-black/60",
                    "transition-transform duration-300 ease-out",
                    "border-r",
                    isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
                )}
                style={{ borderRightColor: "rgba(201, 163, 78, 0.14)" }}
            >
                {/* ══════ LOGO ══════ */}
                <div
                    className="relative flex items-center justify-between px-5 h-[68px] shrink-0 overflow-hidden"
                    style={{ borderBottom: "1px solid rgba(201, 163, 78, 0.12)" }}
                >
                    <DongSonWatermark />

                    <div
                        className="flex items-center gap-3.5 cursor-pointer group"
                        onClick={() => window.location.href = '/'}
                    >
                        {/* Drum icon in a circular gold-bordered container */}
                        <div className="relative">
                            <div
                                className="w-10 h-10 rounded-full flex items-center justify-center group-hover:scale-105 transition-all duration-300"
                                style={{
                                    background: "rgba(201, 163, 78, 0.1)",
                                    border: "1px solid rgba(201, 163, 78, 0.3)",
                                    color: gold,
                                }}
                            >
                                <DongSonDrum />
                            </div>
                            {/* Faint outer ring */}
                            <div
                                className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                style={{ boxShadow: `0 0 14px rgba(201, 163, 78, 0.25)` }}
                            />
                        </div>

                        <div>
                            <p
                                className="font-black text-[15px] tracking-tight leading-none"
                                style={{
                                    fontFamily: "var(--font-cormorant), Georgia, serif",
                                    color: "#E8D9B8",
                                    fontSize: "17px",
                                    letterSpacing: "0.02em",
                                }}
                            >
                                ChiTiêu<span style={{ color: gold }}>App</span>
                            </p>
                            <p
                                className="text-[8.5px] tracking-[0.22em] mt-0.5 font-semibold"
                                style={{ color: "rgba(201, 163, 78, 0.45)" }}
                            >
                                QUẢN LÝ CHI TIÊU
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onToggle}
                        className="lg:hidden p-1.5 rounded-lg transition-colors"
                        style={{ color: "rgba(232, 217, 184, 0.4)" }}
                        onMouseEnter={e => (e.currentTarget.style.color = gold)}
                        onMouseLeave={e => (e.currentTarget.style.color = "rgba(232, 217, 184, 0.4)")}
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* ══════ SCROLLABLE CONTENT ══════ */}
                <div className="flex-1 overflow-y-auto sidebar-scrollbar">

                    {/* ── SHEETS ── */}
                    <div className="px-4 pt-5 pb-3">
                        <button
                            onClick={() => setSheetsExpanded(prev => !prev)}
                            className="w-full flex items-center justify-between mb-3 px-1 group"
                        >
                            <h3
                                className="text-[9px] font-bold uppercase tracking-[0.24em]"
                                style={{ color: "rgba(201, 163, 78, 0.35)" }}
                            >
                                {t('sheets')}
                            </h3>
                            <ChevronDown
                                className={cn(
                                    "w-3 h-3 transition-transform duration-200",
                                    sheetsExpanded ? "rotate-180" : ""
                                )}
                                style={{ color: "rgba(201, 163, 78, 0.25)" }}
                            />
                        </button>

                        {/* Active Sheet */}
                        {activeSheet && (
                            <button
                                key={activeSheet.id}
                                onClick={() => { if (sheets.length > 1) setSheetsExpanded(prev => !prev); }}
                                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-left transition-all duration-200 group relative"
                                style={{
                                    background: "rgba(201, 163, 78, 0.08)",
                                    border: "1px solid rgba(201, 163, 78, 0.18)",
                                    color: gold,
                                }}
                            >
                                <div
                                    className="w-7 h-7 rounded-md flex items-center justify-center transition-colors duration-200"
                                    style={{ background: "rgba(201, 163, 78, 0.12)" }}
                                >
                                    <Calendar className="w-3.5 h-3.5" style={{ color: gold }} />
                                </div>
                                <span className="text-[13px] truncate font-semibold">{activeSheet.name}</span>
                                {isLocked && (
                                    <Lock className="w-3 h-3 ml-auto shrink-0" style={{ color: "rgba(201, 163, 78, 0.6)" }} />
                                )}
                                {sheets.length > 1 && (
                                    <span
                                        className="ml-auto text-[9px] font-black px-2 py-0.5 rounded"
                                        style={{
                                            background: "rgba(201, 163, 78, 0.12)",
                                            color: "rgba(201, 163, 78, 0.7)",
                                        }}
                                    >
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
                                        onClick={() => {
                                            onSheetChange(sheet.id);
                                            setSheetsExpanded(false);
                                            if (window.innerWidth < 1024) onToggle();
                                        }}
                                        className="w-full flex items-center gap-3 px-3.5 py-2 rounded-lg text-left transition-all duration-150"
                                        style={{ color: "rgba(232, 217, 184, 0.45)" }}
                                        onMouseEnter={e => {
                                            (e.currentTarget as HTMLButtonElement).style.background = "rgba(201, 163, 78, 0.07)";
                                            (e.currentTarget as HTMLButtonElement).style.color = "rgba(232, 217, 184, 0.8)";
                                        }}
                                        onMouseLeave={e => {
                                            (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                                            (e.currentTarget as HTMLButtonElement).style.color = "rgba(232, 217, 184, 0.45)";
                                        }}
                                    >
                                        <div
                                            className="w-7 h-7 rounded-md flex items-center justify-center"
                                            style={{ background: "rgba(232, 217, 184, 0.03)" }}
                                        >
                                            <Calendar className="w-3.5 h-3.5" style={{ color: "rgba(201, 163, 78, 0.3)" }} />
                                        </div>
                                        <span className="text-[13px] truncate font-medium">{sheet.name}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Divider */}
                    <div className="mx-5" style={{ height: "1px", background: "rgba(201, 163, 78, 0.1)" }} />

                    {/* ── MEMBERS ── */}
                    <div className="px-4 pt-4 pb-3">
                        <div className="flex items-center justify-between mb-3 px-1">
                            <h3
                                className="text-[9px] font-bold uppercase tracking-[0.24em]"
                                style={{ color: "rgba(201, 163, 78, 0.35)" }}
                            >
                                {t('members')}
                            </h3>
                            {currentUser?.role === 'ADMIN' && (
                                <button
                                    className="text-[10px] font-semibold transition-colors"
                                    style={{ color: "rgba(201, 163, 78, 0.55)" }}
                                    onMouseEnter={e => (e.currentTarget.style.color = gold)}
                                    onMouseLeave={e => (e.currentTarget.style.color = "rgba(201, 163, 78, 0.55)")}
                                    onClick={() => {
                                        onShowMemberManager();
                                        if (window.innerWidth < 1024) onToggle();
                                    }}
                                >
                                    {t('manage')}
                                </button>
                            )}
                        </div>
                        <div className="space-y-0.5">
                            {activeMembers.map(member => (
                                <div
                                    key={member.id}
                                    className="flex items-center gap-3 px-2.5 py-2 rounded-lg transition-all duration-150 group cursor-default"
                                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(201, 163, 78, 0.05)")}
                                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                                >
                                    <div className={cn(
                                        "w-8 h-8 rounded-full bg-gradient-to-br flex items-center justify-center text-[#E8D9B8] font-bold text-[10px]",
                                        getAvatarColor(member.name)
                                    )}
                                        style={{ boxShadow: "0 2px 6px rgba(0,0,0,0.3)" }}
                                    >
                                        {member.name.charAt(0).toUpperCase()}
                                    </div>
                                    <span
                                        className="text-[13px] font-medium truncate transition-colors"
                                        style={{ color: "rgba(232, 217, 184, 0.6)" }}
                                    >
                                        {member.name}
                                    </span>
                                    {member.name === currentUser?.name && (
                                        <span
                                            className="text-[8.5px] font-black px-2 py-0.5 rounded ml-auto"
                                            style={{
                                                background: "rgba(201, 163, 78, 0.1)",
                                                color: "rgba(201, 163, 78, 0.65)",
                                                border: "1px solid rgba(201, 163, 78, 0.15)",
                                            }}
                                        >
                                            {language === 'vi' ? 'bạn' : 'you'}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="mx-5" style={{ height: "1px", background: "rgba(201, 163, 78, 0.1)" }} />

                    {/* ── DEBT SUMMARY ── */}
                    {globalDebts && globalDebts.length > 0 && (
                        <div className="px-4 pt-4 pb-3">
                            <div className="mb-3 px-1">
                                <h3
                                    className="text-[9px] font-bold uppercase tracking-[0.24em]"
                                    style={{ color: "rgba(201, 163, 78, 0.35)" }}
                                >
                                    {t('finalSettlement')}
                                </h3>
                                <p
                                    className="mt-1 text-[10px] leading-relaxed"
                                    style={{ color: "rgba(232, 217, 184, 0.28)" }}
                                >
                                    {t('finalSettlementScope')}
                                </p>
                            </div>
                            <div className="space-y-1.5">
                                {globalDebts.slice(0, 5).map((debt, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-[12px] transition-all duration-150"
                                        style={{
                                            background: "rgba(232, 217, 184, 0.025)",
                                            border: "1px solid rgba(201, 163, 78, 0.1)",
                                        }}
                                        onMouseEnter={e => {
                                            (e.currentTarget as HTMLDivElement).style.background = "rgba(232, 217, 184, 0.04)";
                                        }}
                                        onMouseLeave={e => {
                                            (e.currentTarget as HTMLDivElement).style.background = "rgba(232, 217, 184, 0.025)";
                                        }}
                                    >
                                        <span
                                            className="font-semibold truncate max-w-[60px]"
                                            style={{ color: "rgba(232, 217, 184, 0.55)" }}
                                        >
                                            {debt.from}
                                        </span>
                                        <ArrowRight
                                            className="w-3 h-3 shrink-0"
                                            style={{ color: "rgba(201, 163, 78, 0.25)" }}
                                        />
                                        <span
                                            className="font-semibold truncate max-w-[60px]"
                                            style={{ color: "rgba(232, 217, 184, 0.55)" }}
                                        >
                                            {debt.to}
                                        </span>
                                        <span
                                            className="ml-auto font-black tabular-nums text-[11px] tracking-tight"
                                            style={{ color: "#E07070" }}
                                        >
                                            {formatMoney(debt.amount)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* ══════ BOTTOM NAV ══════ */}
                <div
                    className="p-3 space-y-0.5 shrink-0"
                    style={{ borderTop: "1px solid rgba(201, 163, 78, 0.1)" }}
                >
                    {[
                        {
                            icon: History, label: t('activityLog'), badge: 0,
                            onClick: () => { onShowActivityLog(); if (window.innerWidth < 1024) onToggle(); }
                        },
                        {
                            icon: Bell, label: t('notifications'), badge: pendingNotifications || 0,
                            onClick: () => { onShowNotifications(); if (window.innerWidth < 1024) onToggle(); }
                        },
                        {
                            icon: KeyRound, label: t('changePassword'), badge: 0,
                            onClick: onChangePassword
                        },
                    ].map(({ icon: Icon, label, onClick, badge }) => (
                        <button
                            key={label}
                            onClick={onClick}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 group"
                            style={{ color: "rgba(232, 217, 184, 0.45)" }}
                            onMouseEnter={e => {
                                (e.currentTarget as HTMLButtonElement).style.background = "rgba(201, 163, 78, 0.07)";
                                (e.currentTarget as HTMLButtonElement).style.color = "rgba(232, 217, 184, 0.8)";
                            }}
                            onMouseLeave={e => {
                                (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                                (e.currentTarget as HTMLButtonElement).style.color = "rgba(232, 217, 184, 0.45)";
                            }}
                        >
                            <div
                                className="w-7 h-7 rounded-md flex items-center justify-center transition-colors"
                                style={{ background: "rgba(232, 217, 184, 0.04)" }}
                            >
                                <Icon className="w-3.5 h-3.5" />
                            </div>
                            <span>{label}</span>
                            {badge > 0 && (
                                <span className="ml-auto flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-600 text-[9px] font-black text-white px-1 shadow-lg shadow-rose-900/40">
                                    {badge}
                                </span>
                            )}
                        </button>
                    ))}

                    {/* Theme + Language toggles */}
                    <div className="flex gap-1.5 px-1 pt-1.5">
                        {[
                            {
                                icon: theme === 'dark' ? Sun : Moon,
                                label: theme === 'dark' ? t('lightMode') : t('darkMode'),
                                onClick: toggleTheme,
                                iconColor: theme === 'dark' ? gold : "rgba(201, 163, 78, 0.6)",
                            },
                            {
                                icon: Globe,
                                label: language === 'en' ? 'Tiếng Việt' : 'English',
                                onClick: () => setLanguage(language === 'en' ? 'vi' : 'en'),
                                iconColor: "rgba(201, 163, 78, 0.5)",
                            },
                        ].map(({ icon: Icon, label, onClick, iconColor }) => (
                            <button
                                key={label}
                                onClick={onClick}
                                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10.5px] font-bold transition-all duration-200"
                                style={{
                                    color: "rgba(232, 217, 184, 0.4)",
                                    background: "rgba(232, 217, 184, 0.03)",
                                    border: "1px solid rgba(201, 163, 78, 0.1)",
                                }}
                                onMouseEnter={e => {
                                    (e.currentTarget as HTMLButtonElement).style.background = "rgba(201, 163, 78, 0.08)";
                                    (e.currentTarget as HTMLButtonElement).style.color = "rgba(232, 217, 184, 0.7)";
                                    (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(201, 163, 78, 0.2)";
                                }}
                                onMouseLeave={e => {
                                    (e.currentTarget as HTMLButtonElement).style.background = "rgba(232, 217, 184, 0.03)";
                                    (e.currentTarget as HTMLButtonElement).style.color = "rgba(232, 217, 184, 0.4)";
                                    (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(201, 163, 78, 0.1)";
                                }}
                            >
                                <Icon className="w-3.5 h-3.5" style={{ color: iconColor }} />
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ══════ USER INFO ══════ */}
                <div
                    className="p-3.5 shrink-0"
                    style={{ borderTop: "1px solid rgba(201, 163, 78, 0.08)" }}
                >
                    <div
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group"
                        style={{
                            background: "rgba(232, 217, 184, 0.03)",
                            border: "1px solid rgba(201, 163, 78, 0.1)",
                        }}
                        onMouseEnter={e => {
                            (e.currentTarget as HTMLDivElement).style.background = "rgba(232, 217, 184, 0.05)";
                        }}
                        onMouseLeave={e => {
                            (e.currentTarget as HTMLDivElement).style.background = "rgba(232, 217, 184, 0.03)";
                        }}
                    >
                        <div className="relative">
                            <div
                                className="w-9 h-9 rounded-lg flex items-center justify-center font-black text-sm"
                                style={{
                                    background: "linear-gradient(135deg, #8B1A1A, #6B0F0F)",
                                    color: "#E8D9B8",
                                    boxShadow: "0 4px 12px rgba(139, 26, 26, 0.4)",
                                }}
                            >
                                {currentUser?.name?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            {/* Online indicator in gold */}
                            <div
                                className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
                                style={{
                                    background: gold,
                                    borderColor: "#0D0403",
                                }}
                            />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p
                                className="text-sm font-semibold truncate leading-tight"
                                style={{ color: "rgba(232, 217, 184, 0.85)" }}
                            >
                                {currentUser?.name || 'User'}
                            </p>
                            <p
                                className="text-[10px] truncate mt-0.5"
                                style={{ color: "rgba(201, 163, 78, 0.35)" }}
                            >
                                @{currentUser?.username}
                            </p>
                        </div>
                        <button
                            className="p-2 rounded-lg transition-all duration-200"
                            style={{ color: "rgba(232, 217, 184, 0.22)" }}
                            title="Đăng xuất"
                            onClick={onLogout}
                            onMouseEnter={e => {
                                (e.currentTarget as HTMLButtonElement).style.color = "#E07070";
                                (e.currentTarget as HTMLButtonElement).style.background = "rgba(220, 80, 80, 0.1)";
                            }}
                            onMouseLeave={e => {
                                (e.currentTarget as HTMLButtonElement).style.color = "rgba(232, 217, 184, 0.22)";
                                (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                            }}
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
                    className="fixed top-3 left-3 z-40 lg:hidden p-2.5 rounded-xl backdrop-blur-md shadow-xl transition-all duration-200"
                    style={{
                        background: "rgba(13, 4, 3, 0.88)",
                        border: "1px solid rgba(201, 163, 78, 0.2)",
                        color: "rgba(232, 217, 184, 0.7)",
                        boxShadow: "0 8px 24px rgba(0, 0, 0, 0.4)",
                    }}
                >
                    <Menu className="w-5 h-5" />
                </button>
            )}
        </>
    );
}
