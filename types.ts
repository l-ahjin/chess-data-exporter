
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

export type GameResult = 'win' | 'loss' | 'draw' | 'unknown';

export interface ProcessedGame {
    id: string;
    url: string;
    pgn: string;
    time_control: string;
    time_class: string;
    rated: boolean;
    white: {
        rating: number;
        username: string;
    };
    black: {
        rating: number;
        username: string;
    };
    userResult: GameResult;
    userColor: 'white' | 'black' | 'none';
    endTime: number;
}
