'use client';
import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ConfirmOptions {
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'info';
    rejectText?: string;
}

interface ConfirmContextType {
    confirm: (options: ConfirmOptions | string) => Promise<boolean | 'reject'>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export const useConfirm = () => {
    const context = useContext(ConfirmContext);
    if (!context) {
        throw new Error('useConfirm must be used within a ConfirmProvider');
    }
    return context;
};

export default function ConfirmProvider({ children }: { children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [options, setOptions] = useState<ConfirmOptions>({ message: '' });
    const resolveRef = useRef<(value: boolean | 'reject') => void>(() => { });

    const confirm = useCallback((opts: ConfirmOptions | string) => {
        const finalOptions = typeof opts === 'string' ? { message: opts } : opts;
        setOptions({
            title: 'Xác nhận',
            confirmText: 'Đồng ý',
            cancelText: 'Hủy',
            type: 'info',
            ...finalOptions
        });
        setIsOpen(true);
        return new Promise<boolean | 'reject'>((resolve) => {
            resolveRef.current = resolve;
        });
    }, []);

    const handleConfirm = useCallback(() => {
        setIsOpen(false);
        // Delay resolution to ensure modal unmounts first
        setTimeout(() => resolveRef.current(true), 50);
    }, []);

    const handleCancel = useCallback(() => {
        setIsOpen(false);
        setTimeout(() => resolveRef.current(false), 50);
    }, []);

    const handleReject = useCallback(() => {
        setIsOpen(false);
        setTimeout(() => resolveRef.current('reject'), 50);
    }, []);

    return (
        <ConfirmContext.Provider value={{ confirm }}>
            {children}
            <AlertDialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
                <AlertDialogContent className="max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            {options.type === 'danger' ? '⚠️' : 'ℹ️'} {options.title}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="whitespace-pre-wrap leading-relaxed text-slate-600">
                            {options.message}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2 sm:gap-2">
                        {options.rejectText && (
                            <AlertDialogCancel
                                onClick={(e) => {
                                    e.preventDefault();
                                    handleReject();
                                }}
                                className="border-red-200 text-red-600 hover:bg-red-50"
                            >
                                {options.rejectText}
                            </AlertDialogCancel>
                        )}
                        <AlertDialogCancel
                            onClick={(e) => {
                                e.preventDefault();
                                handleCancel();
                            }}
                        >
                            {options.cancelText}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                handleConfirm();
                            }}
                            className={options.type === 'danger'
                                ? 'bg-red-600 hover:bg-red-700 text-white'
                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                            }
                        >
                            {options.confirmText}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </ConfirmContext.Provider>
    );
}
