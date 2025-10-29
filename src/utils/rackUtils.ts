import { RackState } from '../types/rack';
import { TileData } from '../types/tile';

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

export function moveTileToRack(rack: RackState, tile: TileData, index: number): RackState {
    const newRack = [...rack];
    if (index >= 0 && index < RACK_SIZE) {
        newRack[index] = tile;
    }
    return newRack;
}

export function removeTileFromRack(rack: RackState, index: number): RackState {
    const newRack = [...rack];
    if (index >= 0 && index < RACK_SIZE) {
        newRack[index] = null;
    }
    return newRack;
}

export function swapRackTiles(rack: RackState, index1: number, index2: number): RackState {
    const newRack = [...rack];
    if (index1 >= 0 && index1 < RACK_SIZE && index2 >= 0 && index2 < RACK_SIZE) {
        const tile1 = newRack[index1];
        const tile2 = newRack[index2];
        newRack[index1] = tile2;
        newRack[index2] = tile1;
    }
    return newRack;
}

export function findFirstEmptySlot(rack: RackState): number | null {
    for (let i = 0; i < rack.length; i++) {
        if (rack[i] === null) {
            return i;
        }
    }
    return null;
}

export function shuffleRack(rack: RackState): RackState {
    const newRack = [...rack];
    // Fisher-Yates shuffle algorithm
    for (let i = newRack.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newRack[i], newRack[j]] = [newRack[j], newRack[i]];
    }
    return newRack;
}

