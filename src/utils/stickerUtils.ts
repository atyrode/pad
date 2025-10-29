import { StickerState, Sticker } from '../types/sticker';
import { BOARD_SIZE } from '../constants/board';
import { Position } from '../types/board';

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
        { row: 2, col: 2 },   // Top-left
        { row: 2, col: 8 },   // Top-right
        { row: 8, col: 2 },   // Bottom-left
        { row: 8, col: 8 },   // Bottom-right
    ];

    // Points stickers closer to center - 4-way rotational symmetry
    const pointsPositions: Position[] = [
        { row: 3, col: 5 },   // Top-center
        { row: 5, col: 3 },   // Left-center
        { row: 5, col: 7 },   // Right-center
        { row: 7, col: 5 },   // Bottom-center
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

    return stickers;
}

/**
 * Mark a sticker as consumed at the given position
 */
export function consumeSticker(stickers: StickerState, position: Position): StickerState {
    const newStickers = stickers.map(row => [...row]);
    const sticker = newStickers[position.row][position.col];
    
    if (sticker && !sticker.consumed) {
        newStickers[position.row][position.col] = {
            ...sticker,
            consumed: true
        };
    }
    
    return newStickers;
}

/**
 * Reactivate a sticker at the given position (when locked tile is removed)
 */
export function reactivateSticker(stickers: StickerState, position: Position): StickerState {
    const newStickers = stickers.map(row => [...row]);
    const sticker = newStickers[position.row][position.col];
    
    if (sticker && sticker.consumed) {
        newStickers[position.row][position.col] = {
            ...sticker,
            consumed: false
        };
    }
    
    return newStickers;
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
 * Count total stickers by type and consumption state
 */
export function countStickers(stickers: StickerState): {
    multiActive: number;
    multiConsumed: number;
    pointsActive: number;
    pointsConsumed: number;
} {
    let multiActive = 0;
    let multiConsumed = 0;
    let pointsActive = 0;
    let pointsConsumed = 0;

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
                }
            }
        }
    }

    return { multiActive, multiConsumed, pointsActive, pointsConsumed };
}

