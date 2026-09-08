import { RackState } from '../types/rack';

export const RACK_SIZE = 7;

export function createInitialRack(): RackState {
    return Array(RACK_SIZE).fill(null);
}

export function findTileInRack(rack: RackState, tileId: string): number | null {
    for (let i = 0; i < rack.length; i++) {
        if (rack[i]?.id === tileId) {
            return i;
        }
    }
    return null;
}

export function isRackSlotId(id: string): boolean {
    return id.startsWith('rack-');
}

export function parseRackSlotId(id: string): number | null {
    if (!isRackSlotId(id)) return null;
    
    const [, indexStr] = id.split('-');
    const index = parseInt(indexStr);
    return isNaN(index) ? null : index;
}

export function findFirstEmptySlot(rack: RackState): number | null {
    for (let i = 0; i < rack.length; i++) {
        if (rack[i] === null) {
            return i;
        }
    }
    return null;
}

export function shuffleRack(rack: RackState, random: () => number): RackState {
    // Extract all non-null tiles
    const tiles = rack.filter(tile => tile !== null);
    
    // Shuffle the tiles using Fisher-Yates algorithm
    for (let i = tiles.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
    }
    
    // Create new rack with shuffled tiles placed from left to right
    const newRack: RackState = new Array(rack.length).fill(null);
    for (let i = 0; i < tiles.length; i++) {
        newRack[i] = tiles[i];
    }
    
    return newRack;
}

