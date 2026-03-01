'use client';

import React from 'react';
import { LogOut, User as UserIcon, Shield, Bell, History, Users, Sparkles } from 'lucide-react';
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
        <header className="w-full bg-white/60 dark:bg-[#0c0e16]/80 backdrop-blur-xl border-b border-slate-200/60 dark:border-white/[0.04] sticky top-0 z-40 mb-6 shadow-sm transition-colors duration-300">
            <div className="container mx-auto max-w-7xl px-4 h-16 flex items-center justify-between">
                {/* Brand / Logo (Mobile mostly, visible on desktop if sidebar hidden) */}
                <div className="flex items-center gap-3 cursor-pointer group lg:hidden" onClick={() => window.location.href = '/'}>
                    <div className="relative">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 flex items-center justify-center text-white font-black shadow-lg shadow-indigo-500/30 group-hover:shadow-indigo-500/50 group-hover:scale-105 transition-all duration-300">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-indigo-400 to-violet-500 blur-lg opacity-20 group-hover:opacity-40 transition-opacity" />
                    </div>
                </div>

                {/* Dynamic Title (Sheet Name) */}
                <h1 className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-[0.2em] bg-slate-100/50 dark:bg-white/[0.03] px-4 py-1.5 rounded-full border border-slate-200/50 dark:border-white/[0.04] shadow-sm transition-colors duration-300">
                    {title}
                </h1>

                {/* Spacer for mobile to push actions to right */}
                <div className="flex-1 lg:hidden"></div>

                {/* Right Actions */}
                <div className="flex items-center gap-2">
                    {user ? (
                        <>
                            {/* Activity Log Button */}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 rounded-xl bg-slate-100/50 dark:bg-white/[0.03] text-slate-500 dark:text-white/60 hover:bg-slate-200/50 dark:hover:bg-white/[0.08] hover:text-indigo-600 dark:hover:text-white border border-transparent transition-all duration-300"
                                onClick={onShowActivityLog}
                                title="Activity Log"
                            >
                                <History className="w-4 h-4" />
                            </Button>

                            {/* Members Button - ADMIN only */}
                            {user.role === 'ADMIN' && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-10 w-10 hidden sm:flex rounded-xl bg-slate-100/50 dark:bg-white/[0.03] text-slate-500 dark:text-white/60 hover:bg-slate-200/50 dark:hover:bg-white/[0.08] hover:text-indigo-600 dark:hover:text-white border border-transparent transition-all duration-300"
                                    onClick={onShowMemberManager}
                                    title="Manage Members"
                                >
                                    <Users className="w-4 h-4" />
                                </Button>
                            )}

                            {/* Notification Bell */}
                            <div className="relative group">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className={cn(
                                        "relative h-10 w-10 rounded-xl transition-all duration-300 overflow-visible group/bell",
                                        pendingCount > 0
                                            ? "bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-500/30 hover:bg-indigo-100 dark:hover:bg-indigo-500/30 hover:text-indigo-700 dark:hover:text-indigo-200"
                                            : "bg-slate-100/50 dark:bg-white/[0.03] text-slate-500 dark:text-white/60 hover:bg-slate-200/50 dark:hover:bg-white/[0.08] hover:text-indigo-600 dark:hover:text-white border border-transparent"
                                    )}
                                    onClick={() => setIsConfirmModalOpen(true)}
                                >
                                    <Bell className={cn(
                                        "w-4 h-4 transition-all duration-500 relative z-10",
                                        pendingCount > 0
                                            ? "animate-[swing_3s_ease-in-out_infinite] fill-indigo-100/50 dark:fill-indigo-500/20 text-indigo-500 dark:text-indigo-400"
                                            : "group-hover/bell:scale-110 group-hover/bell:rotate-12"
                                    )} />
                                    {pendingCount > 0 && (
                                        <span className="absolute -top-1.5 -right-1.5 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-red-600 text-[9px] font-black text-white px-1 shadow-lg shadow-rose-500/30 animate-in zoom-in duration-300 z-20">
                                            {pendingCount}
                                        </span>
                                    )}
                                </Button>
                            </div>

                            <div className="w-px h-6 bg-slate-200/60 dark:bg-white/[0.06] mx-1 hidden sm:block transition-colors duration-300"></div>

                            {/* User Menu */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="relative h-10 px-2 sm:pl-2 sm:pr-4 rounded-xl hover:bg-slate-100/50 dark:hover:bg-white/[0.04] gap-2.5 border border-transparent bg-slate-50 dark:bg-white/[0.02] shadow-sm transition-all duration-300 group overflow-hidden">
                                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 text-white flex items-center justify-center font-black text-xs shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-all duration-300 z-10">
                                            {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                                        </div>
                                        <div className="flex flex-col items-start sr-only sm:not-sr-only z-10">
                                            <span className="text-xs font-semibold text-slate-700 dark:text-white/90 leading-tight group-hover:text-indigo-600 dark:group-hover:text-white transition-colors">{user.name || user.username}</span>
                                            <span className="text-[9px] font-medium text-slate-400 dark:text-white/40 leading-none mt-0.5 tracking-wide group-hover:text-indigo-400 dark:group-hover:text-white/60 transition-colors">@{user.username}</span>
                                        </div>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-56 bg-white dark:bg-[#1a1d2d] border-slate-200 dark:border-white/[0.06] shadow-xl transition-colors duration-300" align="end" forceMount>
                                    <DropdownMenuLabel className="font-normal">
                                        <div className="flex flex-col space-y-1">
                                            <p className="text-sm font-medium leading-none text-slate-700 dark:text-white">{user.name || 'User'}</p>
                                            <p className="text-xs leading-none text-slate-500 dark:text-white/50">
                                                @{user.username}
                                            </p>
                                        </div>
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator className="bg-slate-100 dark:bg-white/[0.06]" />
                                    <DropdownMenuItem className="cursor-pointer hover:bg-slate-50 dark:hover:bg-white/[0.06] focus:bg-slate-50 dark:focus:bg-white/[0.06] text-slate-700 dark:text-white/90 focus:text-slate-900 dark:focus:text-white transition-colors duration-200" onClick={() => setIsChangePasswordOpen(true)}>
                                        <UserIcon className="mr-2 h-4 w-4 text-slate-400 dark:text-white/60" />
                                        <span>Change Password</span>
                                    </DropdownMenuItem>
                                    {user.role === 'ADMIN' && (
                                        <DropdownMenuItem className="cursor-pointer hover:bg-slate-50 dark:hover:bg-white/[0.06] focus:bg-slate-50 dark:focus:bg-white/[0.06] text-slate-700 dark:text-white/90 focus:text-slate-900 dark:focus:text-white transition-colors duration-200">
                                            <Shield className="mr-2 h-4 w-4 text-slate-400 dark:text-white/60" />
                                            <span>Admin Panel</span>
                                        </DropdownMenuItem>
                                    )}
                                    <DropdownMenuSeparator className="bg-slate-100 dark:bg-white/[0.06]" />
                                    <DropdownMenuItem className="cursor-pointer text-rose-500 dark:text-rose-400 focus:text-rose-600 dark:focus:text-rose-400 focus:bg-rose-50 dark:focus:bg-rose-500/10 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors duration-200" onClick={handleLogout}>
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
                        <Button variant="outline" size="sm" className="bg-indigo-600 text-white border-transparent hover:bg-indigo-700 hover:text-white transition-colors duration-300" onClick={() => window.location.href = '/login'}>
                            Sign In
                        </Button>
                    )}
                </div>
            </div>

            {/* Mobile Title */}
            <div className="md:hidden border-t border-slate-200/60 dark:border-white/[0.04] py-2 bg-slate-50/95 dark:bg-[#0c0e16]/95 backdrop-blur-xl transition-colors duration-300">
                <h2 className="text-center text-[10px] font-bold text-slate-500 dark:text-white/50 uppercase tracking-[0.2em]">
                    {title}
                </h2>
            </div>
        </header>
    );
}
