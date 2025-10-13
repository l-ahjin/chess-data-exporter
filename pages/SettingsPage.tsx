import React, { useState, useEffect } from 'react';
import { useSettings } from '../contexts/SettingsContext';

const SettingsPage: React.FC = () => {
    const { settings, saveSettings, isLoading } = useSettings();
    const [localSettings, setLocalSettings] = useState(settings);
    const [saved, setSaved] = useState(false);
    const [notionActive, setNotionActive] = useState<boolean | null>(null);

    useEffect(() => {
        if (!isLoading) {
            setLocalSettings(settings);

            fetch('/api/env')
                .then(res => res.json())
                .then(data => {
                    setNotionActive(data.notionApiKey);
                })
                .catch(error => {
                    setNotionActive(false);  // 호출 실패 시 false 처리
                });
        }
    }, [settings, isLoading]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setLocalSettings(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = () => {
        saveSettings(localSettings);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    if (isLoading) {
        return <div>Loading settings...</div>;
    }

    const inputClasses = "mt-2 p-2.5 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100";

    return (
        <div className="container mx-auto max-w-2xl">
            <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-gray-200">Settings</h1>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md space-y-6">
                <div>
                    <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-300">API Status</h2>
                    <div className="flex items-center space-x-3 p-4 bg-gray-100 dark:bg-gray-700 rounded-md">
                        <span className={`w-4 h-4 rounded-full ${notionActive? 'bg-green-500' : 'bg-red-500'}`}></span>
                        <span className="text-gray-800 dark:text-gray-200">Notion API</span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                            {notionActive ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                </div>

                <div>
                    <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-300">Usernames</h2>
                    <div className="space-y-4">
                        <label className="block">
                            <span className="text-gray-700 dark:text-gray-300">Chess.com Username</span>
                            <input
                                type="text"
                                name="chessComUsername"
                                value={localSettings.chessComUsername}
                                onChange={handleChange}
                                className={inputClasses}
                            />
                        </label>
                        <label className="block">
                            <span className="text-gray-700 dark:text-gray-300">Lichess Username</span>
                            <input
                                type="text"
                                name="lichessUsername"
                                value={localSettings.lichessUsername}
                                onChange={handleChange}
                                className={inputClasses}
                            />
                        </label>
                    </div>
                </div>

                <div>
                    <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-300">Notion Integration</h2>
                    <div className="space-y-4">
                        <label className="block">
                            <span className="text-gray-700 dark:text-gray-300">Notion Database ID</span>
                            <input
                                type="text"
                                name="notionDatabaseId"
                                value={localSettings.notionDatabaseId}
                                onChange={handleChange}
                                className={inputClasses}
                            />
                        </label>
                    </div>
                </div>

                <div className="flex justify-end items-center pt-4">
                    {saved && <span className="text-green-600 dark:text-green-400 mr-4">Settings saved!</span>}
                    <button
                        onClick={handleSave}
                        className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 transition-colors"
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsPage;