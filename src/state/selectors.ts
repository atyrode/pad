import { BoardState } from "../types/board";
import { RackState } from "../types/rack";
import { StickerState } from "../types/sticker";
import * as Board from "../domain/board/Board";
import { doesWordCoverStartSticker, isStartStickerConsumed } from "../utils/stickerUtils";
import { isValidWordSync } from "../utils/dictionaryUtils";
import * as Rack from "../domain/rack/Rack";

export function areAllCurrentWordsValidSelector(
    board: BoardState,
    stickers: StickerState,
    isDictionaryLoaded: boolean
): boolean {
    if (!isDictionaryLoaded) return false;

    const words = Board.findAllWords(board);
    const currentWords = words.filter(w => !w.isLocked);
    if (currentWords.length === 0) return false;

    if (!Board.areUnlockedTilesInSingleLine(board)) return false;

    const allWordsValid = currentWords.every(wordInfo => isValidWordSync(wordInfo.word) === true);
    if (!allWordsValid) return false;

    const startStickerConsumed = isStartStickerConsumed(stickers);
    if (!startStickerConsumed) {
        const allWordsCoverStart = currentWords.every(wordInfo => doesWordCoverStartSticker(wordInfo, stickers));
        if (!allWordsCoverStart) return false;
    } else {
        const hasLockedTiles = board.some(row => row.some(cell => cell.tile && !cell.canTake));
        if (hasLockedTiles && !Board.doesCurrentPlayTouchLocked(board)) return false;
    }

    return true;
}

export function canPlaySelector(args: {
    board: BoardState;
    stickers: StickerState;
    isDictionaryLoaded: boolean;
}): boolean {
    return areAllCurrentWordsValidSelector(args.board, args.stickers, args.isDictionaryLoaded);
}

export function canShuffleSelector(rack: RackState): boolean {
    return rack.filter(t => !!t).length > 1;
}

/**
 * Get the number of tiles currently in the rack
 */
export function rackTileCountSelector(rack: RackState): number {
    return Rack.count(rack);
}

/**
 * Check if the rack is full (all slots occupied)
 */
export function isRackFullSelector(rack: RackState): boolean {
    return Rack.isFull(rack);
}

/**
 * Check if the rack has at least one empty slot
 */
export function hasEmptySlotSelector(rack: RackState): boolean {
    return Rack.firstEmpty(rack) !== null;
}
