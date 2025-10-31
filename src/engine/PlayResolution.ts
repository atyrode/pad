import { BoardState, Position } from '../types/board';
import { RackState } from '../types/rack';
import { Bag } from '../types/bag';
import { StickerState } from '../types/sticker';
import { TileData } from '../types/tile';
import { findAllWords, WordInfo } from '../utils/boardUtils';
import { consumeSticker, isStickerActive } from '../utils/stickerUtils';
import * as TileSupply from './TileSupply';

/**
 * Score breakdown for a play
 */
export interface ScoreBreakdown {
    baseTilePoints: number;
    stickerPoints: number;
    baseTileMulti: number;
    stickerMulti: number;
    points: number;
    multi: number;
    total: number;
}

/**
 * Play score result
 */
export interface PlayScore {
    totalScore: number;
    breakdown: ScoreBreakdown;
}

/**
 * Arguments for resolving a play
 */
export interface ResolvePlayArgs {
    board: BoardState;
    stickers: StickerState;
    rack: RackState;
    bag: Bag;
    discard: TileData[];
    currentTotalScore: number;
}

/**
 * Result of resolving a play
 */
export interface ResolvePlayResult {
    board: BoardState;
    stickers: StickerState;
    rack: RackState;
    bag: Bag;
    discard: TileData[];
    totalScore: number;
    placementHistory: [];
}

// ============================================================================
// SCORE CALCULATION
// ============================================================================

/**
 * Calculate score for a single word using the formula:
 * (sum of letter scores + sticker bonuses) × (word length + multi sticker bonuses)
 */
export function calculateWordScore(word: WordInfo, board: BoardState, stickers?: StickerState): number {
    let points = 0;
    let letterCount = 0;
    let stickerPoints = 0;
    let stickerMulti = 0;

    if (word.direction === 'horizontal') {
        for (let col = word.position.col; col < word.position.col + word.word.length; col++) {
            const cell = board[word.position.row][col];
            if (cell.tile) {
                points += cell.tile.score;
                letterCount++;
                
                if (stickers && isStickerActive(stickers, { row: word.position.row, col })) {
                    const sticker = stickers[word.position.row][col];
                    if (sticker) {
                        if (sticker.type === 'multi') {
                            stickerMulti += sticker.value;
                        } else if (sticker.type === 'points') {
                            stickerPoints += sticker.value;
                        }
                    }
                }
            }
        }
    } else {
        for (let row = word.position.row; row < word.position.row + word.word.length; row++) {
            const cell = board[row][word.position.col];
            if (cell.tile) {
                points += cell.tile.score;
                letterCount++;
                
                if (stickers && isStickerActive(stickers, { row, col: word.position.col })) {
                    const sticker = stickers[row][word.position.col];
                    if (sticker) {
                        if (sticker.type === 'multi') {
                            stickerMulti += sticker.value;
                        } else if (sticker.type === 'points') {
                            stickerPoints += sticker.value;
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
    
    let totalPoints = 0;
    let totalLetters = 0;
    let stickerPoints = 0;
    let stickerMulti = 0;
    let bingoAchieved = false;

    for (const word of currentWords) {
        let placedCount = 0;

        if (word.direction === 'horizontal') {
            for (let col = word.position.col; col < word.position.col + word.word.length; col++) {
                const cell = board[word.position.row][col];
                if (cell.tile) {
                    totalPoints += cell.tile.score;
                    totalLetters++;
                    if (cell.canTake) {
                        placedCount++;
                    }
                    
                    if (stickers && isStickerActive(stickers, { row: word.position.row, col })) {
                        const sticker = stickers[word.position.row][col];
                        if (sticker) {
                            if (sticker.type === 'multi') {
                                stickerMulti += sticker.value;
                            } else if (sticker.type === 'points') {
                                stickerPoints += sticker.value;
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
                    
                    if (stickers && isStickerActive(stickers, { row, col: word.position.col })) {
                        const sticker = stickers[row][word.position.col];
                        if (sticker) {
                            if (sticker.type === 'multi') {
                                stickerMulti += sticker.value;
                            } else if (sticker.type === 'points') {
                                stickerPoints += sticker.value;
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

// ============================================================================
// PLAY RESOLUTION
// ============================================================================

/**
 * Centralized play resolution:
 * - Compute score for current play
 * - Lock just-placed tiles (canTake → false, canPlace → false)
 * - Consume stickers under locked tiles
 * - Refill rack from bag/discard
 * 
 * Pure function: returns all updated states without side effects.
 */
export function resolvePlay(args: ResolvePlayArgs): ResolvePlayResult {
    const { totalScore } = calculateCurrentPlayScore(args.board, args.stickers);
    const newTotal = args.currentTotalScore + totalScore;

    // Lock tiles: any currently placed (canTake === true) tiles become locked and unplaceable
    const lockedBoard: BoardState = args.board.map(row =>
        row.map(cell => (cell.tile && cell.canTake ? { ...cell, canPlace: false, canTake: false } : cell))
    );

    // Consume stickers where tiles were just locked
    let newStickers = args.stickers;
    for (let row = 0; row < args.board.length; row++) {
        for (let col = 0; col < args.board[row].length; col++) {
            const cell = args.board[row][col];
            if (cell.tile && cell.canTake) {
                newStickers = consumeSticker(newStickers, { row, col });
            }
        }
    }

    // Fill rack
    const tileSupplyResult = TileSupply.drawToFill({
        rack: args.rack,
        bag: args.bag,
        discard: args.discard,
    });

    return {
        totalScore: newTotal,
        board: lockedBoard,
        stickers: newStickers,
        placementHistory: [],
        rack: tileSupplyResult.rack,
        bag: tileSupplyResult.bag,
        discard: tileSupplyResult.discard,
    };
}

