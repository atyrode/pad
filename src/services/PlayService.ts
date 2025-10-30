import { BoardState } from '../types/board';
import { RackState } from '../types/rack';
import { Bag } from '../types/bag';
import { StickerState } from '../types/sticker';
import { TileData } from '../types/tile';
import { calculateCurrentPlayScore } from '../utils/scoreUtils';
import { consumeSticker } from '../utils/stickerUtils';
import { TileSupplyService } from './TileSupplyService';

export interface ResolvePlayArgs {
    board: BoardState;
    stickers: StickerState;
    rack: RackState;
    bag: Bag;
    discard: TileData[];
    currentTotalScore: number;
}

export interface ResolvePlayResult {
    board: BoardState;
    stickers: StickerState;
    rack: RackState;
    bag: Bag;
    discard: TileData[];
    totalScore: number;
    placementHistory: [];
}

/**
 * Centralized play resolution:
 * - compute score for current play
 * - lock just-placed tiles
 * - consume stickers under locked tiles
 * - refill rack from bag/discard
 * Returns all updated slices without side effects.
 */
 

 

/**
 * Centralizes the resolution of a completed play:
 * - compute score for current play
 * - lock placed tiles
 * - consume stickers under locked tiles
 * - refill rack from bag/discard
 *
 * Pure function: returns new states without side effects.
 */
export function resolvePlay(args: ResolvePlayArgs): ResolvePlayResult {
    const { totalScore } = calculateCurrentPlayScore(args.board, args.stickers);
    const newTotal = args.currentTotalScore + totalScore;

    // Lock tiles: any currently placed (canTake === true) tiles become locked and unplaceable
    const lockedBoard: BoardState = args.board.map(row =>
        row.map(cell => (cell.tile && cell.canTake ? { ...cell, canPlace: false, canTake: false } : cell))
    );

    // Consume stickers where tiles were just locked (scan original board for canTake positions)
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
    const tileSupplyResult = TileSupplyService.drawToFill({
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


