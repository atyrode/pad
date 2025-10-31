import { RackState } from '../types/rack';

export const RACK_SIZE = 7;

/**
 * Create an empty rack with the standard size
 */
export function createInitialRack(): RackState {
    return Array(RACK_SIZE).fill(null);
}

/**
 * Check if a string ID represents a rack slot
 */
export function isRackSlotId(id: string): boolean {
    return id.startsWith('rack-');
}

/**
 * Parse a rack slot ID string to extract the index
 */
export function parseRackSlotId(id: string): number | null {
    if (!isRackSlotId(id)) return null;
    
    const [, indexStr] = id.split('-');
    const index = parseInt(indexStr);
    return isNaN(index) ? null : index;
}

/**
 * Shuffle tiles in the rack using Fisher-Yates algorithm
 */
export function shuffleRack(rack: RackState): RackState {
    // Extract all non-null tiles
    const tiles = rack.filter(tile => tile !== null);
    
    // Shuffle the tiles using Fisher-Yates algorithm
    for (let i = tiles.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
    }
    
    // Create new rack with shuffled tiles placed from left to right
    const newRack: RackState = new Array(rack.length).fill(null);
    for (let i = 0; i < tiles.length; i++) {
        newRack[i] = tiles[i];
    }
    
    return newRack;
}
