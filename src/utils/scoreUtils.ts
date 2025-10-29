import { BoardState } from '../types/board';
import { WordInfo } from './boardUtils';
import { StickerState } from '../types/sticker';
import { isStickerActive } from './stickerUtils';

export interface ScoreBreakdown {
    baseTilePoints: number;  // Points from tiles only
    stickerPoints: number;   // Bonus points from point stickers
    baseTileMulti: number;   // Multiplier from tile count only
    stickerMulti: number;    // Bonus multiplier from multi stickers
    points: number;          // Total points (baseTilePoints + stickerPoints)
    multi: number;           // Total multi (baseTileMulti + stickerMulti)
    total: number;           // points × multi
}

export interface PlayScore {
    totalScore: number;
    breakdown: ScoreBreakdown;
}

/**
 * Calculate score for a single word using the formula: (sum of letter scores + sticker bonuses) × (word length + multi sticker bonuses)
 */
export function calculateWordScore(word: WordInfo, board: BoardState, stickers?: StickerState): number {
    let points = 0;
    let letterCount = 0;
    let stickerPoints = 0;
    let stickerMulti = 0;

    if (word.direction === 'horizontal') {
        // Calculate for horizontal word
        for (let col = word.position.col; col < word.position.col + word.word.length; col++) {
            const cell = board[word.position.row][col];
            if (cell.tile) {
                points += cell.tile.score;
                letterCount++;
                
                // Check for active stickers under this tile
                if (stickers && isStickerActive(stickers, { row: word.position.row, col })) {
                    const sticker = stickers[word.position.row][col];
                    if (sticker) {
                        if (sticker.type === 'multi') {
                            stickerMulti += sticker.value; // x2
                        } else if (sticker.type === 'points') {
                            stickerPoints += sticker.value; // +10
                        }
                    }
                }
            }
        }
    } else {
        // Calculate for vertical word
        for (let row = word.position.row; row < word.position.row + word.word.length; row++) {
            const cell = board[row][word.position.col];
            if (cell.tile) {
                points += cell.tile.score;
                letterCount++;
                
                // Check for active stickers under this tile
                if (stickers && isStickerActive(stickers, { row, col: word.position.col })) {
                    const sticker = stickers[row][word.position.col];
                    if (sticker) {
                        if (sticker.type === 'multi') {
                            stickerMulti += sticker.value; // x2
                        } else if (sticker.type === 'points') {
                            stickerPoints += sticker.value; // +10
                        }
                    }
                }
            }
        }
    }

    const totalPoints = points + stickerPoints;
    const totalMulti = letterCount + stickerMulti;
    
    return totalPoints * totalMulti;
}

/**
 * Calculate score breakdown for current (unlocked) words
 */
export function calculateCurrentPlayScore(board: BoardState, stickers?: StickerState): PlayScore {
    const words = findAllWords(board);
    const currentWords = words.filter(w => !w.isLocked);
    
    let totalScore = 0;
    let totalPoints = 0;
    let totalLetters = 0;
    let stickerPoints = 0;
    let stickerMulti = 0;

    for (const word of currentWords) {
        const wordScore = calculateWordScore(word, board, stickers);
        totalScore += wordScore;
        
        // Add to breakdown totals
        if (word.direction === 'horizontal') {
            for (let col = word.position.col; col < word.position.col + word.word.length; col++) {
                const cell = board[word.position.row][col];
                if (cell.tile) {
                    totalPoints += cell.tile.score;
                    totalLetters++;
                    
                    // Check for active stickers under this tile
                    if (stickers && isStickerActive(stickers, { row: word.position.row, col })) {
                        const sticker = stickers[word.position.row][col];
                        if (sticker) {
                            if (sticker.type === 'multi') {
                                stickerMulti += sticker.value; // x2
                            } else if (sticker.type === 'points') {
                                stickerPoints += sticker.value; // +10
                            }
                        }
                    }
                }
            }
        } else {
            for (let row = word.position.row; row < word.position.row + word.word.length; row++) {
                const cell = board[row][word.position.col];
                if (cell.tile) {
                    totalPoints += cell.tile.score;
                    totalLetters++;
                    
                    // Check for active stickers under this tile
                    if (stickers && isStickerActive(stickers, { row, col: word.position.col })) {
                        const sticker = stickers[row][word.position.col];
                        if (sticker) {
                            if (sticker.type === 'multi') {
                                stickerMulti += sticker.value; // x2
                            } else if (sticker.type === 'points') {
                                stickerPoints += sticker.value; // +10
                            }
                        }
                    }
                }
            }
        }
    }

    const finalPoints = totalPoints + stickerPoints;
    const finalMulti = totalLetters + stickerMulti;

    return {
        totalScore,
        breakdown: {
            baseTilePoints: totalPoints,
            stickerPoints: stickerPoints,
            baseTileMulti: totalLetters,
            stickerMulti: stickerMulti,
            points: finalPoints,
            multi: finalMulti,
            total: finalPoints * finalMulti
        }
    };
}

/**
 * Calculate cumulative score from all played (locked) words
 */
export function calculateTotalScore(board: BoardState, stickers?: StickerState): number {
    const words = findAllWords(board);
    const playedWords = words.filter(w => w.isLocked);
    
    let totalScore = 0;
    for (const word of playedWords) {
        totalScore += calculateWordScore(word, board, stickers);
    }

    return totalScore;
}

// Import the findAllWords function from boardUtils
import { findAllWords } from './boardUtils';
