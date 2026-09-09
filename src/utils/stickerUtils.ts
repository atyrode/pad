import type { StickerState } from '../game/generated';
import { BOARD_SIZE } from '../constants/board';
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

