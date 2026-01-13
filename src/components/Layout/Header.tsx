'use client';

import React from 'react';
import { LogOut, User as UserIcon, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface User {
    id: number;
    role: string;
    name?: string;
    username?: string;
}

interface Props {
    user: User | null;
    title: string;
}

import ChangePasswordModal from '@/components/Auth/ChangePasswordModal';

export default function Header({ user, title }: Props) {
    const [isChangePasswordOpen, setIsChangePasswordOpen] = React.useState(false);

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

                {/* User Menu */}
                <div className="flex items-center gap-2">
                    {user ? (
                        <>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="relative h-10 px-2 md:px-3 rounded-full hover:bg-slate-100 gap-2 overflow-hidden border border-transparent hover:border-slate-200 transition-all">
                                        <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs ring-2 ring-white shadow-sm">
                                            {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                                        </div>
                                        <div className="flex flex-col items-start sr-only md:not-sr-only">
                                            <span className="text-sm font-semibold text-slate-700 leading-none">{user.name || user.username}</span>
                                            <span className="text-[10px] text-slate-400 leading-none mt-0.5 max-w-[80px] truncate">@{user.username}</span>
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
                        </>
                    ) : (
                        <Button variant="outline" size="sm" onClick={() => window.location.href = '/login'}>
                            Đăng nhập
                        </Button>
                    )}
                </div>
            </div>

            {/* Mobile Title (Only visible on small screens) */}
            <div className="md:hidden border-t border-slate-50 py-2 bg-slate-50/50">
                <h2 className="text-center text-sm font-bold text-slate-600 uppercase tracking-wider">
                    {title}
                </h2>
            </div>
        </header>
    );
}
