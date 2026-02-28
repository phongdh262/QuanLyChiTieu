'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, dictionaries, DictKey } from '@/lib/i18n/dictionaries';

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: DictKey) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [language, setLanguageState] = useState<Language>('en'); // Default is English
    useEffect(() => {
        const stored = localStorage.getItem('language') as Language;
        if (stored === 'en' || stored === 'vi') {
            setLanguageState(stored);
        }
    }, []);

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        localStorage.setItem('language', lang);
    };

    const t = (key: DictKey): string => {
        return dictionaries[language][key] || dictionaries['en'][key] || key;
    };

    // To prevent hydration mismatch, we wait until mounted to render the provider's logic fully
    // But returning children directly could flash the default language. Given it's a context,
    // we provide the context value anyway.
    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}
