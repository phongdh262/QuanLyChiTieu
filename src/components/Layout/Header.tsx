'use client';

import React from 'react';
import { LogOut, User as UserIcon, Shield, Bell } from 'lucide-react';
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
}

export default function Header({ user, title, onUpdated }: Props) {
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
        <header className="w-full glass-effect sticky top-0 z-50 mb-6">
            <div className="container mx-auto max-w-7xl px-4 h-16 flex items-center justify-between">
                {/* Brand / Logo */}
                <div className="flex items-center gap-2 group cursor-pointer" onClick={() => window.location.href = '/'}>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-blue-600 to-violet-700 flex items-center justify-center text-white font-black text-xl shadow-indigo-200 shadow-xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                        $
                    </div>
                    <span className="font-black text-2xl text-slate-800 tracking-tighter hidden sm:block">
                        ChiTieu<span className="text-indigo-600">App</span>
                    </span>
                </div>

                {/* Dynamic Title (Sheet Name) */}
                <h1 className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-xs md:text-sm font-black text-slate-500 uppercase tracking-[0.2em] opacity-0 md:opacity-100 transition-opacity bg-indigo-50/50 px-4 py-1.5 rounded-full border border-indigo-100/50">
                    {title}
                </h1>

                {/* Right Actions */}
                <div className="flex items-center gap-3">
                    {user && (
                        <div className="relative group">
                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn(
                                    "relative h-12 w-12 rounded-2xl transition-all duration-500 overflow-visible group/bell",
                                    pendingCount > 0
                                        ? "bg-white/80 text-indigo-600 shadow-indigo-100/50 shadow-lg ring-1 ring-indigo-50"
                                        : "bg-white/40 text-slate-400 hover:bg-white/60 hover:text-slate-600 hover:shadow-md"
                                )}
                                onClick={() => setIsConfirmModalOpen(true)}
                            >
                                <div className={cn(
                                    "absolute inset-0 bg-indigo-50/50 rounded-2xl opacity-0 group-hover/bell:opacity-100 transition-opacity duration-500",
                                    pendingCount > 0 && "animate-pulse"
                                )} />
                                <Bell className={cn(
                                    "w-6 h-6 transition-all duration-500 relative z-10",
                                    pendingCount > 0
                                        ? "animate-[swing_2s_ease-in-out_infinite] fill-indigo-100 text-indigo-600 drop-shadow-sm"
                                        : "group-hover/bell:scale-110 group-hover/bell:rotate-12"
                                )} />
                                {pendingCount > 0 && (
                                    <span className="absolute -top-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-tr from-rose-500 via-red-500 to-orange-500 text-[10px] font-black text-white ring-4 ring-white/90 shadow-lg animate-in zoom-in duration-300 z-20">
                                        {pendingCount}
                                    </span>
                                )}
                            </Button>
                        </div>
                    )}

                    {user ? (
                        <>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="relative h-12 px-2 md:pl-2 md:pr-4 rounded-2xl hover:bg-white gap-3 border border-slate-100/50 bg-white/50 backdrop-blur-sm soft-shadow hover:deep-shadow hover:border-indigo-200 transition-all duration-500 group overflow-hidden">
                                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/0 to-indigo-50/0 group-hover:from-indigo-50/50 group-hover:to-transparent transition-all duration-500" />
                                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center font-black text-sm shadow-indigo-200 shadow-xl group-hover:scale-105 group-hover:rotate-3 transition-all duration-500 z-10">
                                            {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                                        </div>
                                        <div className="flex flex-col items-start sr-only md:not-sr-only z-10">
                                            <span className="text-sm font-black text-slate-800 leading-tight tracking-tight">{user.name || user.username}</span>
                                            <span className="text-[10px] font-black text-indigo-500/60 leading-none mt-0.5 tracking-widest uppercase">@{user.username}</span>
                                        </div>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-56" align="end" forceMount>
                                    <DropdownMenuLabel className="font-normal">
                                        <div className="flex flex-col space-y-1">
                                            <p className="text-sm font-medium leading-none">{user.name || 'Người dùng'}</p>
                                            <p className="text-xs leading-none text-muted-foreground">
                                                @{user.username}
                                            </p>
                                        </div>
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="cursor-pointer" onClick={() => setIsChangePasswordOpen(true)}>
                                        <UserIcon className="mr-2 h-4 w-4" />
                                        <span>Đổi mật khẩu</span>
                                    </DropdownMenuItem>
                                    {user.role === 'ADMIN' && (
                                        <DropdownMenuItem className="cursor-pointer">
                                            <Shield className="mr-2 h-4 w-4" />
                                            <span>Quản trị viên</span>
                                        </DropdownMenuItem>
                                    )}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50" onClick={handleLogout}>
                                        <LogOut className="mr-2 h-4 w-4" />
                                        <span>Đăng xuất</span>
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
                        <Button variant="outline" size="sm" onClick={() => window.location.href = '/login'}>
                            Đăng nhập
                        </Button>
                    )}
                </div>
            </div>

            {/* Mobile Title */}
            <div className="md:hidden border-t border-slate-50 py-2 bg-slate-50/50">
                <h2 className="text-center text-sm font-bold text-slate-600 uppercase tracking-wider">
                    {title}
                </h2>
            </div>
        </header>
    );
}
