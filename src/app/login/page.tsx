'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const router = useRouter();
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({ username: '', password: '', name: '', workspaceName: 'My Family' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';

        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
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
                        {isLogin ? 'Welcome Back' : 'Create Account'}
                    </h1>
                    <p style={{ color: '#94a3b8', fontSize: '0.95rem', fontWeight: 500 }}>
                        {isLogin ? 'Đăng nhập để quản lý chi tiêu' : 'Đăng ký thành viên mới'}
                    </p>
                </div>

                {error && <div style={{ background: '#fef2f2', color: '#ef4444', padding: '0.75rem', borderRadius: '0.75rem', marginBottom: '1.5rem', textAlign: 'center', fontSize: '0.9rem', border: '1px solid #fee2e2' }}>{error}</div>}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {!isLogin && (
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 600, color: '#475569', marginLeft: '4px' }}>Tên hiển thị (Tên thật)</label>
                            <input
                                required
                                type="text"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '2px solid #e2e8f0', outline: 'none', transition: 'all 0.2s', fontSize: '1rem' }}
                                onFocus={(e) => e.target.style.borderColor = '#818cf8'}
                                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                                placeholder="Ví dụ: Phong"
                            />
                        </div>
                    )}

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

                    <button
                        type="submit"
                        disabled={loading}
                        className="primary"
                        style={{
                            width: '100%', justifyContent: 'center', marginTop: '0.5rem', padding: '0.85rem', fontSize: '1rem', fontWeight: 700, borderRadius: '0.75rem',
                            background: 'linear-gradient(to right, #4f46e5, #7c3aed)', border: 'none', boxShadow: '0 4px 6px -1px rgb(79 70 229 / 0.2)'
                        }}
                    >
                        {loading ? 'Đang xử lý...' : (isLogin ? 'Đăng Nhập' : 'Tạo Tài Khoản')}
                    </button>
                </form>

                <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.9rem' }}>
                    <span style={{ color: '#94a3b8' }}>{isLogin ? 'Chưa có tài khoản? ' : 'Đã có tài khoản? '}</span>
                    <button
                        className="secondary"
                        style={{ padding: '0', border: 'none', background: 'none', color: '#6366f1', fontWeight: 600, cursor: 'pointer' }}
                        onClick={() => { setIsLogin(!isLogin); setError(''); }}
                    >
                        {isLogin ? 'Đăng ký ngay' : 'Đăng nhập'}
                    </button>
                </div>
            </div>
        </div>
    );
}
