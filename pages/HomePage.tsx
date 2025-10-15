import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ICONS } from '../constants';

const HomePage: React.FC = () => {
    const navigate = useNavigate();

    const NavButton: React.FC<{
        icon: React.ReactNode;
        title: string;
        subtitle?: string;
        onClick?: () => void;
        disabled?: boolean;
        comingSoon?: boolean;
    }> = ({ icon, title, subtitle, onClick, disabled, comingSoon }) => {
        const baseClasses = "relative group w-full h-48 sm:h-64 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-all duration-300 flex flex-col items-center justify-center text-center p-4";
        const interactiveClasses = "hover:shadow-xl hover:-translate-y-1 hover:border-blue-500 dark:hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 cursor-pointer";
        const disabledClasses = "opacity-60 cursor-not-allowed";

        return (
            <button
                onClick={onClick}
                disabled={disabled}
                className={`${baseClasses} ${!disabled ? interactiveClasses : disabledClasses}`}
            >
                {comingSoon && (
                    <div className="absolute top-4 right-4 bg-yellow-400 text-yellow-900 text-xs font-semibold px-3 py-1 rounded-full shadow-md">
                        Coming Soon
                    </div>
                )}
                <div className={`mb-4 text-gray-500 dark:text-gray-400 ${!disabled ? 'group-hover:text-blue-600 dark:group-hover:text-blue-400' : ''} transition-colors duration-300`}>
                    {icon}
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-200">{title}</h2>
                {subtitle && <p className="mt-2 text-gray-600 dark:text-gray-400">{subtitle}</p>}
            </button>
        );
    };

    return (
        <div className="container mx-auto max-w-5xl">
            <div className="text-center mb-12">
                <h1 className="text-4xl sm:text-5xl font-bold mb-4 text-gray-800 dark:text-gray-200">Welcome</h1>
                <p className="text-lg text-gray-600 dark:text-gray-400">Select a service to import your games or view your statistics.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <NavButton icon={ICONS.PAWN} title="Chess.com" onClick={() => navigate('/import?platform=chesscom')} />
                <NavButton icon={ICONS.KNIGHT} title="Lichess" onClick={() => navigate('/import?platform=lichess')} />
            </div>
            <div className="mt-8">
                <NavButton icon={ICONS.STATS_CHART} title="Statistics" subtitle="View your game stats" onClick={() => navigate('/stats')} />
            </div>
        </div>
    );
};

export default HomePage;