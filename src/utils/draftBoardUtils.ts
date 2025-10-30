import { BoardState } from '../types/board';
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

/**
 * Create the initial draft board with "DRAFT" spelled out in locked tiles
 * on the second row (row 1), centered in the 11x11 grid
 * and random suggested tiles at positions (4,2), (4,5), (4,8)
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
    
    // Add random suggested tiles at positions (4,2), (4,5), (4,8)
    const suggestedPositions = [
        { row: 4, col: 2 },
        { row: 4, col: 5 },
        { row: 4, col: 8 }
    ];
    
    const randomTiles = generateRandomTiles(3);
    
    suggestedPositions.forEach((pos, index) => {
        board[pos.row][pos.col] = {
            tile: randomTiles[index],
            locked: false // These can be moved
        };
    });
    
    return board;
}
