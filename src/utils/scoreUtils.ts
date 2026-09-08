import { BoardState } from '../types/board';
import { findAllWords } from './boardUtils';
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
 * Calculate score breakdown for current (unlocked) words
 */
export function calculateCurrentPlayScore(board: BoardState, stickers?: StickerState): PlayScore {
    const words = findAllWords(board);
    const currentWords = words.filter(w => !w.isLocked);
    
    let totalPoints = 0;
    let totalLetters = 0;
    let stickerPoints = 0;
    let stickerMulti = 0;
    let bingoAchieved = false; // true if any current word uses exactly 7 placed tiles

    for (const word of currentWords) {
        // Count placed (unlocked) tiles in this word; ignore locked tiles for bingo
        let placedCount = 0;

        // Add to breakdown totals
        if (word.direction === 'horizontal') {
            for (let col = word.position.col; col < word.position.col + word.word.length; col++) {
                const cell = board[word.position.row][col];
                if (cell.tile) {
                    totalPoints += cell.tile.score;
                    totalLetters++;
                    if (cell.canTake) {
                        placedCount++;
                    }
                    
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
                    if (cell.canTake) {
                        placedCount++;
                    }
                    
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

        if (placedCount === 7) {
            bingoAchieved = true;
        }
    }

    // Apply bingo bonus once if any current word used exactly 7 placed tiles
    if (bingoAchieved) {
        stickerPoints += 50;
    }

    const finalPoints = totalPoints + stickerPoints;
    const finalMulti = totalLetters + stickerMulti;

    return {
        totalScore: finalPoints * finalMulti,
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
