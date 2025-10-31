import { RackState } from '../types/rack';
import { Bag } from '../types/bag';
import { TileData } from '../types/tile';
import { getTileDefinitionById } from '../utils/tileDefinitions';
import * as Rack from '../domain/rack/Rack';

/**
 * State for tile supply operations
 */
export interface TileSupplyState {
    rack: RackState;
    bag: Bag;
    discard: TileData[];
}

/**
 * Result of drawing one or more tiles
 */
export interface DrawResult {
    rack: RackState;
    bag: Bag;
    discard: TileData[];
}

/**
 * Result of discard and draw operation
 */
export interface DiscardAndDrawResult {
    rack: RackState;
    bag: Bag;
    discard: TileData[];
    drawnSlot: number | null;
}

// ============================================================================
// BAG OPERATIONS
// ============================================================================

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
export function shuffleBag(bag: Bag): Bag {
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

/**
 * Get the total number of tiles in a full bag
 */
export function getFullBagSize(): number {
    return TILE_DISTRIBUTION.reduce((total, tile) => total + tile.count, 0);
}

/**
 * Draw a single tile from the bag (without refilling from discard)
 */
function drawTileFromBag(bag: Bag): { tile: TileData | null; newBag: Bag } {
    if (bag.length === 0) {
        return { tile: null, newBag: bag };
    }
    
    const drawnTile = bag[0];
    const newBag = bag.slice(1);
    
    return { tile: drawnTile, newBag };
}

/**
 * Refill the bag from the discard pile if the bag is empty
 */
function refillBagFromDiscard(bag: Bag, discard: TileData[]): {
    newBag: Bag;
    newDiscard: TileData[];
    didRefill: boolean;
} {
    if (bag.length === 0 && discard.length > 0) {
        return {
            newBag: shuffleBag([...discard]),
            newDiscard: [],
            didRefill: true,
        };
    }
    return {
        newBag: bag,
        newDiscard: discard,
        didRefill: false,
    };
}

/**
 * Draw a tile from the bag, automatically refilling from discard if needed
 */
function drawTile(bag: Bag, discard: TileData[]): {
    tile: TileData | null;
    newBag: Bag;
    newDiscard: TileData[];
    didRefill: boolean;
} {
    const { newBag, newDiscard, didRefill } = refillBagFromDiscard(bag, discard);
    const { tile, newBag: updatedBag } = drawTileFromBag(newBag);
    
    return {
        tile,
        newBag: updatedBag,
        newDiscard,
        didRefill,
    };
}


// ============================================================================
// TILE SUPPLY OPERATIONS
// ============================================================================

/**
 * Draw one tile and place it in the first available rack slot.
 * Returns null if no empty slot is available or bag/discard are empty.
 */
export function drawOne(currentState: TileSupplyState): DrawResult | null {
    const slotIndex = Rack.firstEmpty(currentState.rack);
    if (slotIndex === null) {
        return null;
    }

    const { tile, newBag, newDiscard } = drawTile(currentState.bag, currentState.discard);
    if (!tile) {
        return null;
    }

    const newRack = [...currentState.rack];
    newRack[slotIndex] = tile;

    return {
        rack: newRack,
        bag: newBag,
        discard: newDiscard,
    };
}

/**
 * Fill all empty slots in the rack until no more tiles are available
 * or all slots are filled.
 */
export function drawToFill(currentState: TileSupplyState): DrawResult {
    let rackWork = [...currentState.rack];
    let currentBag = currentState.bag;
    let currentDiscard = currentState.discard;

    while (true) {
        const slot = Rack.firstEmpty(rackWork);
        if (slot === null) break;

        const { tile, newBag, newDiscard } = drawTile(currentBag, currentDiscard);
        if (!tile) break;

        rackWork[slot] = tile;
        currentBag = newBag;
        currentDiscard = newDiscard;
    }

    return {
        rack: rackWork,
        bag: currentBag,
        discard: currentDiscard,
    };
}

/**
 * Replace all tiles currently in the rack with new tiles drawn from the bag.
 * Maintains the same number of tiles that were in the rack before.
 */
export function redraw(currentState: TileSupplyState): DrawResult {
    const currentTileCount = currentState.rack.filter(t => t !== null).length;
    let currentBag = currentState.bag;
    let currentDiscard = currentState.discard;
    const newRack: RackState = Array(currentState.rack.length).fill(null);

    for (let i = 0; i < currentTileCount; i++) {
        const { tile, newBag, newDiscard } = drawTile(currentBag, currentDiscard);
        if (!tile) break;

        newRack[i] = tile;
        currentBag = newBag;
        currentDiscard = newDiscard;
    }

    return {
        rack: newRack,
        bag: currentBag,
        discard: currentDiscard,
    };
}

/**
 * Discard a tile and immediately draw a new tile to replace it in the rack.
 * 
 * @param tile - The tile to discard
 * @param sourceRackIndex - The rack index where the tile was removed from (null if from board)
 * @param currentState - Current bag/rack/discard state
 * @returns New state with tile discarded and new tile drawn, or null if couldn't draw
 */
export function discardAndDraw(
    tile: TileData,
    sourceRackIndex: number | null,
    currentState: TileSupplyState
): DiscardAndDrawResult | null {
    // Remove tile from rack if it was in rack
    let updatedRack = [...currentState.rack];
    if (sourceRackIndex !== null) {
        updatedRack[sourceRackIndex] = null;
    }

    // Add tile to discard
    const updatedDiscard = [...currentState.discard, tile];

    // Determine target slot for drawing
    const slotIndex = sourceRackIndex !== null 
        ? sourceRackIndex 
        : Rack.firstEmpty(updatedRack);

    if (slotIndex === null) {
        return {
            rack: updatedRack,
            bag: currentState.bag,
            discard: updatedDiscard,
            drawnSlot: null,
        };
    }

    // Draw new tile using the updated discard
    const { tile: newTile, newBag, newDiscard } = drawTile(currentState.bag, updatedDiscard);
    if (!newTile) {
        return {
            rack: updatedRack,
            bag: currentState.bag,
            discard: updatedDiscard,
            drawnSlot: null,
        };
    }

    // Place new tile in the target slot
    updatedRack[slotIndex] = newTile;

    return {
        rack: updatedRack,
        bag: newBag,
        discard: newDiscard,
        drawnSlot: slotIndex,
    };
}

