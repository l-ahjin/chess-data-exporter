
import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ImportPage from './pages/ImportPage';
import StatsPage from './pages/StatsPage';
import SettingsPage from './pages/SettingsPage';
import Header from './components/Header';
import { SettingsProvider } from './contexts/SettingsContext';

const App: React.FC = () => {
    return (
        <SettingsProvider>
            <HashRouter>
                <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300">
                    <Header />
                    <main className="p-4 sm:p-6 md:p-8">
                        <Routes>
                            <Route path="/" element={<HomePage />} />
                            <Route path="/import" element={<ImportPage />} />
                            <Route path="/stats" element={<StatsPage />} />
                            <Route path="/settings" element={<SettingsPage />} />
                        </Routes>
                    </main>
                </div>
            </HashRouter>
        </SettingsProvider>
    );
};

export default App;
