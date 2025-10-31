import { Bag } from '../../types/bag';
import { TileData } from '../../types/tile';
import { getTileDefinitionById } from '../../utils/tileDefinitions';

/**
 * Bag domain module - Pure, immutable bag operations
 *
 * This module provides all bag-related functionality in a centralized,
 * self-contained way. All operations are pure and return new bag states.
 */

/**
 * Tile distribution for standard Scrabble
 */
interface TileDistribution {
    tileId: number;
    count: number;
}

const TILE_DISTRIBUTION: TileDistribution[] = [
    { tileId: 0, count: 2 },   // Blank
    { tileId: 2, count: 15 },  // E
    { tileId: 1, count: 9 },   // A
    { tileId: 3, count: 8 },   // I
    { tileId: 4, count: 6 },   // N
    { tileId: 5, count: 6 },   // O
    { tileId: 6, count: 6 },   // R
    { tileId: 7, count: 6 },   // S
    { tileId: 8, count: 6 },   // T
    { tileId: 9, count: 6 },   // U
    { tileId: 10, count: 5 },  // L
    { tileId: 11, count: 3 },  // D
    { tileId: 12, count: 3 },  // M
    { tileId: 13, count: 2 },  // G
    { tileId: 14, count: 2 },  // B
    { tileId: 15, count: 2 },  // C
    { tileId: 16, count: 2 },  // P
    { tileId: 17, count: 2 },  // F
    { tileId: 18, count: 2 },  // H
    { tileId: 19, count: 2 },  // V
    { tileId: 23, count: 1 },  // J
    { tileId: 25, count: 1 },  // Q
    { tileId: 22, count: 1 },  // K
    { tileId: 20, count: 1 },  // W
    { tileId: 24, count: 1 },  // X
    { tileId: 21, count: 1 },  // Y
    { tileId: 26, count: 1 },  // Z
];

/**
 * Shuffle a bag using Fisher-Yates algorithm
 */
export function shuffle(bag: Bag): Bag {
    const shuffled = [...bag];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

/**
 * Create a new tile bag with standard Scrabble distribution
 */
export function createStandard(): Bag {
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

    return shuffle(bag);
}

/**
 * Get the total number of tiles in a full bag
 */
export function fullSize(): number {
    return TILE_DISTRIBUTION.reduce((total, tile) => total + tile.count, 0);
}

/**
 * Draw a single tile from the bag (without refilling from discard)
 */
export function drawOne(bag: Bag): { tile: TileData | null; bag: Bag } {
    if (bag.length === 0) {
        return { tile: null, bag };
    }

    const drawnTile = bag[0];
    const newBag = bag.slice(1);

    return { tile: drawnTile, bag: newBag };
}

/**
 * Refill the bag from the discard pile if the bag is empty
 */
export function refillFromDiscard(bag: Bag, discard: TileData[]): {
    bag: Bag;
    discard: TileData[];
    didRefill: boolean;
} {
    if (bag.length === 0 && discard.length > 0) {
        return {
            bag: shuffle([...discard]),
            discard: [],
            didRefill: true,
        };
    }
    return {
        bag,
        discard,
        didRefill: false,
    };
}

/**
 * Draw a tile from the bag, automatically refilling from discard if needed
 */
export function draw(bag: Bag, discard: TileData[]): {
    tile: TileData | null;
    bag: Bag;
    discard: TileData[];
    didRefill: boolean;
} {
    const { bag: refilledBag, discard: updatedDiscard, didRefill } = refillFromDiscard(bag, discard);
    const { tile, bag: finalBag } = drawOne(refilledBag);

    return {
        tile,
        bag: finalBag,
        discard: updatedDiscard,
        didRefill,
    };
}
