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

/**
 * Generate random tiles from the tile definitions
 */
export function generateRandomTiles(count: number): TileData[] {
    const tiles: TileData[] = [];
    
    for (let i = 0; i < count; i++) {
        // Pick a random tile definition
        const randomIndex = Math.floor(Math.random() * ALL_TILE_DEFINITIONS.length);
        const tileDef = ALL_TILE_DEFINITIONS[randomIndex];
        
        // Create a unique tile with timestamp-based ID
        const tile: TileData = {
            id: `random-${tileDef.letter}-${Date.now()}-${i}`,
            value: tileDef.letter,
            score: tileDef.score
        };
        
        tiles.push(tile);
    }
    
    return tiles;
}

const VOWELS = new Set(['A', 'E', 'I', 'O', 'U', 'Y']);

export function generateUniqueTiles(count: number, type: 'vowel' | 'consonant'): TileData[] {
    const pool = ALL_TILE_DEFINITIONS.filter(def => type === 'vowel' ? VOWELS.has(def.letter) : !VOWELS.has(def.letter));
    const tiles: TileData[] = [];
    const used = new Set<string>();
    while (tiles.length < count && pool.length > 0) {
        const randomIndex = Math.floor(Math.random() * pool.length);
        const def = pool[randomIndex];
        if (used.has(def.letter)) continue;
        used.add(def.letter);
        tiles.push({ id: `random-${def.letter}-${Date.now()}-${tiles.length}`, value: def.letter, score: def.score });
    }
    return tiles;
}

export function createBlankTile(idSuffix: string = ''): TileData {
    return { id: `blank-${Date.now()}-${idSuffix}`, value: '*', score: 0, originalValue: '*', displayValue: undefined } as any;
}

/**
 * Create the initial draft board with "DRAFT" spelled out in locked tiles
 * on the second row (row 1), centered in the 11x11 grid
 * and random suggested tiles at positions (4,2), (4,5), (4,8)
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
    
    // Add random suggested tiles at positions (4,2), (4,5), (4,8)
    const suggestedPositions = [
        { row: 4, col: 2 },
        { row: 4, col: 5 },
        { row: 4, col: 8 }
    ];

    // Initial suggestions: vowel draft (V): sides vowels, middle empty
    const initialVowels = generateUniqueTiles(2, 'vowel');
    board[4][2] = { ...board[4][2], tile: initialVowels[0], canPlace: false, canTake: true };
    board[4][5] = { ...board[4][5], tile: null, canPlace: false, canTake: true };
    board[4][8] = { ...board[4][8], tile: initialVowels[1], canPlace: false, canTake: true };
    
    return board;
}
