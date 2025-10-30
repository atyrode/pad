export interface TileDefinition {
    id: number;
    letter: string;
    score: number;
}

// All possible tile definitions in the game (A-Z)
export const ALL_TILE_DEFINITIONS: TileDefinition[] = [
    // 1 point tiles
    { id: 1, letter: 'A', score: 1 },
    { id: 2, letter: 'E', score: 1 },
    { id: 3, letter: 'I', score: 1 },
    { id: 4, letter: 'N', score: 1 },
    { id: 5, letter: 'O', score: 1 },
    { id: 6, letter: 'R', score: 1 },
    { id: 7, letter: 'S', score: 1 },
    { id: 8, letter: 'T', score: 1 },
    { id: 9, letter: 'U', score: 1 },
    { id: 10, letter: 'L', score: 1 },
    
    // 2 point tiles
    { id: 11, letter: 'D', score: 2 },
    { id: 12, letter: 'M', score: 2 },
    { id: 13, letter: 'G', score: 2 },
    
    // 3 point tiles
    { id: 14, letter: 'B', score: 3 },
    { id: 15, letter: 'C', score: 3 },
    { id: 16, letter: 'P', score: 3 },
    
    // 4 point tiles
    { id: 17, letter: 'F', score: 4 },
    { id: 18, letter: 'H', score: 4 },
    { id: 19, letter: 'V', score: 4 },
    { id: 20, letter: 'W', score: 4 },
    { id: 21, letter: 'Y', score: 4 },
    
    // 5 point tiles
    { id: 22, letter: 'K', score: 5 },
    
    // 8 point tiles
    { id: 23, letter: 'J', score: 8 },
    { id: 24, letter: 'X', score: 8 },
    
    // 10 point tiles
    { id: 25, letter: 'Q', score: 10 },
    { id: 26, letter: 'Z', score: 10 },
];

// Blank tile definition
export const BLANK_TILE_DEFINITION: TileDefinition = {
    id: 0,
    letter: '*',
    score: 0,
};

/**
 * Get all available letters for blank tile selection
 * Returns letters sorted alphabetically with their scores
 */
export function getAllAvailableLetters(): Array<{ letter: string; score: number }> {
    return ALL_TILE_DEFINITIONS
        .map(({ letter, score }) => ({ letter, score }))
        .sort((a, b) => a.letter.localeCompare(b.letter));
}

/**
 * Get tile definition by letter
 */
export function getTileDefinition(letter: string): TileDefinition | undefined {
    if (letter === '*') {
        return BLANK_TILE_DEFINITION;
    }
    return ALL_TILE_DEFINITIONS.find(tile => tile.letter === letter);
}

/**
 * Get tile definition by ID
 */
export function getTileDefinitionById(id: number): TileDefinition | undefined {
    if (id === 0) {
        return BLANK_TILE_DEFINITION;
    }
    return ALL_TILE_DEFINITIONS.find(tile => tile.id === id);
}

/**
 * Get all tile IDs
 */
export function getAllTileIds(): number[] {
    return [0, ...ALL_TILE_DEFINITIONS.map(tile => tile.id)];
}
