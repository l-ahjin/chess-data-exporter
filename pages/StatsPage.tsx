import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useSettings } from '../contexts/SettingsContext';
import { getPlayerArchives, getGamesFromArchive } from '../services/chesscomService';
import { determineUserResult } from '../utils/pgnParser';
import { ChessComGame, ProcessedGame, GameResult } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';

interface Stats {
    wins: number;
    losses: number;
    draws: number;
    total: number;
}

const calculateStats = (games: ProcessedGame[]): Stats => {
    return games.reduce((acc, game) => {
        if (game.userResult === 'win') acc.wins++;
        else if (game.userResult === 'loss') acc.losses++;
        else if (game.userResult === 'draw') acc.draws++;
        acc.total++;
        return acc;
    }, { wins: 0, losses: 0, draws: 0, total: 0 });
};

const StatsCard: React.FC<{ title: string; stats: Stats }> = ({ title, stats }) => {
    const { wins, losses, draws, total } = stats;
    if (total === 0) {
        return (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-bold mb-4">{title}</h3>
                <p className="text-gray-500 dark:text-gray-400">No games to analyze.</p>
            </div>
        );
    }

    const data = [
        { name: 'Wins', value: wins },
        { name: 'Losses', value: losses },
        { name: 'Draws', value: draws },
    ];
    const COLORS = ['#10B981', '#EF4444', '#6B7280'];

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-bold mb-4">{title}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <div>
                    <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                            <Pie data={data} cx="50%" cy="50%" labelLine={false} outerRadius={80} fill="#8884d8" dataKey="value">
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="space-y-2 text-center md:text-left">
                    <p>Total Games: <span className="font-bold">{total}</span></p>
                    <p>Wins: <span className="font-bold text-green-500">{wins} ({(wins / total * 100).toFixed(1)}%)</span></p>
                    <p>Losses: <span className="font-bold text-red-500">{losses} ({(losses / total * 100).toFixed(1)}%)</span></p>
                    <p>Draws: <span className="font-bold text-gray-500">{draws} ({(draws / total * 100).toFixed(1)}%)</span></p>
                </div>
            </div>
        </div>
    );
};

const StatsPage: React.FC = () => {
    const { settings } = useSettings();
    const [allGames, setAllGames] = useState<ProcessedGame[]>([]);
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [filterRated, setFilterRated] = useState(false);

    const fetchAllGames = useCallback(async () => {
        if (!settings.chessComUsername) {
            setError("Chess.com username not set.");
            return;
        }
        setLoading(true);
        setProgress(0);
        setError(null);
        setAllGames([]);

        try {
            const { archives } = await getPlayerArchives(settings.chessComUsername);
            const totalArchives = archives.length;
            let fetchedGames: ProcessedGame[] = [];

            for (let i = 0; i < totalArchives; i++) {
                const archiveUrl = archives[i];
                const { games } = await getGamesFromArchive(archiveUrl);
                const processed = games.map((game: ChessComGame) => {
                    const { userResult, userColor } = determineUserResult(game, settings.chessComUsername);
                    return { id: game.url, ...game, userResult, userColor, endTime: game.end_time };
                });
                fetchedGames = [...fetchedGames, ...processed];
                setProgress(((i + 1) / totalArchives) * 100);
            }
            setAllGames(fetchedGames);
        } catch (e) {
            setError("Failed to fetch all game data. Please try again later.");
        } finally {
            setLoading(false);
        }
    }, [settings.chessComUsername]);

    useEffect(() => {
        fetchAllGames();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [settings.chessComUsername]);

    const filteredGames = useMemo(() => {
        return filterRated ? allGames.filter(game => game.rated) : allGames;
    }, [allGames, filterRated]);

    const overallStats = useMemo(() => calculateStats(filteredGames), [filteredGames]);
    const whiteStats = useMemo(() => calculateStats(filteredGames.filter(g => g.userColor === 'white')), [filteredGames]);
    const blackStats = useMemo(() => calculateStats(filteredGames.filter(g => g.userColor === 'black')), [filteredGames]);
    
    if (error) {
        return <div className="text-center p-8 bg-red-100 dark:bg-red-900/50 rounded-lg text-red-700 dark:text-red-300">{error}</div>;
    }

    return (
        <div className="container mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Statistics</h1>
                <div className="flex items-center space-x-3">
                    <label htmlFor="rated-toggle" className="text-sm font-medium text-gray-700 dark:text-gray-300">Rated Only</label>
                    <button
                        onClick={() => setFilterRated(!filterRated)}
                        className={`${filterRated ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'} relative inline-flex items-center h-6 rounded-full w-11 transition-colors`}
                        id="rated-toggle"
                    >
                        <span className={`${filterRated ? 'translate-x-6' : 'translate-x-1'} inline-block w-4 h-4 transform bg-white rounded-full transition-transform`} />
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="text-center">
                    <LoadingSpinner />
                    <p className="mt-4">Fetching all games, this may take a moment...</p>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mt-2 max-w-md mx-auto">
                        <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
                    </div>
                </div>
            ) : (
                <div className="space-y-8">
                    <StatsCard title="Overall Performance" stats={overallStats} />
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <StatsCard title="As White" stats={whiteStats} />
                        <StatsCard title="As Black" stats={blackStats} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default StatsPage;