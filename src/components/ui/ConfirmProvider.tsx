'use client';
import React, { createContext, useContext, useState, useRef } from 'react';

interface ConfirmOptions {
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'info';
}

interface ConfirmContextType {
    confirm: (options: ConfirmOptions | string) => Promise<boolean>;
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
    const resolveRef = useRef<(value: boolean) => void>(() => { });

    const confirm = (opts: ConfirmOptions | string) => {
        const finalOptions = typeof opts === 'string' ? { message: opts } : opts;
        setOptions({
            title: 'Xác nhận',
            confirmText: 'Đồng ý',
            cancelText: 'Hủy',
            type: 'info',
            ...finalOptions
        });
        setIsOpen(true);
        return new Promise<boolean>((resolve) => {
            resolveRef.current = resolve;
        });
    };

    const handleConfirm = () => {
        setIsOpen(false);
        resolveRef.current(true);
    };

    const handleCancel = () => {
        setIsOpen(false);
        resolveRef.current(false);
    };

    return (
        <ConfirmContext.Provider value={{ confirm }}>
            {children}
            {isOpen && (
                <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-lg shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
                        <div className={`h-1.5 w-full ${options.type === 'danger' ? 'bg-red-500' : 'bg-blue-500'}`} />
                        <div className="p-6">
                            <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
                                {options.type === 'danger' ? '⚠️' : 'ℹ️'} {options.title}
                            </h3>
                            <p className="text-slate-600 mb-6 whitespace-pre-wrap leading-relaxed">
                                {options.message}
                            </p>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={handleCancel}
                                    className="px-4 py-2 bg-white border border-slate-300 rounded-md text-slate-700 font-medium hover:bg-slate-50 transition-colors"
                                >
                                    {options.cancelText}
                                </button>
                                <button
                                    onClick={handleConfirm}
                                    className={`px-4 py-2 rounded-md text-white font-medium shadow-sm transition-colors ${options.type === 'danger'
                                            ? 'bg-red-600 hover:bg-red-700 border-red-700'
                                            : 'bg-blue-600 hover:bg-blue-700 border-blue-700'
                                        }`}
                                >
                                    {options.confirmText}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </ConfirmContext.Provider>
    );
}
