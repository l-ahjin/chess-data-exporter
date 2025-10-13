// Define types for Vercel's request and response objects for type safety.
interface ApiRequest {
    method?: string;
}

interface ApiResponse {
    setHeader(name: string, value: string | string[]): this;
    status(code: number): this;
    json(body: any): this;
    end(): void;
}

interface ChessExportEnv {
    notionApiKey: boolean;
}

export default async function handler(
    req: ApiRequest,
    res: ApiResponse
) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).json({ success: false, message: `Method ${req.method} Not Allowed` });
    }

    const chessExportEnv: ChessExportEnv = {
        notionApiKey: !!process.env.NOTION_API_KEY,
    };

    return res.status(200).json(chessExportEnv);
}