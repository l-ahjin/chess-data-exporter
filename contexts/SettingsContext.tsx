import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';

interface Settings {
    chessComUsername: string;
    lichessUsername: string;
    notionWorkspaceId: string;
    notionDatabaseId: string;
}

interface SettingsContextType {
    settings: Settings;
    saveSettings: (newSettings: Partial<Settings>) => void;
    isLoading: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [settings, setSettings] = useState<Settings>({
        chessComUsername: '',
        lichessUsername: '',
        notionWorkspaceId: '',
        notionDatabaseId: '',
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        try {
            const chessComUsername = localStorage.getItem('chess.com_username') || '';
            const lichessUsername = localStorage.getItem('lichess_username') || '';
            const notionWorkspaceId = localStorage.getItem('notion_workspace_id') || '';
            const notionDatabaseId = localStorage.getItem('notion_database_id') || '';
            setSettings({ chessComUsername, lichessUsername, notionWorkspaceId, notionDatabaseId });
        } catch (error) {
            console.error("Failed to load settings from localStorage", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const saveSettings = useCallback((newSettings: Partial<Settings>) => {
        setSettings(prevSettings => {
            const updatedSettings = { ...prevSettings, ...newSettings };
            if (newSettings.chessComUsername !== undefined) {
                localStorage.setItem('chess.com_username', newSettings.chessComUsername);
            }
            if (newSettings.lichessUsername !== undefined) {
                localStorage.setItem('lichess_username', newSettings.lichessUsername);
            }
            if (newSettings.notionWorkspaceId !== undefined) {
                localStorage.setItem('notion_workspace_id', newSettings.notionWorkspaceId);
            }
             if (newSettings.notionDatabaseId !== undefined) {
                localStorage.setItem('notion_database_id', newSettings.notionDatabaseId);
            }
            return updatedSettings;
        });
    }, []);

    return (
        <SettingsContext.Provider value={{ settings, saveSettings, isLoading }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = (): SettingsContextType => {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};