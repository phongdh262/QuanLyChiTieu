'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Turnstile } from '@marsidev/react-turnstile';
import { Globe, Moon, Sparkles, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/components/LanguageProvider';
import { useTheme } from '@/components/ThemeProvider';
import { cn } from '@/lib/utils';

export default function LoginPage() {
    const router = useRouter();
    const { t, language, setLanguage } = useLanguage();
    const { theme, toggleTheme } = useTheme();
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
            if (!res.ok) throw new Error(data.error || 'Failed to login');

            // Success
            router.push('/');
            router.refresh();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : t('error'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen overflow-hidden px-4 py-8 sm:py-12">
            <div className="pointer-events-none absolute inset-0 -z-10">
                <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-indigo-300/20 blur-3xl dark:bg-indigo-500/15" />
                <div className="absolute top-10 right-0 h-64 w-64 rounded-full bg-sky-200/30 blur-3xl dark:bg-sky-500/10" />
                <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-emerald-200/25 blur-3xl dark:bg-emerald-500/10" />
            </div>

            <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md items-center justify-center">
                <div className="w-full premium-card soft-shadow overflow-hidden border-none">
                    <div className="p-6 sm:p-8">
                        <div className="mb-6 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-lg shadow-indigo-500/25">
                                    <Sparkles className="h-4 w-4" />
                                </div>
                                <p className="text-sm font-black tracking-tight text-slate-800 dark:text-slate-100">
                                    ChiTieu<span className="text-indigo-600 dark:text-indigo-400">App</span>
                                </p>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setLanguage(language === 'vi' ? 'en' : 'vi')}
                                    className={cn(
                                        "inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition-colors",
                                        "border-slate-200 bg-white/80 text-slate-600 hover:bg-slate-50",
                                        "dark:border-white/[0.1] dark:bg-white/[0.04] dark:text-slate-200 dark:hover:bg-white/[0.08]"
                                    )}
                                    title="Switch language"
                                >
                                    <Globe className="h-3.5 w-3.5" />
                                    {language.toUpperCase()}
                                </button>

                                <button
                                    type="button"
                                    onClick={toggleTheme}
                                    className={cn(
                                        "inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors",
                                        "border-slate-200 bg-white/80 text-slate-600 hover:bg-slate-50",
                                        "dark:border-white/[0.1] dark:bg-white/[0.04] dark:text-slate-200 dark:hover:bg-white/[0.08]"
                                    )}
                                    title={theme === 'dark' ? t('lightMode') : t('darkMode')}
                                >
                                    {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        <div className="mb-7 text-center">
                            <h1 className="text-3xl font-black tracking-tight text-slate-800 dark:text-slate-100">
                                {t('loginWelcome')}
                            </h1>
                            <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
                                {t('loginSubtitle')}
                            </p>
                        </div>

                        {error && (
                            <div className="mb-5 rounded-xl border border-rose-200/70 bg-rose-50/90 p-3 text-sm font-medium text-rose-600 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-300">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <label className="ml-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                                    {t('loginUsername')}
                                </label>
                                <Input
                                    required
                                    type="text"
                                    value={formData.username}
                                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                                    className="h-11 rounded-xl border-slate-200 bg-white/70 px-4 dark:border-white/[0.1] dark:bg-white/[0.04]"
                                    placeholder={t('loginUsernamePlaceholder')}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="ml-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                                    {t('loginPassword')}
                                </label>
                                <Input
                                    required
                                    type="password"
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    className="h-11 rounded-xl border-slate-200 bg-white/70 px-4 dark:border-white/[0.1] dark:bg-white/[0.04]"
                                    placeholder={t('loginPasswordPlaceholder')}
                                />
                            </div>

                            <div className="flex min-h-[70px] items-center justify-center rounded-xl border border-slate-200/70 bg-white/50 px-2 py-2 dark:border-white/[0.08] dark:bg-white/[0.03]">
                                {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ? (
                                    <Turnstile
                                        siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
                                        onSuccess={(token) => setCaptchaToken(token)}
                                        options={{ theme: theme === 'dark' ? 'dark' : 'light', size: 'flexible' }}
                                    />
                                ) : (
                                    <div className="rounded-lg border border-rose-200/70 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-500 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-300">
                                        {t('loginMissingCaptcha')}
                                    </div>
                                )}
                            </div>

                            <Button
                                type="submit"
                                disabled={loading}
                                className="h-11 w-full rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 transition-all hover:from-indigo-500 hover:to-blue-500"
                            >
                                {loading ? t('loginSigningIn') : t('loginSignIn')}
                            </Button>
                        </form>
                    </div>

                    <div className="border-t border-slate-200/70 bg-slate-50/80 px-6 py-4 text-center dark:border-white/[0.06] dark:bg-white/[0.02]">
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            ChiTieuApp &copy; {new Date().getFullYear()} &bull; {t('loginFooter')}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
