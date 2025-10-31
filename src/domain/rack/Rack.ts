import { RackState } from '../../types/rack';
import { TileData } from '../../types/tile';
import { RACK_SIZE } from '../../constants/rack';

/**
 * Rack domain module - Pure, immutable rack operations
 *
 * This module provides all rack-related functionality in a centralized,
 * self-contained way. All operations are pure and return new rack states.
 */

/**
 * Create an empty rack with the standard size
 */
export function createEmpty(size = RACK_SIZE): RackState {
    return Array(size).fill(null);
}

/**
 * Find the first empty slot in the rack
 */
export function firstEmpty(rack: RackState): number | null {
    for (let i = 0; i < rack.length; i++) {
        if (rack[i] === null) {
            return i;
        }
    }
    return null;
}

/**
 * Count the number of tiles in the rack
 */
export function count(rack: RackState): number {
    return rack.filter(tile => tile !== null).length;
}

/**
 * Check if the rack is full
 */
export function isFull(rack: RackState): boolean {
    return count(rack) === rack.length;
}

/**
 * Get all valid rack indices
 */
export function indices(rack: RackState): number[] {
    return Array.from({ length: rack.length }, (_, i) => i);
}

/**
 * Add a tile to a specific rack index
 */
export function addAt(rack: RackState, index: number, tile: TileData): RackState {
    const newRack = [...rack];
    if (index >= 0 && index < rack.length) {
        newRack[index] = tile;
    }
    return newRack;
}

/**
 * Remove a tile from a specific rack index
 */
export function removeAt(rack: RackState, index: number): RackState {
    const newRack = [...rack];
    if (index >= 0 && index < rack.length) {
        newRack[index] = null;
    }
    return newRack;
}

/**
 * Swap two tiles in the rack
 */
export function swap(rack: RackState, index1: number, index2: number): RackState {
    const newRack = [...rack];
    if (index1 >= 0 && index1 < rack.length && index2 >= 0 && index2 < rack.length) {
        const tile1 = newRack[index1];
        const tile2 = newRack[index2];
        newRack[index1] = tile2;
        newRack[index2] = tile1;
    }
    return newRack;
}

/**
 * Find a tile in the rack by ID
 */
export function findById(rack: RackState, tileId: string): number | null {
    for (let i = 0; i < rack.length; i++) {
        if (rack[i]?.id === tileId) {
            return i;
        }
    }
    return null;
}

/**
 * Shuffle tiles in the rack using Fisher-Yates algorithm
 */
export function shuffle(rack: RackState): RackState {
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
