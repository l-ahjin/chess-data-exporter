// This is a Vercel serverless function that acts as a proxy to the Notion API.
// It's converted to TypeScript for better type safety.

import { Client } from '@notionhq/client';
import type { ProcessedGame } from '../types';

// Define types for Vercel's request and response objects for type safety.
// In a real Vercel project, you might install `@vercel/node` for these types.
interface ApiRequest {
    method?: string;
    body: {
        games: ProcessedGame[];
        databaseId: string;
    };
}

interface ApiResponse {
    setHeader(name: string, value: string | string[]): this;
    status(code: number): this;
    json(body: any): this;
    end(): void;
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
    // Handle CORS preflight requests for browser clients
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ success: false, message: `Method ${req.method} Not Allowed` });
    }

    const { games, databaseId } = req.body;
    const apiKey = process.env.NOTION_API_KEY;

    if (!apiKey || !databaseId || !Array.isArray(games)) {
        return res.status(400).json({ success: false, message: "Missing required parameters. 'games' (array) and 'databaseId' are required." });
    }

    const notion = new Client({ auth: apiKey });

    // Verify connection to the database
    try {
        await notion.databases.retrieve({ database_id: databaseId });
    } catch (error) {
        console.error("Failed to connect to Notion Database:", error);
        return res.status(500).json({ success: false, message: error.message });
    }

    let importedCount = 0;
    const failedGames: string[] = [];

    for (const game of games) {
        try {

            // Define the structure for the Notion page properties
            const properties: Record<string, any> = {
                '매치업': {
                    type: 'title',
                    title: [
                        {
                            type: 'text',
                            text: { content: `⚪ ${game.white.username} 🆚 ⚫ ${game.black.username}` },
                        },
                    ],
                },
                '날짜': {
                    type: 'date',
                    date: {
                        start: new Date(game.endTime * 1000).toISOString(),
                    },
                },
                '플랫폼': {
                    type: 'select',
                    select: {
                        name: "Chess.com",
                    },
                },
                '유형': {
                    type: 'select',
                    select: {
                        name: game.rated ? '레이팅' : '캐주얼',
                    },
                },
                '색': {
                    type: 'select',
                    select: {
                        name: game.userColor,
                    },
                },
                '결과': {
                    type: 'select',
                    select: {
                        name: game.userResult === "win" ? '승리' : game.userResult === "loss" ? "패배" : "무승부",
                    },
                },
                '타임 컨트롤': {
                    type: 'select',
                    select: {
                        name: game.time_control,
                    },
                },
                '링크': {
                    type: 'url',
                    url: game.url,
                },
                '최종 레이팅': {
                    type: 'number',
                    number: game.userColor === 'white' ? game.white.rating : game.black.rating
                },
                '상대 최종 레이팅': {
                    type: 'number',
                    number: game.userColor === 'white' ? game.black.rating : game.white.rating
                },
            };

            await notion.pages.create({
                parent: { database_id: databaseId },
                properties: properties,
            });
            importedCount++;
        } catch (error) {
            console.error(`Failed to import game ${game.url} to Notion:`, error);
            failedGames.push(game.url);
        }
    }

    if (failedGames.length > 0) {
        return res.status(207).json({ success: false, message: `Import partially failed. ${importedCount} succeeded, ${failedGames.length} failed.` });
    }
    
    if (importedCount === 0 && games.length > 0) {
        return res.status(500).json({ success: false, message: 'All games failed to import. Check Notion database properties and permissions.' });
    }

    return res.status(200).json({ success: true, message: `Successfully imported ${importedCount} games to Notion!` });
}
