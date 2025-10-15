import { ProcessedGame } from '../types';

/**
 * Checks for duplicate games in the Notion database before exporting.
 * Queries the database and compares game URLs.
 */
export async function checkDuplicateGames(
    games: ProcessedGame[],
    databaseId: string
): Promise<{ success: boolean; message: string; duplicateUrls?: string[] }> {
    if (!databaseId) {
        return { success: false, message: "Notion Database ID is required." };
    }
    if (games.length === 0) {
        return { success: false, message: "No games to check." };
    }

    try {
        const response = await fetch('/api/notion-check-duplicates', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ games, databaseId }),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Failed to check duplicates.');
        }

        return result;
    } catch (error) {
        console.error("Failed to check duplicates:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return { success: false, message: errorMessage };
    }
}

/**
 * Exports a list of processed chess games to a specified Notion database via a serverless proxy.
 */
export async function exportGamesToNotion(
    games: ProcessedGame[],
    databaseId: string
): Promise<{ success: boolean; message: string }> {
    if (!databaseId) {
        return { success: false, message: "Notion Database ID is required. Please check settings." };
    }
    if (games.length === 0) {
        return { success: false, message: "No games selected to import." };
    }

    try {
        const response = await fetch('/api/notion-import-games', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ games, databaseId }),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'An unknown error occurred during the Notion import.');
        }

        return result;
    } catch (error) {
        console.error("Failed to export games to Notion via proxy:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return { success: false, message: errorMessage };
    }
}