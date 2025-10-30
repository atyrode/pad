import { BoardState } from '../types/board';
import { TileData } from '../types/tile';
import { getTileDefinition } from './tileDefinitions';
import { createInitialBoard } from './boardUtils';

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
 * Create the initial draft board with "DRAFT" spelled out in locked tiles
 * on the second row (row 1), centered in the 11x11 grid
 */
export function createInitialDraftBoard(): BoardState {
    const board = createInitialBoard();
    
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
            locked: true
        };
    });
    
    return board;
}
