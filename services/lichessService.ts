// services/lichessService.ts
import { LichessUser, LichessGame, ProcessedGame } from '../types';

const BASE_URL = 'https://lichess.org/api';

export async function getLichessUser(username: string): Promise<LichessUser> {
    const response = await fetch(`${BASE_URL}/user/${username}`);
    if (!response.ok) {
        throw new Error('Failed to fetch Lichess user');
    }
    return response.json();
}

export function generateMonthlyArchives(createdAt: number): string[] {
    const archives: string[] = [];
    const startDate = new Date(createdAt);
    const today = new Date();

    // Start from the creation month
    let current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const end = new Date(today.getFullYear(), today.getMonth(), 1);

    while (current <= end) {
        const year = current.getFullYear();
        const month = String(current.getMonth() + 1).padStart(2, '0');
        archives.push(`${year}/${month}`);
        current.setMonth(current.getMonth() + 1);
    }

    return archives.reverse(); // Most recent first
}

export async function getLichessGamesForMonth(username: string, yearMonth: string): Promise<ProcessedGame[]> {
    const [year, month] = yearMonth.split('/');

    // Calculate since (first day of month at 00:00:00)
    const since = new Date(parseInt(year), parseInt(month) - 1, 1, 0, 0, 0).getTime();

    // Calculate until (last day of month at 23:59:59)
    const until = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59).getTime();

    const url = `${BASE_URL}/games/user/${username}?since=${since}&until=${until}&pgnInJson=true`;

    const response = await fetch(url, {
        headers: {
            'Accept': 'application/x-ndjson'
        }
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch Lichess games: ${response.statusText}`);
    }

    const text = await response.text();
    const games: ProcessedGame[] = [];

    // Parse ND-JSON (each line is a separate JSON object)
    const lines = text.trim().split('\n');

    for (const line of lines) {
        if (!line.trim()) continue;

        try {
            const game: LichessGame = JSON.parse(line);

            // Map to ProcessedGame format
            const timeControl = game.clock.increment > 0
                ? `${game.clock.initial}+${game.clock.increment}`
                : `${game.clock.initial}`;

            const processedGame: ProcessedGame = {
                id: game.id,
                url: `https://lichess.org/${game.id}`,
                pgn: game.pgn,
                time_control: timeControl,
                time_class: game.speed,
                rated: game.rated,
                white: {
                    rating: game.players.white.rating + (game.players.white.ratingDiff || 0),
                    username: game.players.white.user.name,
                    ratingDiff: game.players.white.ratingDiff || null
                },
                black: {
                    rating: game.players.black.rating + (game.players.black.ratingDiff || 0),
                    username: game.players.black.user.name,
                    ratingDiff: game.players.black.ratingDiff || null
                },
                userResult: 'unknown', // Will be determined by pgnParser
                userColor: 'none', // Will be determined by pgnParser
                endTime: Math.floor(game.lastMoveAt / 1000) // Convert to seconds
            };

            games.push(processedGame);
        } catch (error) {
            console.error('Failed to parse game line:', error);
        }
    }

    return games; // Most recent first
}