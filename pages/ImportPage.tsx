import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { useSettings } from '../contexts/SettingsContext';
import { getPlayerArchives, getGamesFromArchive } from '../services/chesscomService';
import { exportGamesToNotion, checkDuplicateGames } from '../services/notionService';
import { determineUserResult } from '../utils/pgnParser';
import { ChessComGame, ProcessedGame } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import { ICONS } from '../constants';

const formatTimeControl = (timeControl: string): string => {
    if (timeControl.includes('+')) {
        const [base, increment] = timeControl.split('+');
        const minutes = Math.floor(parseInt(base, 10) / 60);
        return `${minutes}|${increment}`;
    }
    const minutes = Math.floor(parseInt(timeControl, 10) / 60);
    return `${minutes}`;
};

const GameResultRibbon: React.FC<{ result: ProcessedGame['userResult'] }> = ({ result }) => {
    const color = result === 'win' ? 'bg-green-500' : result === 'loss' ? 'bg-red-500' : 'bg-gray-500';
    return <div className={`w-2 h-full absolute left-0 top-0 ${color}`}></div>;
};

const GameListItem: React.FC<{ game: ProcessedGame; isSelected: boolean; isDuplicate: boolean; onToggleSelect: (game: ProcessedGame) => void; }> = ({ game, isSelected, isDuplicate, onToggleSelect }) => {
    const { white, black, time_class, time_control, rated, url } = game;
    const date = new Date(game.endTime * 1000).toLocaleDateString();

    return (
        <div
            onClick={() => !isDuplicate && onToggleSelect(game)}
            className={`relative flex items-center p-4 border rounded-lg transition-all duration-200 ${isDuplicate ? 'cursor-not-allowed opacity-60 bg-red-50 dark:bg-red-900/20 border-red-500' : 'cursor-pointer'} ${isSelected ? 'bg-blue-50 dark:bg-blue-900/50 border-blue-500' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
        >
            <GameResultRibbon result={game.userResult} />
            {isDuplicate && (
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
                    Duplicate
                </div>
            )}
            <div className="pl-4 grid grid-cols-2 sm:grid-cols-4 gap-4 flex-grow text-sm w-full">
                <div className="flex flex-col">
                    <span className="font-semibold text-gray-800 dark:text-gray-200">{time_class}</span>
                    <span className="text-gray-500 dark:text-gray-400">{formatTimeControl(time_control)}</span>
                </div>
                <div className="flex flex-col space-y-1">
                    <div className="flex items-center text-gray-800 dark:text-gray-200">
                        <div className="w-3 h-3 rounded-full border border-gray-400 bg-white mr-2 flex-shrink-0"></div>
                        <span>{white.username} ({white.rating})</span>
                    </div>
                    <div className="flex items-center text-gray-800 dark:text-gray-200">
                        <div className="w-3 h-3 rounded-full border border-gray-400 bg-gray-700 mr-2 flex-shrink-0"></div>
                        <span>{black.username} ({black.rating})</span>
                    </div>
                </div>
                <div className="flex flex-col">
                    <span className={`font-semibold ${rated ? 'text-orange-600 dark:text-orange-400' : 'text-yellow-700 dark:text-yellow-500'}`}>{rated ? "Rated" : "Casual"}</span>
                    <span className="text-gray-500 dark:text-gray-400">{date}</span>
                </div>
                <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-blue-500 hover:opacity-80 transition-opacity self-center justify-self-start sm:justify-self-end"
                >
                    {ICONS.EXTERNAL_LINK}
                </a>
            </div>
        </div>
    );
};

const SortableItem: React.FC<{ game: ProcessedGame; isDuplicate: boolean; onRemove: (id: string) => void; }> = ({ game, isDuplicate, onRemove }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: game.id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} className={`flex items-center justify-between p-2 rounded-md mb-2 ${isDuplicate ? 'bg-red-100 dark:bg-red-900/30' : 'bg-gray-100 dark:bg-gray-700'}`}>
            <div className="flex items-center">
                {!isDuplicate && <button {...attributes} {...listeners} className="cursor-grab p-1 text-gray-500 dark:text-gray-400">{ICONS.GRIP}</button>}
                <span className={`ml-2 text-sm ${isDuplicate ? 'text-red-700 dark:text-red-400' : 'text-gray-800 dark:text-gray-200'}`}>{game.white.username} vs {game.black.username} {isDuplicate ? '(Duplicate)' : ''}</span>
            </div>
            <button onClick={() => onRemove(game.id)} className="p-1 text-red-500 hover:text-red-700">{ICONS.TRASH}</button>
        </div>
    );
};

const Pagination: React.FC<{ currentPage: number; totalPages: number; onPageChange: (page: number) => void; }> = ({ currentPage, totalPages, onPageChange }) => {
    if (totalPages <= 1) return null;
    return (
        <div className="flex justify-center items-center space-x-2 mt-4">
            <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} className="p-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600">{ICONS.CHEVRON_LEFT}</button>
            <span className="text-gray-700 dark:text-gray-300">Page {currentPage} of {totalPages}</span>
            <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} className="p-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600">{ICONS.CHEVRON_RIGHT}</button>
        </div>
    );
};

const PasswordModal: React.FC<{ isOpen: boolean; onConfirm: () => void; onCancel: () => void; }> = ({ isOpen, onConfirm, onCancel }) => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = () => {
        fetch('/api/password', {
            method: 'POST',
            body: JSON.stringify({"password": password}),
        }).then(res => res.json())
            .then(data => {
                if (data.isConfirmed) {
                    onConfirm();
                    setPassword('');
                    setError('');
                } else {
                    setError('Incorrect password.');
                    setPassword('');
                }
            }).catch(error => {
            setError('Incorrect password.');
            setPassword('');
        })
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSubmit();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-96">
                <h2 className="text-xl font-bold mb-4 dark:text-white">Confirm Password</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-4">Enter your password to continue.</p>

                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Enter password"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                />

                {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

                <div className="flex gap-2">
                    <button
                        onClick={onCancel}
                        className="flex-1 px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-white rounded-md hover:bg-gray-400 dark:hover:bg-gray-500"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                        Confirm
                    </button>
                </div>
            </div>
        </div>
    );
};

const ImportPage: React.FC = () => {
    const { settings } = useSettings();
    const [archives, setArchives] = useState<string[]>([]);
    const [games, setGames] = useState<ProcessedGame[]>([]);
    const [selectedGames, setSelectedGames] = useState<ProcessedGame[]>([]);
    const [duplicateUrls, setDuplicateUrls] = useState<Set<string>>(new Set());
    const [selectedArchive, setSelectedArchive] = useState<string | null>(null);
    const [loading, setLoading] = useState({ archives: false, games: false, importing: false, checking: false });
    const [error, setError] = useState<string | null>(null);
    const [importStatus, setImportStatus] = useState<{ message: string; success: boolean | null }>({ message: '', success: null });
    const [showPasswordModal, setShowPasswordModal] = useState(false);

    const [archivePage, setArchivePage] = useState(1);
    const [gamesPage, setGamesPage] = useState(1);
    const archivesPerPage = 10;
    const gamesPerPage = 10;

    const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

    useEffect(() => {
        if (settings.chessComUsername) {
            setLoading(prev => ({ ...prev, archives: true }));
            getPlayerArchives(settings.chessComUsername)
                .then(data => setArchives(data.archives.slice().reverse()))
                .catch(() => setError("Failed to fetch archives. Check username in settings."))
                .finally(() => setLoading(prev => ({ ...prev, archives: false })));
        }
    }, [settings.chessComUsername]);

    const fetchGames = useCallback((archiveUrl: string) => {
        setSelectedArchive(archiveUrl);
        setGames([]);
        setLoading(prev => ({ ...prev, games: true }));
        setGamesPage(1);
        getGamesFromArchive(archiveUrl)
            .then(data => {
                const processed = data.games.map((game: ChessComGame) => {
                    const { userResult, userColor } = determineUserResult(game, settings.chessComUsername);
                    return {
                        id: game.url,
                        ...game,
                        userResult,
                        userColor,
                        endTime: game.end_time,
                    };
                }).reverse();
                setGames(processed);
            })
            .catch(() => setError("Failed to fetch games for this period."))
            .finally(() => setLoading(prev => ({ ...prev, games: false })));
    }, [settings.chessComUsername]);

    const handleToggleSelect = (game: ProcessedGame) => {
        if (duplicateUrls.has(game.url)) return;
        setSelectedGames(prev =>
            prev.find(g => g.id === game.id)
                ? prev.filter(g => g.id !== game.id)
                : [...prev, game]
        );
    };

    const handleImportClick = () => {
        setShowPasswordModal(true);
    };

    const handlePasswordConfirm = async () => {
        setShowPasswordModal(false);
        await checkForDuplicates();
    };

    const handlePasswordCancel = () => {
        setShowPasswordModal(false);
    };

    const checkForDuplicates = async () => {
        setLoading(prev => ({ ...prev, checking: true }));
        setImportStatus({ message: 'Checking for duplicates...', success: null });

        const { notionDatabaseId } = settings;
        if (!notionDatabaseId) {
            const errorMsg = "Notion Database ID not set in settings.";
            setImportStatus({ message: errorMsg, success: false });
            setLoading(prev => ({ ...prev, checking: false }));
            setError(errorMsg);
            return;
        }

        const result = await checkDuplicateGames(selectedGames, notionDatabaseId);

        if (!result.success) {
            setImportStatus({ message: result.message, success: false });
            setLoading(prev => ({ ...prev, checking: false }));
            setError(result.message);
            return;
        }

        const duplicates = new Set(result.duplicateUrls || []);
        setDuplicateUrls(duplicates);

        if (duplicates.size > 0) {
            setImportStatus({
                message: `Found ${duplicates.size} duplicate game(s). Please remove duplicates and try again.`,
                success: false
            });
            setLoading(prev => ({ ...prev, checking: false }));
            return;
        }

        setLoading(prev => ({ ...prev, checking: false }));
        await performImport();
    };

    const performImport = async () => {
        setLoading(prev => ({ ...prev, importing: true }));
        setImportStatus({ message: 'Importing games...', success: null });

        const { notionDatabaseId } = settings;
        const nonDuplicateGames = selectedGames.filter(g => !duplicateUrls.has(g.url));

        if (nonDuplicateGames.length === 0) {
            const errorMsg = "No non-duplicate games to import.";
            setImportStatus({ message: errorMsg, success: false });
            setLoading(prev => ({ ...prev, importing: false }));
            return;
        }

        const result = await exportGamesToNotion(nonDuplicateGames, notionDatabaseId);

        setImportStatus({ message: result.message, success: result.success });
        setLoading(prev => ({ ...prev, importing: false }));
        if (result.success) {
            setSelectedGames([]);
            setDuplicateUrls(new Set());
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (active.id !== over?.id) {
            setSelectedGames((items) => {
                const oldIndex = items.findIndex(item => item.id === active.id);
                const newIndex = items.findIndex(item => item.id === over?.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const removeSelectedGame = (id: string) => {
        setSelectedGames(prev => {
            const updated = prev.filter(g => g.id !== id);

            // If the removed game was a duplicate, update duplicateUrls
            const removedGame = prev.find(g => g.id === id);
            if (removedGame && duplicateUrls.has(removedGame.url)) {
                const newDuplicates = new Set(duplicateUrls);
                newDuplicates.delete(removedGame.url);
                setDuplicateUrls(newDuplicates);

                // Clear import status if all duplicates are removed
                if (newDuplicates.size === 0) {
                    setImportStatus({ message: '', success: null });
                } else {
                    setImportStatus({
                        message: `Found ${newDuplicates.size} duplicate game(s). Please remove duplicates and try again.`,
                        success: false
                    });
                }
            }

            return updated;
        });
    };

    const paginatedArchives = useMemo(() => {
        const start = (archivePage - 1) * archivesPerPage;
        return archives.slice(start, start + archivesPerPage);
    }, [archives, archivePage]);

    const paginatedGames = useMemo(() => {
        const start = (gamesPage - 1) * gamesPerPage;
        return games.slice(start, start + gamesPerPage);
    }, [games, gamesPage]);

    const nonDuplicateCount = selectedGames.filter(g => !duplicateUrls.has(g.url)).length;

    if (!settings.chessComUsername) {
        return <div className="text-center p-8 bg-yellow-100 dark:bg-yellow-900/50 rounded-lg">Please set your Chess.com username in the settings page.</div>;
    }

    return (
        <div className="container mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <h2 className="text-2xl font-bold mb-4">Game Archives</h2>
                    {loading.archives ? <LoadingSpinner /> : (
                        <div>
                            <div className="flex flex-wrap gap-2">
                                {paginatedArchives.map(url => {
                                    const match = url.match(/(\d{4})\/(\d{2})$/);
                                    const label = match ? `${match[1]}/${match[2]}` : '...';
                                    return (
                                        <button key={url} onClick={() => fetchGames(url)} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${selectedArchive === url ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>{label}</button>
                                    );
                                })}
                            </div>
                            <Pagination currentPage={archivePage} totalPages={Math.ceil(archives.length / archivesPerPage)} onPageChange={setArchivePage} />
                        </div>
                    )}

                    <div className="mt-8">
                        <h2 className="text-2xl font-bold mb-4">Games</h2>
                        {loading.games ? <LoadingSpinner /> : (
                            <div className="space-y-3">
                                {paginatedGames.map(game => (
                                    <GameListItem key={game.id} game={game} isSelected={selectedGames.some(g => g.id === game.id)} isDuplicate={duplicateUrls.has(game.url)} onToggleSelect={handleToggleSelect} />
                                ))}
                            </div>
                        )}
                        <Pagination currentPage={gamesPage} totalPages={Math.ceil(games.length / gamesPerPage)} onPageChange={setGamesPage} />
                    </div>
                </div>

                <div className="lg:col-span-1">
                    <div className="sticky top-24 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                        <h2 className="text-xl font-bold mb-4">Selected Games ({selectedGames.length})</h2>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                            <div>Ready to import: <span className="font-bold text-blue-600 dark:text-blue-400">{nonDuplicateCount}</span></div>
                            {duplicateUrls.size > 0 && <div className="text-red-600 dark:text-red-400">Duplicates: <span className="font-bold">{duplicateUrls.size}</span></div>}
                        </div>
                        <div className="max-h-80 overflow-y-auto mb-4 pr-2">
                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                <SortableContext items={selectedGames.map(g => g.id)} strategy={verticalListSortingStrategy}>
                                    {selectedGames.map(game => <SortableItem key={game.id} game={game} isDuplicate={duplicateUrls.has(game.url)} onRemove={removeSelectedGame} />)}
                                </SortableContext>
                            </DndContext>
                        </div>
                        <button onClick={handleImportClick} disabled={selectedGames.length === 0 || loading.importing || loading.checking} className="w-full py-2 px-4 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed">
                            {loading.importing || loading.checking ? <LoadingSpinner /> : 'Import'}
                        </button>
                        {importStatus.message && (
                            <p className={`mt-2 text-sm text-center ${importStatus.success === false ? 'text-red-500' : importStatus.success === true ? 'text-green-500' : 'text-gray-500'}`}>{importStatus.message}</p>
                        )}
                    </div>
                </div>
            </div>
            {error && <div className="fixed bottom-4 right-4 bg-red-500 text-white p-4 rounded-lg shadow-lg" onClick={() => setError(null)}>{error}</div>}

            <PasswordModal
                isOpen={showPasswordModal}
                onConfirm={handlePasswordConfirm}
                onCancel={handlePasswordCancel}
            />
        </div>
    );
};

export default ImportPage;