import React from 'react';
import { NavLink } from 'react-router-dom';
import { useDarkMode } from '../hooks/useDarkMode';
import { ICONS } from '../constants';

const Header: React.FC = () => {
    const [theme, toggleTheme] = useDarkMode();

    const navLinkClass = ({ isActive }: { isActive: boolean }) =>
        `p-2 rounded-full transition-colors ${
            isActive 
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100' 
                : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100'
        }`;

    return (
        <header className="p-4 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
            <NavLink to="/" className="transition-opacity hover:opacity-80">
                <h1 className="text-xl font-bold text-gray-800 dark:text-gray-200">Chess Data Exporter</h1>
            </NavLink>
            <nav className="flex items-center space-x-2">
                <NavLink to="/" className={navLinkClass}>
                    {ICONS.HOME}
                </NavLink>
                <button onClick={toggleTheme} className="p-2 rounded-full text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
                    {theme === 'light' ? ICONS.MOON : ICONS.SUN}
                </button>
                <NavLink to="/settings" className={navLinkClass}>
                   {ICONS.SETTINGS}
                </NavLink>
            </nav>
        </header>
    );
};

export default Header;