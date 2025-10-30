import { BoardState } from "../types/board";
import { RackState } from "../types/rack";
import { StickerState } from "../types/sticker";
import { findAllWords, areUnlockedTilesInSingleLine, doesCurrentPlayTouchLocked } from "../utils/boardUtils";
import { doesWordCoverStartSticker, isStartStickerConsumed } from "../utils/stickerUtils";
import { isValidWordSync } from "../utils/dictionaryUtils";

export function areAllCurrentWordsValidSelector(
    board: BoardState,
    stickers: StickerState,
    isDictionaryLoaded: boolean
): boolean {
    if (!isDictionaryLoaded) return false;

    const words = findAllWords(board);
    const currentWords = words.filter(w => !w.isLocked);
    if (currentWords.length === 0) return false;

    if (!areUnlockedTilesInSingleLine(board)) return false;

    const allWordsValid = currentWords.every(wordInfo => isValidWordSync(wordInfo.word) === true);
    if (!allWordsValid) return false;

    const startStickerConsumed = isStartStickerConsumed(stickers);
    if (!startStickerConsumed) {
        const allWordsCoverStart = currentWords.every(wordInfo => doesWordCoverStartSticker(wordInfo, stickers));
        if (!allWordsCoverStart) return false;
    } else {
        const hasLockedTiles = board.some(row => row.some(cell => cell.tile && !cell.canTake));
        if (hasLockedTiles && !doesCurrentPlayTouchLocked(board)) return false;
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


