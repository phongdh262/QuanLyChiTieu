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
        <header className="w-full bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-50 mb-6">
            <div className="container mx-auto max-w-7xl px-4 h-16 flex items-center justify-between">
                {/* Brand / Logo */}
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                        $
                    </div>
                    <span className="font-bold text-xl text-slate-800 tracking-tight hidden sm:block">
                        ChiTieu<span className="text-blue-600">App</span>
                    </span>
                </div>

                {/* Dynamic Title (Sheet Name) */}
                <h1 className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-sm md:text-lg font-bold text-slate-700 uppercase tracking-wide opacity-0 md:opacity-100 transition-opacity">
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
                                    "relative h-10 w-10 rounded-xl transition-all duration-300",
                                    pendingCount > 0
                                        ? "bg-indigo-50/50 text-indigo-600 hover:bg-indigo-100/80"
                                        : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                                )}
                                onClick={() => setIsConfirmModalOpen(true)}
                            >
                                <Bell className={cn(
                                    "w-5 h-5 transition-transform duration-500",
                                    pendingCount > 0 && "animate-bounce fill-indigo-100"
                                )} />
                                {pendingCount > 0 && (
                                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-tr from-pink-500 to-red-500 text-[10px] font-black text-white ring-2 ring-white shadow-sm animate-pulse">
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
                                    <Button variant="ghost" className="relative h-11 px-2 md:pl-2 md:pr-4 rounded-xl hover:bg-slate-50 gap-3 border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all duration-300 group">
                                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 text-white flex items-center justify-center font-black text-sm shadow-indigo-200 shadow-lg group-hover:scale-105 transition-transform">
                                            {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                                        </div>
                                        <div className="flex flex-col items-start sr-only md:not-sr-only">
                                            <span className="text-sm font-bold text-slate-800 leading-tight tracking-tight">{user.name || user.username}</span>
                                            <span className="text-[10px] font-bold text-indigo-500/70 leading-none mt-0.5 tracking-wider uppercase">@{user.username}</span>
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
