
import { ChessComArchive, ChessComGame } from '../types';

const BASE_URL = 'https://api.chess.com/pub/player';

export async function getPlayerArchives(username: string): Promise<ChessComArchive> {
    const response = await fetch(`${BASE_URL}/${username}/games/archives`);
    if (!response.ok) {
        throw new Error('Failed to fetch player archives');
    }
    return response.json();
}

export async function getGamesFromArchive(archiveUrl: string): Promise<{ games: ChessComGame[] }> {
    const response = await fetch(archiveUrl);
    if (!response.ok) {
        throw new Error(`Failed to fetch games from ${archiveUrl}`);
    }
    return response.json();
}
