import { RackState } from '../types/rack';
import { Bag } from '../types/bag';
import { TileData } from '../types/tile';
import { drawTile } from '../utils/bagUtils';
import { findFirstEmptySlot } from '../utils/rackUtils';

export interface TileSupplyState {
    rack: RackState;
    bag: Bag;
    discard: TileData[];
}

export interface DrawOneResult {
    rack: RackState;
    bag: Bag;
    discard: TileData[];
}

export interface DiscardAndDrawResult {
    rack: RackState;
    bag: Bag;
    discard: TileData[];
    drawnSlot: number | null;
}

/**
 * Centralized service for managing tile supply operations (bag, rack, discard).
 * All methods are pure functions that take current state and return new state.
 */
export class TileSupplyService {
    /**
     * Draws one tile and places it in the first available rack slot.
     * Returns null if no empty slot is available or bag/discard are empty.
     */
    static drawOne(currentState: TileSupplyState): DrawOneResult | null {
        const slotIndex = findFirstEmptySlot(currentState.rack);
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
     * Fills all empty slots in the rack until no more tiles are available
     * or all slots are filled.
     */
    static drawToFill(currentState: TileSupplyState): DrawOneResult {
        let rackWork = [...currentState.rack];
        let currentBag = currentState.bag;
        let currentDiscard = currentState.discard;

        while (true) {
            const slot = findFirstEmptySlot(rackWork);
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
     * Replaces all tiles currently in the rack with new tiles drawn from the bag.
     * Maintains the same number of tiles that were in the rack before.
     */
    static redraw(currentState: TileSupplyState): DrawOneResult {
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
     * Discards a tile (removes it from rack or board position) and immediately
     * draws a new tile to replace it in the rack.
     * 
     * @param tile - The tile to discard
     * @param sourceRackIndex - The rack index where the tile was removed from (null if from board)
     * @param currentState - Current bag/rack/discard state
     * @returns New state with tile discarded and new tile drawn, or null if couldn't draw
     */
    static discardAndDraw(
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
            : findFirstEmptySlot(updatedRack);

        if (slotIndex === null) {
            // Rack is full, just discard without drawing
            return {
                rack: updatedRack,
                bag: currentState.bag,
                discard: updatedDiscard,
                drawnSlot: null,
            };
        }

        // Draw new tile using the updated discard (that includes the just-discarded tile)
        const { tile: newTile, newBag, newDiscard } = drawTile(currentState.bag, updatedDiscard);
        if (!newTile) {
            // Couldn't draw, just return with discard updated
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
}

