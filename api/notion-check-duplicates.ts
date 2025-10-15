// api/notion-check-duplicates.ts
// This is a Vercel serverless function that checks for duplicate games in Notion database

import { Client } from '@notionhq/client';
import type { ProcessedGame } from '../types';

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
    // Handle CORS preflight requests
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
        return res.status(400).json({
            success: false,
            message: "Missing required parameters. 'games' (array) and 'databaseId' are required."
        });
    }

    const notion = new Client({ auth: apiKey });

    // Verify connection to the database
    try {
        await notion.databases.retrieve({ database_id: databaseId });
    } catch (error) {
        console.error("Failed to connect to Notion Database:", error);
        return res.status(500).json({ success: false, message: "Failed to connect to Notion database." });
    }

    try {
        // Query database to get all pages with '링크' property (or 'Link' depending on your setup)
        // We'll query the database and filter by property type 'Chess.com'
        const query = {
            database_id: databaseId,
            filter: {
                property: '플랫폼',
                select: {
                    equals: 'Chess.com'
                }
            }
        };

        const response = await notion.databases.query(query);

        // Extract existing URLs from the database
        const existingUrls = new Set<string>();

        for (const page of response.results) {
            const properties = page.properties as Record<string, any>;
            const linkProperty = properties['링크'];

            if (linkProperty && linkProperty.type === 'url' && linkProperty.url) {
                existingUrls.add(linkProperty.url);
            }
        }

        // Find duplicates by comparing game URLs with existing URLs
        const duplicateUrls: string[] = [];

        for (const game of games) {
            if (existingUrls.has(game.url)) {
                duplicateUrls.push(game.url);
            }
        }

        if (duplicateUrls.length > 0) {
            return res.status(200).json({
                success: true,
                message: `Found ${duplicateUrls.length} duplicate game(s).`,
                duplicateUrls
            });
        }

        return res.status(200).json({
            success: true,
            message: "No duplicates found.",
            duplicateUrls: []
        });

    } catch (error) {
        console.error("Error checking duplicates:", error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return res.status(500).json({ success: false, message: `Error checking duplicates: ${errorMessage}` });
    }
}