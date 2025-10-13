import bcrypt from "bcrypt";

// Define types for Vercel's request and response objects for type safety.
interface ApiRequest {
    method?: string;
    body: {
        password: string;
    };
}

interface ApiResponse {
    setHeader(name: string, value: string | string[]): this;
    status(code: number): this;
    json(body: any): this;
    end(): void;
}

export default async function handler(
    req: ApiRequest,
    res: ApiResponse
): Promise<void | ApiResponse> {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ success: false, message: `Method ${req.method} Not Allowed` });
    }

    let body = req.body;

    if (typeof body === 'string') {
        body = JSON.parse(body);
    }

    const confirmPassword = {
        isConfirmed: bcrypt.compareSync(body.password, process.env.IMPORT_PASSWORD),
    }
    return res.status(200).json(confirmPassword);
}