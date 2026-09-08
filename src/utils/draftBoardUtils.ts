import { BoardState } from '../types/board';
import { TileData } from '../types/tile';
import { getTileDefinition, ALL_TILE_DEFINITIONS } from './tileDefinitions';
import { createInitialBoard } from './boardUtils';
import { BOARD_SIZE } from '../constants/board';

/**
 * Create a tile from a letter using the tile definitions
 */
function createTileFromLetter(letter: string, id: string): TileData {
    const definition = getTileDefinition(letter);
    if (!definition) {
        throw new Error(`No tile definition found for letter: ${letter}`);
    }
    
    return {
        id,
        value: letter,
        score: definition.score
    };
}

const VOWELS = new Set(['A', 'E', 'I', 'O', 'U', 'Y']);

export function generateUniqueTiles(
    count: number,
    type: 'vowel' | 'consonant',
    random: () => number,
    createId: () => string,
): TileData[] {
    const pool = ALL_TILE_DEFINITIONS.filter(def => type === 'vowel' ? VOWELS.has(def.letter) : !VOWELS.has(def.letter));
    if (!Number.isInteger(count) || count < 0 || count > pool.length) {
        throw new RangeError(`Cannot sample ${count} distinct ${type} tiles from ${pool.length} letters`);
    }
    const tiles: TileData[] = [];
    for (let i = 0; i < count; i++) {
        const index = Math.floor(random() * pool.length);
        const [def] = pool.splice(index, 1);
        tiles.push({ id: createId(), value: def.letter, score: def.score });
    }
    return tiles;
}

/**
 * Create the initial draft board with "DRAFT" spelled out in locked tiles
 * on the second row (row 1), centered in the 11x11 grid.
 * The engine owns suggestions at positions (4,2), (4,5), (4,8).
 */
export function createInitialDraftBoard(): BoardState {
    const board = createInitialBoard();
    
    // By default in draft mode: disallow placement everywhere
    for (let r = 0; r < board.length; r++) {
        for (let c = 0; c < board[r].length; c++) {
            board[r][c] = { ...board[r][c], canPlace: false };
        }
    }

    // Allow placement only in the center 7 tiles on rows 7 and 8 (0-indexed)
    const centerCount = 7;
    const centerStart = Math.floor((BOARD_SIZE - centerCount) / 2);
    const centerEnd = centerStart + centerCount - 1;
    [7, 8].forEach(rowIdx => {
        for (let c = centerStart; c <= centerEnd; c++) {
            board[rowIdx][c] = { ...board[rowIdx][c], canPlace: true };
        }
    });
    
    // "DRAFT" should be centered on row 1 (second row)
    // For 11 columns, "DRAFT" (5 letters) should start at column 3
    // Positions: row 1, columns 3, 4, 5, 6, 7
    const draftLetters = ['D', 'R', 'A', 'F', 'T'];
    const startCol = 3; // Center of 11-column grid for 5-letter word
    const row = 1; // Second row (0-indexed)
    
    draftLetters.forEach((letter, index) => {
        const col = startCol + index;
        const tile = createTileFromLetter(letter, `draft-${letter}-${row}-${col}`);
        
        board[row][col] = {
            tile,
            canPlace: false,
            canTake: false
        };
    });
    
    board[4][2] = { ...board[4][2], canPlace: false, canTake: true };
    board[4][5] = { ...board[4][5], canPlace: false, canTake: true };
    board[4][8] = { ...board[4][8], canPlace: false, canTake: true };
    
    return board;
}
