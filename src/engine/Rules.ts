import { BoardState } from '../types/board';
import { StickerState } from '../types/sticker';
import * as Board from '../domain/board/Board';
import * as Stickers from '../domain/stickers/Stickers';
import * as Dictionary from '../domain/dictionary/Dictionary';

/**
 * Rule validation results
 */
export interface ValidationResult {
    isValid: boolean;
    reason?: string;
}

/**
 * Comprehensive play validation result
 */
export interface PlayValidationResult {
    canPlay: boolean;
    hasWords: boolean;
    wordsInSingleLine: boolean;
    wordsValid: boolean;
    coversStartSticker: boolean;
    touchesExistingWords: boolean;
    invalidWords: string[];
}

/**
 * Game rules engine - centralized validation logic
 */
export class Rules {
    /**
     * Check if all current (unlocked) words are valid according to game rules
     */
    static areAllCurrentWordsValid(
        board: BoardState,
        stickers: StickerState,
        isDictionaryLoaded: boolean
    ): ValidationResult {
        if (!isDictionaryLoaded) {
            return { isValid: false, reason: 'Dictionary not loaded' };
        }

        const words = Board.findAllWords(board);
        const currentWords = words.filter(w => !w.isLocked);

        if (currentWords.length === 0) {
            return { isValid: false, reason: 'No words formed' };
        }

        if (!Board.areUnlockedTilesInSingleLine(board)) {
            return { isValid: false, reason: 'Tiles not in single line' };
        }

        const invalidWords = currentWords.filter(
            wordInfo => Dictionary.isValidWordSync(wordInfo.word) !== true
        );

        if (invalidWords.length > 0) {
            return {
                isValid: false,
                reason: `Invalid words: ${invalidWords.map(w => w.word).join(', ')}`
            };
        }

        const startStickerConsumed = Stickers.isStartStickerConsumed(stickers);
        if (!startStickerConsumed) {
            const allWordsCoverStart = currentWords.every(
                wordInfo => Stickers.doesWordCoverStartSticker(wordInfo, stickers)
            );
            if (!allWordsCoverStart) {
                return { isValid: false, reason: 'Must cover start position' };
            }
        } else {
            const hasLockedTiles = board.some(row => row.some(cell => cell.tile && !cell.canTake));
            if (hasLockedTiles && !Board.doesCurrentPlayTouchLocked(board)) {
                return { isValid: false, reason: 'Must touch existing words' };
            }
        }

        return { isValid: true };
    }

    /**
     * Comprehensive validation of current play
     */
    static validateCurrentPlay(
        board: BoardState,
        stickers: StickerState,
        isDictionaryLoaded: boolean
    ): PlayValidationResult {
        const words = Board.findAllWords(board);
        const currentWords = words.filter(w => !w.isLocked);
        const hasWords = currentWords.length > 0;
        const wordsInSingleLine = Board.areUnlockedTilesInSingleLine(board);

        let wordsValid = true;
        const invalidWords: string[] = [];

        if (isDictionaryLoaded && hasWords) {
            currentWords.forEach(wordInfo => {
                if (Dictionary.isValidWordSync(wordInfo.word) !== true) {
                    wordsValid = false;
                    invalidWords.push(wordInfo.word);
                }
            });
        }

        const startStickerConsumed = Stickers.isStartStickerConsumed(stickers);
        const coversStartSticker = !startStickerConsumed ?
            currentWords.every(wordInfo => Stickers.doesWordCoverStartSticker(wordInfo, stickers)) :
            true; // Already consumed, so this check passes

        const hasLockedTiles = board.some(row => row.some(cell => cell.tile && !cell.canTake));
        const touchesExistingWords = !hasLockedTiles || Board.doesCurrentPlayTouchLocked(board);

        const canPlay = isDictionaryLoaded &&
                        hasWords &&
                        wordsInSingleLine &&
                        wordsValid &&
                        coversStartSticker &&
                        touchesExistingWords;

        return {
            canPlay,
            hasWords,
            wordsInSingleLine,
            wordsValid,
            coversStartSticker,
            touchesExistingWords,
            invalidWords,
        };
    }

    /**
     * Check if a board position is valid for placement
     */
    static canPlaceAt(board: BoardState, position: { row: number; col: number }): ValidationResult {
        if (!Board.withinBounds(position)) {
            return { isValid: false, reason: 'Position out of bounds' };
        }

        const cell = board[position.row][position.col];
        if (!cell.canPlace) {
            return { isValid: false, reason: 'Position not placeable' };
        }

        if (cell.tile && cell.canTake) {
            return { isValid: false, reason: 'Position already occupied by unlocked tile' };
        }

        return { isValid: true };
    }

    /**
     * Check if a tile can be taken from a board position
     */
    static canTakeFrom(board: BoardState, position: { row: number; col: number }): ValidationResult {
        if (!Board.withinBounds(position)) {
            return { isValid: false, reason: 'Position out of bounds' };
        }

        const cell = board[position.row][position.col];
        if (!cell.tile) {
            return { isValid: false, reason: 'No tile at position' };
        }

        if (!cell.canTake) {
            return { isValid: false, reason: 'Tile is locked' };
        }

        return { isValid: true };
    }

    /**
     * Check if rack shuffling is allowed
     */
    static canShuffleRack(rack: any[]): ValidationResult {
        const tileCount = rack.filter(t => !!t).length;
        if (tileCount <= 1) {
            return { isValid: false, reason: 'Need at least 2 tiles to shuffle' };
        }
        return { isValid: true };
    }
}
