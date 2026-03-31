'use client';

import React from 'react';
import { LogOut, User as UserIcon, Shield, Bell, History, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import useSWR from 'swr';
import ConfirmationModal from '@/components/Dashboard/ConfirmationModal';
import { cn } from "@/lib/utils";
import ChangePasswordModal from '@/components/Auth/ChangePasswordModal';

const fetcher = (url: string) => fetch(url).then(res => res.json());

interface User {
    id: number;
    role: string;
    name?: string;
    username?: string;
}

interface Props {
    user: User | null;
    title: string;
    onUpdated?: () => void;
    onShowActivityLog?: () => void;
    onShowMemberManager?: () => void;
}

/* Small Dong Son concentric decoration for header title */
const TitleOrnament = () => (
    <span className="inline-flex items-center gap-2 mx-3" aria-hidden="true">
        <svg width="22" height="6" viewBox="0 0 22 6" fill="none">
            <line x1="0" y1="3" x2="8" y2="3" stroke="currentColor" strokeWidth="0.7" strokeOpacity="0.4" />
            <circle cx="11" cy="3" r="1.4" stroke="currentColor" strokeWidth="0.7" fill="none" strokeOpacity="0.5" />
            <circle cx="11" cy="3" r="0.5" fill="currentColor" fillOpacity="0.45" />
            <line x1="14" y1="3" x2="22" y2="3" stroke="currentColor" strokeWidth="0.7" strokeOpacity="0.4" />
        </svg>
    </span>
);

export default function Header({ user, title, onUpdated, onShowActivityLog, onShowMemberManager }: Props) {
    const [isChangePasswordOpen, setIsChangePasswordOpen] = React.useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = React.useState(false);

    const { data: notifications, mutate } = useSWR('/api/notifications', fetcher, {
        refreshInterval: 10000
    });

    const pendingCount = notifications?.totalPending || 0;

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.href = '/login';
    };

    return (
        <header
            className="w-full sticky top-0 z-40 mb-6 transition-colors duration-300"
            style={{
                background: "linear-gradient(to bottom, hsl(40, 48%, 96%) 0%, hsl(38, 42%, 94%) 100%)",
                borderBottom: "1px solid rgba(201, 163, 78, 0.22)",
                boxShadow: "0 2px 16px rgba(44, 24, 16, 0.05)",
            }}
        >
            {/* Subtle sawtooth zigzag at very bottom of header */}
            <div
                className="absolute bottom-0 left-0 right-0"
                style={{
                    height: "3px",
                    backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='3'%3E%3Cpath d='M0 3 L7 0 L14 3' fill='none' stroke='%23C9A34E' stroke-width='0.7' stroke-opacity='0.3'/%3E%3C/svg%3E\")",
                    backgroundRepeat: "repeat-x",
                    backgroundSize: "14px 3px",
                }}
            />

            {/* Dark mode overrides */}
            <style>{`
                .dark header {
                    background: linear-gradient(to bottom, hsl(10, 55%, 8%) 0%, hsl(9, 58%, 6%) 100%) !important;
                    border-bottom-color: rgba(201, 163, 78, 0.12) !important;
                    box-shadow: 0 2px 16px rgba(0, 0, 0, 0.35) !important;
                }
            `}</style>

            <div className="container mx-auto max-w-7xl px-4 h-16 flex items-center justify-between">

                {/* Mobile: Dong Son logo mark */}
                <div
                    className="flex items-center gap-2.5 cursor-pointer group lg:hidden"
                    onClick={() => window.location.href = '/'}
                >
                    <div
                        className="w-10 h-10 rounded-full flex items-center justify-center group-hover:scale-105 transition-all duration-300"
                        style={{
                            background: "rgba(139, 26, 26, 0.08)",
                            border: "1px solid rgba(139, 26, 26, 0.2)",
                            color: "#8B1A1A",
                        }}
                    >
                        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
                            <circle cx="11" cy="11" r="2.5" fill="currentColor" />
                            <circle cx="11" cy="11" r="5" stroke="currentColor" strokeWidth="0.6" fill="none" />
                            <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="0.6" fill="none" />
                            {[0, 90, 180, 270].map((deg, i) => {
                                const a = (deg * Math.PI) / 180;
                                return <circle key={i} cx={11 + 5 * Math.cos(a)} cy={11 + 5 * Math.sin(a)} r="0.8" fill="currentColor" />;
                            })}
                        </svg>
                    </div>
                </div>

                {/* Desktop: Centered title with ornamental flanking */}
                <h1
                    className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center whitespace-nowrap"
                    style={{
                        fontFamily: "var(--font-cormorant), Georgia, serif",
                        fontSize: "13.5px",
                        fontWeight: 600,
                        letterSpacing: "0.18em",
                        color: "rgba(44, 24, 16, 0.55)",
                        textTransform: "uppercase",
                    }}
                >
                    <TitleOrnament />
                    {title}
                    <TitleOrnament />
                </h1>

                {/* Spacer for mobile */}
                <div className="flex-1 lg:hidden" />

                {/* Right Actions */}
                <div className="flex items-center gap-1.5">
                    {user ? (
                        <>
                            {/* Activity Log */}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 rounded-lg transition-all duration-200"
                                style={{
                                    background: "rgba(139, 26, 26, 0.05)",
                                    color: "rgba(44, 24, 16, 0.5)",
                                    border: "1px solid transparent",
                                }}
                                onClick={onShowActivityLog}
                                title="Activity Log"
                                onMouseEnter={e => {
                                    (e.currentTarget as HTMLButtonElement).style.background = "rgba(139, 26, 26, 0.1)";
                                    (e.currentTarget as HTMLButtonElement).style.color = "#8B1A1A";
                                    (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(139, 26, 26, 0.15)";
                                }}
                                onMouseLeave={e => {
                                    (e.currentTarget as HTMLButtonElement).style.background = "rgba(139, 26, 26, 0.05)";
                                    (e.currentTarget as HTMLButtonElement).style.color = "rgba(44, 24, 16, 0.5)";
                                    (e.currentTarget as HTMLButtonElement).style.borderColor = "transparent";
                                }}
                            >
                                <History className="w-4 h-4" />
                            </Button>

                            {/* Members (ADMIN only) */}
                            {user.role === 'ADMIN' && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9 hidden sm:flex rounded-lg transition-all duration-200"
                                    style={{
                                        background: "rgba(139, 26, 26, 0.05)",
                                        color: "rgba(44, 24, 16, 0.5)",
                                        border: "1px solid transparent",
                                    }}
                                    onClick={onShowMemberManager}
                                    title="Manage Members"
                                    onMouseEnter={e => {
                                        (e.currentTarget as HTMLButtonElement).style.background = "rgba(139, 26, 26, 0.1)";
                                        (e.currentTarget as HTMLButtonElement).style.color = "#8B1A1A";
                                        (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(139, 26, 26, 0.15)";
                                    }}
                                    onMouseLeave={e => {
                                        (e.currentTarget as HTMLButtonElement).style.background = "rgba(139, 26, 26, 0.05)";
                                        (e.currentTarget as HTMLButtonElement).style.color = "rgba(44, 24, 16, 0.5)";
                                        (e.currentTarget as HTMLButtonElement).style.borderColor = "transparent";
                                    }}
                                >
                                    <Users className="w-4 h-4" />
                                </Button>
                            )}

                            {/* Notification Bell */}
                            <div className="relative">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className={cn(
                                        "relative h-9 w-9 rounded-lg transition-all duration-200",
                                        pendingCount > 0 ? "animate-[swing_3s_ease-in-out_infinite]" : ""
                                    )}
                                    style={pendingCount > 0 ? {
                                        background: "rgba(139, 26, 26, 0.08)",
                                        color: "#8B1A1A",
                                        border: "1px solid rgba(139, 26, 26, 0.18)",
                                    } : {
                                        background: "rgba(139, 26, 26, 0.05)",
                                        color: "rgba(44, 24, 16, 0.5)",
                                        border: "1px solid transparent",
                                    }}
                                    onClick={() => setIsConfirmModalOpen(true)}
                                >
                                    <Bell className="w-4 h-4" />
                                    {pendingCount > 0 && (
                                        <span
                                            className="absolute -top-1.5 -right-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full text-[9px] font-black text-white px-1 animate-in zoom-in duration-300 z-20"
                                            style={{
                                                background: "linear-gradient(135deg, #8B1A1A, #6B0F0F)",
                                                boxShadow: "0 2px 8px rgba(139, 26, 26, 0.5)",
                                            }}
                                        >
                                            {pendingCount}
                                        </span>
                                    )}
                                </Button>
                            </div>

                            {/* Ornamental divider */}
                            <div
                                className="w-px h-5 mx-0.5 hidden sm:block"
                                style={{ background: "rgba(139, 26, 26, 0.15)" }}
                            />

                            {/* User Menu */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        className="relative h-9 px-2 sm:pl-2 sm:pr-3.5 rounded-lg gap-2.5 transition-all duration-200 group overflow-hidden"
                                        style={{
                                            background: "rgba(139, 26, 26, 0.05)",
                                            border: "1px solid rgba(139, 26, 26, 0.1)",
                                        }}
                                    >
                                        <div
                                            className="w-6 h-6 rounded-md flex items-center justify-center font-black text-[11px] group-hover:scale-105 transition-transform duration-200 z-10"
                                            style={{
                                                background: "linear-gradient(135deg, #8B1A1A, #6B0F0F)",
                                                color: "#E8D9B8",
                                                boxShadow: "0 2px 8px rgba(139, 26, 26, 0.3)",
                                            }}
                                        >
                                            {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                                        </div>
                                        <div className="flex flex-col items-start sr-only sm:not-sr-only z-10">
                                            <span
                                                className="text-xs font-semibold leading-tight"
                                                style={{ color: "rgba(44, 24, 16, 0.75)" }}
                                            >
                                                {user.name || user.username}
                                            </span>
                                            <span
                                                className="text-[9px] font-medium leading-none mt-0.5 tracking-wide"
                                                style={{ color: "rgba(44, 24, 16, 0.38)" }}
                                            >
                                                @{user.username}
                                            </span>
                                        </div>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    className="w-56 border shadow-xl"
                                    style={{
                                        background: "hsl(40, 50%, 97%)",
                                        borderColor: "rgba(201, 163, 78, 0.22)",
                                        boxShadow: "0 12px 32px rgba(44, 24, 16, 0.12)",
                                    }}
                                    align="end"
                                    forceMount
                                >
                                    <DropdownMenuLabel className="font-normal">
                                        <div className="flex flex-col space-y-1">
                                            <p
                                                className="text-sm font-semibold leading-none"
                                                style={{
                                                    fontFamily: "var(--font-cormorant), Georgia, serif",
                                                    color: "rgba(44, 24, 16, 0.85)",
                                                    fontSize: "15px",
                                                }}
                                            >
                                                {user.name || 'User'}
                                            </p>
                                            <p className="text-xs leading-none" style={{ color: "rgba(44, 24, 16, 0.4)" }}>
                                                @{user.username}
                                            </p>
                                        </div>
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator style={{ background: "rgba(201, 163, 78, 0.18)" }} />
                                    <DropdownMenuItem
                                        className="cursor-pointer transition-colors duration-150"
                                        style={{ color: "rgba(44, 24, 16, 0.75)" }}
                                        onClick={() => setIsChangePasswordOpen(true)}
                                    >
                                        <UserIcon className="mr-2 h-4 w-4" style={{ color: "rgba(139, 26, 26, 0.6)" }} />
                                        <span>Change Password</span>
                                    </DropdownMenuItem>
                                    {user.role === 'ADMIN' && (
                                        <DropdownMenuItem
                                            className="cursor-pointer transition-colors duration-150"
                                            style={{ color: "rgba(44, 24, 16, 0.75)" }}
                                        >
                                            <Shield className="mr-2 h-4 w-4" style={{ color: "rgba(139, 26, 26, 0.6)" }} />
                                            <span>Admin Panel</span>
                                        </DropdownMenuItem>
                                    )}
                                    <DropdownMenuSeparator style={{ background: "rgba(201, 163, 78, 0.18)" }} />
                                    <DropdownMenuItem
                                        className="cursor-pointer text-rose-700 focus:text-rose-800 focus:bg-rose-50 hover:bg-rose-50 transition-colors duration-150"
                                        onClick={handleLogout}
                                    >
                                        <LogOut className="mr-2 h-4 w-4" />
                                        <span>Sign Out</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <ChangePasswordModal
                                open={isChangePasswordOpen}
                                onOpenChange={setIsChangePasswordOpen}
                            />
                            <ConfirmationModal
                                open={isConfirmModalOpen}
                                onOpenChange={setIsConfirmModalOpen}
                                onUpdated={() => {
                                    if (onUpdated) onUpdated();
                                    mutate();
                                }}
                            />
                        </>
                    ) : (
                        <Button
                            variant="outline"
                            size="sm"
                            className="text-white border-transparent transition-colors duration-200"
                            style={{ background: "linear-gradient(135deg, #8B1A1A, #6B0F0F)" }}
                            onClick={() => window.location.href = '/login'}
                        >
                            Sign In
                        </Button>
                    )}
                </div>
            </div>

            {/* Mobile Title */}
            <div
                className="md:hidden py-2"
                style={{
                    borderTop: "1px solid rgba(201, 163, 78, 0.14)",
                    background: "rgba(245, 237, 216, 0.6)",
                }}
            >
                <h2
                    className="text-center"
                    style={{
                        fontFamily: "var(--font-cormorant), Georgia, serif",
                        fontSize: "12px",
                        letterSpacing: "0.2em",
                        textTransform: "uppercase",
                        color: "rgba(44, 24, 16, 0.5)",
                    }}
                >
                    {title}
                </h2>
            </div>
        </header>
    );
}
