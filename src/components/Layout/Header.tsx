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
                {/* Brand / Logo */}
                <div className="flex items-center gap-2 group cursor-pointer" onClick={() => window.location.href = '/'}>
                    <div className="relative w-10 h-10">
                        <div className="absolute inset-0 bg-indigo-500 rounded-xl blur-lg opacity-20 group-hover:opacity-40 transition-opacity duration-500 animate-pulse"></div>
                        <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-blue-600 to-violet-700 flex items-center justify-center text-white font-black text-xl shadow-indigo-200 shadow-xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 z-10 border border-white/20">
                            <span className="drop-shadow-md">$</span>
                        </div>
                    </div>
                    <span className="font-black text-2xl text-slate-800 tracking-tighter hidden sm:block relative">
                        ChiTieu<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">App</span>
                        <span className="absolute -top-1 -right-2 w-2 h-2 bg-rose-500 rounded-full animate-bounce delay-700"></span>
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
                                    "relative h-12 w-12 rounded-xl transition-all duration-300 overflow-visible group/bell",
                                    pendingCount > 0
                                        ? "bg-white text-indigo-600 shadow-lg shadow-indigo-100 ring-1 ring-indigo-50 hover:shadow-indigo-200 hover:ring-indigo-100"
                                        : "bg-white/40 text-slate-500 hover:bg-white hover:text-indigo-600 hover:shadow-md border border-transparent hover:border-slate-100"
                                )}
                                onClick={() => setIsConfirmModalOpen(true)}
                            >
                                <div className={cn(
                                    "absolute inset-0 bg-indigo-400/10 rounded-xl opacity-0 scale-90 group-hover/bell:opacity-100 group-hover/bell:scale-100 transition-all duration-300",
                                    pendingCount > 0 && "animate-pulse opacity-100"
                                )} />
                                <Bell className={cn(
                                    "w-6 h-6 transition-all duration-500 relative z-10",
                                    pendingCount > 0
                                        ? "animate-[swing_3s_ease-in-out_infinite] fill-indigo-100 text-indigo-600"
                                        : "group-hover/bell:scale-110 group-hover/bell:rotate-12"
                                )} />
                                {pendingCount > 0 && (
                                    <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-red-600 text-[10px] font-black text-white ring-2 ring-white shadow-lg animate-in zoom-in duration-300 z-20">
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
                                    <Button variant="ghost" className="relative h-11 px-2 md:pl-1.5 md:pr-4 rounded-xl hover:bg-white gap-2 border border-transparent bg-white/40 backdrop-blur-sm shadow-sm hover:shadow-md hover:border-slate-100 transition-all duration-300 group overflow-hidden">
                                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-50/0 via-indigo-50/30 to-indigo-50/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center font-black text-xs shadow-indigo-200 shadow-md group-hover:scale-105 group-hover:rotate-3 transition-all duration-300 z-10 ring-2 ring-white">
                                            {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                                        </div>
                                        <div className="flex flex-col items-start sr-only md:not-sr-only z-10 pl-1">
                                            <span className="text-xs font-bold text-slate-700 leading-tight tracking-tight group-hover:text-indigo-700 transition-colors">{user.name || user.username}</span>
                                            <span className="text-[9px] font-bold text-slate-400 leading-none mt-0.5 tracking-wider uppercase group-hover:text-indigo-400/80 transition-colors">@{user.username}</span>
                                        </div>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-56" align="end" forceMount>
                                    <DropdownMenuLabel className="font-normal">
                                        <div className="flex flex-col space-y-1">
                                            <p className="text-sm font-medium leading-none">{user.name || 'User'}</p>
                                            <p className="text-xs leading-none text-muted-foreground">
                                                @{user.username}
                                            </p>
                                        </div>
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="cursor-pointer" onClick={() => setIsChangePasswordOpen(true)}>
                                        <UserIcon className="mr-2 h-4 w-4" />
                                        <span>Change Password</span>
                                    </DropdownMenuItem>
                                    {user.role === 'ADMIN' && (
                                        <DropdownMenuItem className="cursor-pointer">
                                            <Shield className="mr-2 h-4 w-4" />
                                            <span>Admin Panel</span>
                                        </DropdownMenuItem>
                                    )}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50" onClick={handleLogout}>
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
                        <Button variant="outline" size="sm" onClick={() => window.location.href = '/login'}>
                            Sign In
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
