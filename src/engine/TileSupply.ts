import { RackState } from '../types/rack';
import { Bag } from '../types/bag';
import { TileData } from '../types/tile';
import * as Rack from '../domain/rack/Rack';
import * as BagDomain from '../domain/bag/Bag';

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
// BAG DELEGATION FUNCTIONS
// ============================================================================

/**
 * Shuffle a bag using Fisher-Yates algorithm (delegates to Bag domain)
 */
export function shuffleBag(bag: Bag): Bag {
    return BagDomain.shuffle(bag);
}

/**
 * Create a new tile bag with standard Scrabble distribution (delegates to Bag domain)
 */
export function createTileBag(): Bag {
    return BagDomain.createStandard();
}

/**
 * Get the total number of tiles in a full bag (delegates to Bag domain)
 */
export function getFullBagSize(): number {
    return BagDomain.fullSize();
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

    const { tile, bag: newBag, discard: newDiscard } = BagDomain.draw(currentState.bag, currentState.discard);
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

        const { tile, bag: newBag, discard: newDiscard } = BagDomain.draw(currentBag, currentDiscard);
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
        const { tile, bag: newBag, discard: newDiscard } = BagDomain.draw(currentBag, currentDiscard);
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
    const { tile: newTile, bag: newBag, discard: newDiscard } = BagDomain.draw(currentState.bag, updatedDiscard);
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

