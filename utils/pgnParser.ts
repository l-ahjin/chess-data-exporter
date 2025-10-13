
import { ChessComGame, GameResult } from '../types';

export function getResultFromPgn(pgn: string): string | null {
    const resultMatch = pgn.match(/\[Result "(.*)"\]/);
    return resultMatch ? resultMatch[1] : null;
}

export function determineUserResult(game: ChessComGame, username: string): { userResult: GameResult, userColor: 'white' | 'black' | 'none' } {
    const pgnResult = getResultFromPgn(game.pgn);
    const userIsWhite = game.white.username.toLowerCase() === username.toLowerCase();
    const userIsBlack = game.black.username.toLowerCase() === username.toLowerCase();

    if (!pgnResult) return { userResult: 'unknown', userColor: 'none' };

    let userResult: GameResult = 'unknown';
    let userColor: 'white' | 'black' | 'none' = 'none';

    if (userIsWhite) {
        userColor = 'white';
        if (pgnResult === '1-0') userResult = 'win';
        else if (pgnResult === '0-1') userResult = 'loss';
        else if (pgnResult === '1/2-1/2') userResult = 'draw';
    } else if (userIsBlack) {
        userColor = 'black';
        if (pgnResult === '1-0') userResult = 'loss';
        else if (pgnResult === '0-1') userResult = 'win';
        else if (pgnResult === '1/2-1/2') userResult = 'draw';
    }

    return { userResult, userColor };
}
