
import { useState, useEffect } from 'react';

export function useDarkMode(): [string, () => void] {
    const [theme, setTheme] = useState<string>(localStorage.getItem('theme') || 'light');

    const toggleTheme = () => {
        setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
    };

    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove(theme === 'light' ? 'dark' : 'light');
        root.classList.add(theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    return [theme, toggleTheme];
}
