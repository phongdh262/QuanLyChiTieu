'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/ToastProvider';
import { KeyRound, Loader2, Eye, EyeOff } from 'lucide-react';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    memberId: number | null;
    memberName: string;
}

export default function ResetPasswordModal({ open, onOpenChange, memberId, memberName }: Props) {
    const { addToast } = useToast();
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleClose = (isOpen: boolean) => {
        if (!isOpen) {
            setNewPassword('');
            setConfirmPassword('');
            setShowPassword(false);
        }
        onOpenChange(isOpen);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!newPassword || !confirmPassword) {
            addToast('Vui lòng điền đầy đủ thông tin', 'warning');
            return;
        }

        if (newPassword.length < 8) {
            addToast('Mật khẩu phải có ít nhất 8 ký tự', 'warning');
            return;
        }

        if (newPassword !== confirmPassword) {
            addToast('Mật khẩu xác nhận không khớp', 'error');
            return;
        }

        if (!memberId) return;

        setIsLoading(true);
        try {
            const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ memberId, newPassword }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to reset password');
            }

            addToast(`Đã reset mật khẩu cho ${memberName}!`, 'success');
            handleClose(false);
        } catch (error: unknown) {
            addToast(error instanceof Error ? error.message : 'An error occurred', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <KeyRound className="w-5 h-5 text-amber-600" />
                        Reset mật khẩu
                    </DialogTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                        Đặt mật khẩu mới cho <span className="font-semibold text-slate-700">{memberName}</span>
                    </p>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="reset-new">Mật khẩu mới</Label>
                        <div className="relative">
                            <Input
                                id="reset-new"
                                type={showPassword ? 'text' : 'password'}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                disabled={isLoading}
                                placeholder="Tối thiểu 8 ký tự"
                                className="pr-10"
                            />
                            <button
                                type="button"
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                onClick={() => setShowPassword(!showPassword)}
                                tabIndex={-1}
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="reset-confirm">Xác nhận mật khẩu</Label>
                        <Input
                            id="reset-confirm"
                            type={showPassword ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            disabled={isLoading}
                            placeholder="Nhập lại mật khẩu mới"
                        />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => handleClose(false)} disabled={isLoading}>
                            Hủy
                        </Button>
                        <Button type="submit" disabled={isLoading} className="bg-amber-600 hover:bg-amber-700 text-white">
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Reset mật khẩu
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
