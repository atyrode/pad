import { TileData } from '../types/tile';
import { Bag } from '../types/bag';
import { ALL_TILE_DEFINITIONS, BLANK_TILE_DEFINITION, getTileDefinitionById } from './tileDefinitions';

interface TileDistribution {
    tileId: number;
    count: number;
}

const TILE_DISTRIBUTION: TileDistribution[] = [
    // Blank tiles
    { tileId: 0, count: 2 },
    
    // 1 point tiles
    { tileId: 2, count: 15 }, // E
    { tileId: 1, count: 9 },  // A
    { tileId: 3, count: 8 },  // I
    { tileId: 4, count: 6 },  // N
    { tileId: 5, count: 6 },  // O
    { tileId: 6, count: 6 },  // R
    { tileId: 7, count: 6 },  // S
    { tileId: 8, count: 6 },  // T
    { tileId: 9, count: 6 },  // U
    { tileId: 10, count: 5 }, // L
    
    // 2 point tiles
    { tileId: 11, count: 3 }, // D
    { tileId: 12, count: 3 }, // M
    { tileId: 13, count: 2 }, // G
    
    // 3 point tiles
    { tileId: 14, count: 2 }, // B
    { tileId: 15, count: 2 }, // C
    { tileId: 16, count: 2 }, // P
    
    // 4 point tiles
    { tileId: 17, count: 2 }, // F
    { tileId: 18, count: 2 }, // H
    { tileId: 19, count: 2 }, // V
    
    // 8 point tiles
    { tileId: 23, count: 1 }, // J
    { tileId: 25, count: 1 }, // Q
    
    // 10 point tiles
    { tileId: 22, count: 1 }, // K
    { tileId: 20, count: 1 }, // W
    { tileId: 24, count: 1 }, // X
    { tileId: 21, count: 1 }, // Y
    { tileId: 26, count: 1 }, // Z
];

export function shuffleBag(bag: Bag): Bag {
    const shuffled = [...bag];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

export function createTileBag(): Bag {
    const bag: Bag = [];
    
    for (const { tileId, count } of TILE_DISTRIBUTION) {
        const tileDefinition = getTileDefinitionById(tileId);
        if (!tileDefinition) {
            console.warn(`Tile definition not found for ID: ${tileId}`);
            continue;
        }
        
        for (let i = 0; i < count; i++) {
            bag.push({
                id: crypto.randomUUID(),
                value: tileDefinition.letter,
                score: tileDefinition.score,
            });
        }
    }
    
    return shuffleBag(bag);
}

export function drawTileFromBag(bag: Bag): { tile: TileData | null; newBag: Bag } {
    if (bag.length === 0) {
        return { tile: null, newBag: bag };
    }
    
    // Draw the first tile from the bag
    const drawnTile = bag[0];
    
    // Create new bag without the first tile
    const newBag = bag.slice(1);
    
    return { tile: drawnTile, newBag };
}

export function getFullBagSize(): number {
    return TILE_DISTRIBUTION.reduce((total, tile) => total + tile.count, 0);
}

/**
 * State object for managing bag refills from discard during iteration
 */
export interface BagRefillState {
    bag: Bag;
    discard: TileData[];
    didRefill: boolean;
}

/**
 * Ensures the bag has tiles by refilling from discard if needed.
 * Returns updated state with didRefill flag set if a refill occurred.
 */
export function ensureBagHasTiles(state: BagRefillState): BagRefillState {
    if (state.bag.length === 0 && state.discard.length > 0) {
        return {
            bag: shuffleBag([...state.discard]),
            discard: [],
            didRefill: true, // Set to true if refill occurred
        };
    }
    return state; // Preserve existing didRefill flag
}

/**
 * Draws a tile from the bag, automatically refilling from discard if needed.
 * Returns the drawn tile (or null if bag is empty) and the updated bag state.
 */
export function drawTileWithRefill(state: BagRefillState): {
    tile: TileData | null;
    newState: BagRefillState;
} {
    const ensuredState = ensureBagHasTiles(state);
    const { tile, newBag } = drawTileFromBag(ensuredState.bag);
    return {
        tile,
        newState: {
            ...ensuredState,
            bag: newBag,
        },
    };
}

