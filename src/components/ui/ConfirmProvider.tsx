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
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 10000,
                    backdropFilter: 'blur(4px)',
                    animation: 'fadeIn 0.2s ease-out'
                }}>
                    <div className="card" style={{
                        width: '400px', maxWidth: '90%', margin: 0,
                        borderTop: `4px solid ${options.type === 'danger' ? '#ef4444' : '#3b82f6'}`,
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                        animation: 'slideIn 0.2s ease-out'
                    }}>
                        <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {options.type === 'danger' ? '⚠️' : 'ℹ️'} {options.title}
                        </h3>
                        <p style={{ color: '#4b5563', marginBottom: '1.5rem', whiteSpace: 'pre-wrap' }}>
                            {options.message}
                        </p>
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                            <button onClick={handleCancel} className="secondary">
                                {options.cancelText}
                            </button>
                            <button
                                onClick={handleConfirm}
                                className="primary"
                                style={{
                                    background: options.type === 'danger' ? '#ef4444' : 'var(--primary)',
                                    borderColor: options.type === 'danger' ? '#dc2626' : 'var(--primary)'
                                }}
                            >
                                {options.confirmText}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </ConfirmContext.Provider>
    );
}
