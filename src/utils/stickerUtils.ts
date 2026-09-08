import { StickerState, Sticker } from '../types/sticker';
import { BOARD_SIZE } from '../constants/board';
import { Position } from '../types/board';
import { WordInfo } from './boardUtils';

/**
 * Create initial sticker layout with 4-way rotational symmetry
 * Multi stickers (x2 multi) near corners
 * Points stickers (+10 points) closer to center
 */
export function createInitialStickers(): StickerState {
    const stickers: StickerState = Array(BOARD_SIZE).fill(null).map(() => 
        Array(BOARD_SIZE).fill(null)
    );

    // For 11x11 board (center at index 5)
    // Multi stickers near corners - 4-way rotational symmetry
    const multiPositions: Position[] = [
        { row: 1, col: 1 },   // Top-left
        { row: 1, col: 9 },   // Top-right
        { row: 9, col: 1 },   // Bottom-left
        { row: 9, col: 9 },   // Bottom-right
    ];

    // Points stickers closer to center - 4-way rotational symmetry
    const pointsPositions: Position[] = [
        { row: 3, col: 3 },   // Top-left
        { row: 3, col: 7 },   // Top-right
        { row: 7, col: 3 },   // Bottom-left
        { row: 7, col: 7 },   // Bottom-right
    ];

    // Place multi stickers
    for (const pos of multiPositions) {
        stickers[pos.row][pos.col] = {
            type: 'multi',
            value: 2,
            consumed: false
        };
    }

    // Place points stickers
    for (const pos of pointsPositions) {
        stickers[pos.row][pos.col] = {
            type: 'points',
            value: 10,
            consumed: false
        };
    }

    // Place start sticker at center (5, 5)
    stickers[5][5] = {
        type: 'start',
        value: 0, // No scoring bonus
        consumed: false
    };

    return stickers;
}

/**
 * Get sticker at a specific position
 */
export function getStickerAt(stickers: StickerState, position: Position): Sticker | null {
    return stickers[position.row][position.col];
}

/**
 * Check if a sticker is active (exists and not consumed)
 */
export function isStickerActive(stickers: StickerState, position: Position): boolean {
    const sticker = getStickerAt(stickers, position);
    return sticker !== null && !sticker.consumed;
}

/**
 * Check if the start sticker is consumed
 */
export function isStartStickerConsumed(stickers: StickerState): boolean {
    const startSticker = stickers[5][5];
    return startSticker ? startSticker.consumed : true; // If no start sticker, consider it consumed
}

/**
 * Check if a word covers the start sticker position
 */
export function doesWordCoverStartSticker(word: WordInfo): boolean {
    const startRow = 5;
    const startCol = 5;
    
    if (word.direction === 'horizontal') {
        // Check if start position is within the horizontal word range
        return word.position.row === startRow && 
               startCol >= word.position.col && 
               startCol < word.position.col + word.word.length;
    } else {
        // Check if start position is within the vertical word range
        return word.position.col === startCol && 
               startRow >= word.position.row && 
               startRow < word.position.row + word.word.length;
    }
}

/**
 * Count total stickers by type and consumption state
 */
export function countStickers(stickers: StickerState): {
    multiActive: number;
    multiConsumed: number;
    pointsActive: number;
    pointsConsumed: number;
    startActive: number;
    startConsumed: number;
} {
    let multiActive = 0;
    let multiConsumed = 0;
    let pointsActive = 0;
    let pointsConsumed = 0;
    let startActive = 0;
    let startConsumed = 0;

    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            const sticker = stickers[row][col];
            if (sticker) {
                if (sticker.type === 'multi') {
                    if (sticker.consumed) multiConsumed++;
                    else multiActive++;
                } else if (sticker.type === 'points') {
                    if (sticker.consumed) pointsConsumed++;
                    else pointsActive++;
                } else if (sticker.type === 'start') {
                    if (sticker.consumed) startConsumed++;
                    else startActive++;
                }
            }
        }
    }

    return { multiActive, multiConsumed, pointsActive, pointsConsumed, startActive, startConsumed };
}

