import React, { useState } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useSettings } from '../contexts/SettingsContext';
import { exportGamesToNotion, checkDuplicateGames } from '../services/notionService';
import { ProcessedGame } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import { ICONS } from '../constants';
import PasswordModal from "../modals/PasswordModal.tsx";

// PGN 파싱 유틸리티
const parsePGN = (pgn: string): Partial<ProcessedGame> | null => {
    try {
        const lines = pgn.trim().split('\n');
        const headers: Record<string, string> = {};

        // Parse headers
        for (const line of lines) {
            const match = line.match(/\[(\w+)\s+"(.*)"\]/);
            if (match) {
                headers[match[1]] = match[2];
            }
        }

        // Extract required information
        const whitePlayer = headers['White'] || 'unknown';
        const blackPlayer = headers['Black'] || 'unknown';
        const whiteElo = parseInt(headers['WhiteElo'] || '0');
        const blackElo = parseInt(headers['BlackElo'] || '0');
        const whiteRatingDiff = headers['WhiteRatingDiff'] ? parseInt(headers['WhiteRatingDiff']) : null;
        const blackRatingDiff = headers['BlackRatingDiff'] ? parseInt(headers['BlackRatingDiff']) : null;
        const date = headers['UTCDate'] || headers['Date'] || null;
        const timeControl = headers['TimeControl'] || 'unknown';
        const platform = headers['Site'].includes("Chess.com") ? 'Chess.com' : headers['Site'].includes("https://lichess.org") ? 'Lichess' : 'unknown';
        const url = platform === 'Chess.com' ? headers['Link'] : headers['Site'];
        const time = headers['EndTime'] || headers['UTCTime'] || null;
        const event = headers['Event'] || 'unknown';

        const getTimeControl = (tc: string): string => {
            const match = tc.match(/^(\d+)(\+\d+)?$/);
            if (match[2] === "+0") {
                return match[1];
            }
            return tc;
        }

        const getTimeClass = (tc: string): string => {
            const match = tc.match(/^(\d+)/);
            if (!match) return 'unknown';
            const seconds = parseInt(match[1]);
            if (seconds < 180) return 'bullet';
            if (seconds < 600) return 'blitz';
            if (seconds < 1800) return 'rapid';
            return 'classical';
        };

        const getEndTime = (date: string | null, time: string | null): number => {
            const now = new Date();

            const resolvedDate = date.replace(/\./g, '-') ?? now.toISOString().substring(0, 10); // YYYY-MM-DD
            const resolvedTime = time ?? now.toTimeString().substring(0, 8);

            const endTime = new Date(`${resolvedDate}T${resolvedTime}`).getTime();
            return Math.floor(endTime / 1000);
        };

        const isGuest = whitePlayer.startsWith('Guest') || blackPlayer.startsWith('Guest')
            || whitePlayer === 'Anonymous' || blackPlayer === 'Anonymous';

        return {
            id: url,
            url: url,
            pgn: pgn,
            time_control: timeControl !== "unknown" ? getTimeControl(timeControl) : timeControl,
            time_class: getTimeClass(timeControl),
            rated: event.toLowerCase().includes('rated'),
            isGuest: isGuest,
            white: {
                rating: whiteElo,
                username: whitePlayer,
                ratingDiff: whiteRatingDiff
            },
            black: {
                rating: blackElo,
                username: blackPlayer,
                ratingDiff: blackRatingDiff
            },
            userResult: 'unknown',
            userColor: 'none',
            endTime: getEndTime(date, time)
        };
    } catch (error) {
        console.error('Failed to parse PGN:', error);
        return null;
    }
};

const splitMultiplePGNs = (text: string): string[] => {
    // Split by empty line followed by [Event
    return text.split(/\n\n(?=\[Event)/).filter(pgn => pgn.trim().length > 0);
};

const SortableItem: React.FC<{
    game: ProcessedGame;
    isDuplicate: boolean;
    onRemove: (id: string) => void;
    onColorChange: (id: string, color: 'white' | 'black') => void;
    onGameTypeChange: (id: string, rated: boolean, isGuest?: boolean) => void;
}> = ({ game, isDuplicate, onRemove, onColorChange, onGameTypeChange }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: game.id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} className={`flex flex-col p-3 rounded-md mb-2 ${isDuplicate ? 'bg-red-100 dark:bg-red-900/30' : 'bg-gray-100 dark:bg-gray-700'}`}>
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center flex-1 min-w-0">
                    {!isDuplicate && (
                        <button {...attributes} {...listeners} className="cursor-grab p-1 text-gray-500 dark:text-gray-400 flex-shrink-0">
                            {ICONS.GRIP}
                        </button>
                    )}
                    <div className="ml-2 flex-1 min-w-0">
                        <div className={`text-sm truncate font-medium ${isDuplicate ? 'text-red-700 dark:text-red-400' : 'text-gray-800 dark:text-gray-200'}`}>
                            {game.white.username} vs {game.black.username}
                        </div>
                    </div>
                </div>
                <button onClick={() => onRemove(game.id)} className="p-1 text-red-500 hover:text-red-700 flex-shrink-0 ml-2">
                    {ICONS.TRASH}
                </button>
            </div>

            <div className="flex flex-col gap-2 pl-8">
                {/* Color Selection */}
                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 dark:text-gray-400 w-16">Color:</span>
                    <div className="flex gap-2">
                        <button
                            onClick={() => onColorChange(game.id, 'white')}
                            className={`text-xs px-3 py-1 rounded transition-colors ${
                                game.userColor === 'white'
                                    ? 'bg-blue-500 text-white shadow-md'
                                    : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                            }`}
                        >
                            White
                        </button>
                        <button
                            onClick={() => onColorChange(game.id, 'black')}
                            className={`text-xs px-3 py-1 rounded transition-colors ${
                                game.userColor === 'black'
                                    ? 'bg-blue-500 text-white shadow-md'
                                    : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                            }`}
                        >
                            Black
                        </button>
                    </div>
                </div>

                {/* Game Type Selection */}
                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 dark:text-gray-400 w-16">Type:</span>
                    <div className="flex gap-2">
                        <button
                            onClick={() => onGameTypeChange(game.id, true, undefined)}
                            className={`text-xs px-3 py-1 rounded transition-colors ${
                                game.rated && !game.isGuest
                                    ? 'bg-orange-500 text-white shadow-md'
                                    : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                            }`}
                        >
                            Rated
                        </button>
                        <button
                            onClick={() => onGameTypeChange(game.id, false, undefined)}
                            className={`text-xs px-3 py-1 rounded transition-colors ${
                                !game.rated && !game.isGuest
                                    ? 'bg-yellow-500 text-white shadow-md'
                                    : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                            }`}
                        >
                            Casual
                        </button>
                        <button
                            onClick={() => onGameTypeChange(game.id, false, true)}
                            className={`text-xs px-3 py-1 rounded transition-colors ${
                                game.isGuest
                                    ? 'bg-purple-500 text-white shadow-md'
                                    : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                            }`}
                        >
                            Guest
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const PGNImportPage: React.FC = () => {
    const { settings } = useSettings();
    const [pgnText, setPgnText] = useState('');
    const [selectedGames, setSelectedGames] = useState<ProcessedGame[]>([]);
    const [duplicateUrls, setDuplicateUrls] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState({ importing: false, checking: false, parsing: false });
    const [error, setError] = useState<string | null>(null);
    const [importStatus, setImportStatus] = useState<{ message: string; success: boolean | null }>({ message: '', success: null });
    const [showPasswordModal, setShowPasswordModal] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleParsePGN = () => {
        if (!pgnText.trim()) {
            setError('Please enter PGN text.');
            return;
        }

        setLoading(prev => ({ ...prev, parsing: true }));
        setError(null);

        try {
            const pgns = splitMultiplePGNs(pgnText);
            const parsed: ProcessedGame[] = [];
            const duplicatePGNs: string[] = [];

            for (const pgn of pgns) {
                const game = parsePGN(pgn);
                if (game) {
                    const isDuplicate = selectedGames.some(g => g.url === game.url);
                    if (isDuplicate) {
                        duplicatePGNs.push(pgn);
                    } else {
                        parsed.push(game as ProcessedGame);
                    }
                }
            }

            if (parsed.length > 0) {
                setSelectedGames(prev => [...prev, ...parsed]);
                setImportStatus({ message: `Successfully parsed ${parsed.length} game(s).`, success: true });
            }

            if (duplicatePGNs.length > 0) {
                setError(`${duplicatePGNs.length} duplicate game(s) found. They remain in the text box.`);
                setPgnText(duplicatePGNs.join('\n\n'));
            } else {
                setPgnText('');
            }
        } catch (err) {
            setError('Failed to parse PGN. Please check the format.');
        } finally {
            setLoading(prev => ({ ...prev, parsing: false }));
        }
    };

    const handleImportClick = () => {
        // Check if all games have colors assigned
        const missingColor = selectedGames.some(g => g.userColor === 'none');
        if (missingColor) {
            setError('Please assign your color (White/Black) for all games.');
            return;
        }
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

        // Update userResult based on selected color
        const gamesWithUpdatedResults = nonDuplicateGames.map(game => {
            const result = game.pgn.match(/\[Result "(.*)"\]/)?.[1];
            let userResult: ProcessedGame['userResult'] = 'unknown';

            if (result) {
                if (game.userColor === 'white') {
                    userResult = result === '1-0' ? 'win' : result === '0-1' ? 'loss' : result === '1/2-1/2' ? 'draw' : 'unknown';
                } else if (game.userColor === 'black') {
                    userResult = result === '0-1' ? 'win' : result === '1-0' ? 'loss' : result === '1/2-1/2' ? 'draw' : 'unknown';
                }
            }

            return { ...game, userResult };
        });

        if (gamesWithUpdatedResults.length === 0) {
            const errorMsg = "No non-duplicate games to import.";
            setImportStatus({ message: errorMsg, success: false });
            setLoading(prev => ({ ...prev, importing: false }));
            return;
        }

        const result = await exportGamesToNotion(gamesWithUpdatedResults, notionDatabaseId);

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
            const removedGame = prev.find(g => g.id === id);

            if (removedGame && duplicateUrls.has(removedGame.url)) {
                const newDuplicates = new Set(duplicateUrls);
                newDuplicates.delete(removedGame.url);
                setDuplicateUrls(newDuplicates);

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

    const handleColorChange = (id: string, color: 'white' | 'black') => {
        setSelectedGames(prev => prev.map(g => g.id === id ? { ...g, userColor: color } : g));
    };

    const handleGameTypeChange = (id: string, rated: boolean, isGuest?: boolean) => {
        setSelectedGames(prev => prev.map(g =>
            g.id === id ? { ...g, rated, isGuest } : g
        ));
    };

    const nonDuplicateCount = selectedGames.filter(g => !duplicateUrls.has(g.url)).length;

    return (
        <div className="container mx-auto max-w-6xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2 text-gray-800 dark:text-gray-200">Import from PGN</h1>
                <p className="text-gray-600 dark:text-gray-400">Paste your PGN text below. You can paste multiple games at once.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                        <label className="block text-lg font-semibold mb-2 text-gray-700 dark:text-gray-300">
                            PGN Text
                        </label>
                        <textarea
                            value={pgnText}
                            onChange={(e) => setPgnText(e.target.value)}
                            placeholder="[Event &quot;Casual Game&quot;]&#10;[Site &quot;https://lichess.org/abc123&quot;]&#10;[Date &quot;2024.01.01&quot;]&#10;[White &quot;Player1&quot;]&#10;[Black &quot;Player2&quot;]&#10;[Result &quot;1-0&quot;]&#10;[WhiteElo &quot;1500&quot;]&#10;[BlackElo &quot;1450&quot;]&#10;[TimeControl &quot;600+0&quot;]&#10;&#10;1. e4 e5 2. Nf3 Nc6 ..."
                            className="w-full h-64 p-3 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                            onClick={handleParsePGN}
                            disabled={loading.parsing || !pgnText.trim()}
                            className="mt-4 w-full py-2 px-4 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            {loading.parsing ? <LoadingSpinner /> : 'Parse PGN'}
                        </button>
                    </div>

                    <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">PGN Format Tips:</h3>
                        <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                            <li>• Include headers like [Event], [White], [Black], [Result]</li>
                            <li>• Multiple games can be separated by blank lines</li>
                            <li>• Select your color and game type for each game</li>
                            <li>• Supported formats: Chess.com, Lichess, and standard PGN</li>
                        </ul>
                    </div>
                </div>

                <div className="lg:col-span-1">
                    <div className="sticky top-24 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                        <h2 className="text-xl font-bold mb-4">Parsed Games ({selectedGames.length})</h2>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                            <div>Ready to import: <span className="font-bold text-blue-600 dark:text-blue-400">{nonDuplicateCount}</span></div>
                            {duplicateUrls.size > 0 && <div className="text-red-600 dark:text-red-400">Duplicates: <span className="font-bold">{duplicateUrls.size}</span></div>}
                        </div>
                        <div className="max-h-96 overflow-y-auto mb-4 pr-2">
                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                <SortableContext items={selectedGames.map(g => g.id)} strategy={verticalListSortingStrategy}>
                                    {selectedGames.map(game => (
                                        <SortableItem
                                            key={game.id}
                                            game={game}
                                            isDuplicate={duplicateUrls.has(game.url)}
                                            onRemove={removeSelectedGame}
                                            onColorChange={handleColorChange}
                                            onGameTypeChange={handleGameTypeChange}
                                        />
                                    ))}
                                </SortableContext>
                            </DndContext>
                        </div>
                        <button
                            onClick={handleImportClick}
                            disabled={selectedGames.length === 0 || loading.importing || loading.checking}
                            className="w-full py-2 px-4 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            {loading.importing || loading.checking ? <LoadingSpinner /> : 'Import'}
                        </button>
                        {importStatus.message && (
                            <p className={`mt-2 text-sm text-center ${importStatus.success === false ? 'text-red-500' : importStatus.success === true ? 'text-green-500' : 'text-gray-500'}`}>
                                {importStatus.message}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {error && (
                <div
                    className="fixed bottom-4 right-4 bg-red-500 text-white p-4 rounded-lg shadow-lg cursor-pointer"
                    onClick={() => setError(null)}
                >
                    {error}
                </div>
            )}

            <PasswordModal
                isOpen={showPasswordModal}
                onConfirm={handlePasswordConfirm}
                onCancel={handlePasswordCancel}
            />
        </div>
    );
};

export default PGNImportPage;