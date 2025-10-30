import { BoardState, Position } from '../types/board';
import { TileData } from '../types/tile';
import { getTileDefinition, ALL_TILE_DEFINITIONS } from './tileDefinitions';
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
 * Generate random tiles from the tile definitions
 */
export function generateRandomTiles(count: number): TileData[] {
    const tiles: TileData[] = [];
    
    for (let i = 0; i < count; i++) {
        const randomIndex = Math.floor(Math.random() * ALL_TILE_DEFINITIONS.length);
        const definition = ALL_TILE_DEFINITIONS[randomIndex];
        
        tiles.push({
            id: `suggested-${definition.letter}-${i}-${Date.now()}`,
            value: definition.letter,
            score: definition.score
        });
    }
    
    return tiles;
}

/**
 * Get the 14 draft slot positions
 * Row 8: columns 2, 3, 4, 5, 6, 7, 8 (7 slots)
 * Row 9: columns 2, 3, 4, 5, 6, 7, 8 (7 slots)
 */
export function createDraftSlotPositions(): Position[] {
    const positions: Position[] = [];
    
    // Row 8 slots (indices 0-6)
    for (let col = 2; col <= 8; col++) {
        positions.push({ row: 7, col });
    }
    
    // Row 9 slots (indices 7-13)
    for (let col = 2; col <= 8; col++) {
        positions.push({ row: 8, col });
    }
    
    return positions;
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
