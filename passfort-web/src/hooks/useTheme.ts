import { useState, useEffect } from 'react';

export type Theme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'passfort-theme';

const getSystemTheme = (): 'light' | 'dark' => {
    if (typeof window !== 'undefined' && window.matchMedia) {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
};

const getStoredTheme = (): Theme => {
    if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(STORAGE_KEY) as Theme;
        if (stored && ['light', 'dark', 'system'].includes(stored)) {
            return stored;
        }
    }
    return 'system';
};

const applyTheme = (theme: Theme) => {
    const root = document.documentElement;

    let effectiveTheme: 'light' | 'dark';

    if (theme === 'system') {
        effectiveTheme = getSystemTheme();
    } else {
        effectiveTheme = theme;
    }

    if (effectiveTheme === 'dark') {
        root.classList.add('dark');
    } else {
        root.classList.remove('dark');
    }
};

export const useTheme = () => {
    const [theme, setTheme] = useState<Theme>(getStoredTheme);

    // Apply theme on mount and when theme changes
    useEffect(() => {
        applyTheme(theme);
    }, [theme]);

    // Listen for system theme changes when using 'system' theme
    useEffect(() => {
        if (theme !== 'system') return;

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = () => {
            applyTheme('system');
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [theme]);

    const changeTheme = (newTheme: Theme) => {
        setTheme(newTheme);
        localStorage.setItem(STORAGE_KEY, newTheme);
        applyTheme(newTheme);
    };

    return {
        theme,
        changeTheme,
        isSystemDark: getSystemTheme() === 'dark'
    };
}; 