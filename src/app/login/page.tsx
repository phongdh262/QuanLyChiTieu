'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Turnstile } from '@marsidev/react-turnstile';

export default function LoginPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({ username: '', password: '' });
    const [captchaToken, setCaptchaToken] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: formData.username,
                    password: formData.password,
                    captchaToken
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed');

            // Success
            router.push('/');
            router.refresh();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #e0e7ff 0%, #f3e8ff 100%)' // Soft Indigo-Purple
        }}>
            <div className="card" style={{ width: '100%', maxWidth: '420px', padding: '3rem 2.5rem', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)', borderRadius: '1.5rem' }}>
                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                    <h1 style={{ fontSize: '2.25rem', fontWeight: 800, marginBottom: '0.5rem', background: 'linear-gradient(to right, #6366f1, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Welcome Back
                    </h1>
                    <p style={{ color: '#94a3b8', fontSize: '0.95rem', fontWeight: 500 }}>
                        Đăng nhập để quản lý chi tiêu
                    </p>
                </div>

                {error && <div style={{ background: '#fef2f2', color: '#ef4444', padding: '0.75rem', borderRadius: '0.75rem', marginBottom: '1.5rem', textAlign: 'center', fontSize: '0.9rem', border: '1px solid #fee2e2' }}>{error}</div>}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 600, color: '#475569', marginLeft: '4px' }}>Tên đăng nhập</label>
                        <input
                            required
                            type="text"
                            value={formData.username}
                            onChange={e => setFormData({ ...formData, username: e.target.value })}
                            style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '2px solid #e2e8f0', outline: 'none', transition: 'all 0.2s', fontSize: '1rem' }}
                            onFocus={(e) => e.target.style.borderColor = '#818cf8'}
                            onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                            placeholder="username"
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 600, color: '#475569', marginLeft: '4px' }}>Mật khẩu</label>
                        <input
                            required
                            type="password"
                            value={formData.password}
                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                            style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '2px solid #e2e8f0', outline: 'none', transition: 'all 0.2s', fontSize: '1rem' }}
                            onFocus={(e) => e.target.style.borderColor = '#818cf8'}
                            onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                            placeholder="••••••••"
                        />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <Turnstile
                            siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ""}
                            onSuccess={(token) => setCaptchaToken(token)}
                            options={{ theme: 'light', size: 'flexible' }}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="primary"
                        style={{
                            width: '100%', justifyContent: 'center', marginTop: '0.5rem', padding: '0.85rem', fontSize: '1rem', fontWeight: 700, borderRadius: '0.75rem',
                            background: 'linear-gradient(to right, #4f46e5, #7c3aed)', border: 'none', boxShadow: '0 4px 6px -1px rgb(79 70 229 / 0.2)'
                        }}
                    >
                        {loading ? 'Đang xử lý...' : 'Đăng Nhập'}
                    </button>
                </form>

                <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.9rem' }}>
                    <p style={{ color: '#94a3b8', fontStyle: 'italic' }}>ChiTieuApp - Quản lý tài chính cá nhân</p>
                </div>
            </div>
        </div>
    );
}
