export interface ChessComArchive {
    archives: string[];
}

export interface ChessComGame {
    url: string;
    pgn: string;
    time_control: string;
    end_time: number;
    rated: boolean;
    time_class: string;
    white: {
        rating: number;
        result: string;
        username: string;
    };
    black: {
        rating: number;
        result: string;
        username: string;
    };
}

export interface LichessUser {
    createdAt: number;
}

export interface LichessGame {
    id: string;
    rated: boolean;
    speed: string;
    pgn: string;
    clock: {
        initial: number;
        increment: number;
    };
    players: {
        white: {
            user: {
                name: string;
            };
            rating: number;
            ratingDiff: number;
        };
        black: {
            user: {
                name: string;
            };
            rating: number;
            ratingDiff: number;
        };
    };
    lastMoveAt: number;
}

export type GameResult = 'win' | 'loss' | 'draw' | 'unknown';

export interface ProcessedGame {
    id: string;
    url: string;
    pgn: string;
    time_control: string;
    time_class: string;
    rated: boolean;
    isGuest?: boolean;
    white: {
        rating: number;
        username: string;
        ratingDiff?: number | null;
    };
    black: {
        rating: number;
        username: string;
        ratingDiff?: number | null;
    };
    userResult: GameResult;
    userColor: 'white' | 'black' | 'none';
    endTime: number;
}