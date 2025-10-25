/**
 * Tile mechanics and utilities
 * Core tile structure and helper functions for game tiles
 */

export interface Tile {
  id: string;
  letter: string;
  score: number;
  effect?: string; // For special tiles like blanks, power-ups, etc.
}

/**
 * Create a new tile with a unique ID
 */
export function createTile(letter: string, score: number, effect?: string): Tile {
  return {
    id: crypto.randomUUID(),
    letter,
    score,
    effect,
  };
}

/**
 * Check if a tile is a blank/wildcard tile
 */
export function isBlankTile(tile: Tile): boolean {
  return tile.letter === '' || tile.effect === 'blank';
}

/**
 * Get the display value for a tile (handles blank tiles with assigned letters)
 */
export function getTileDisplay(tile: Tile): string {
  if (isBlankTile(tile)) {
    // For blank tiles, show the assigned letter or a placeholder
    return tile.letter || '?';
  }
  return tile.letter;
}

/**
 * Create an immutable copy of a tile with optional modifications
 */
export function cloneTile(tile: Tile, modifications?: Partial<Omit<Tile, 'id'>>): Tile {
  return {
    ...tile,
    ...modifications,
    id: crypto.randomUUID(), // Always generate new ID for cloned tiles
  };
}

/**
 * Check if two tiles are equal (ignoring ID)
 */
export function tilesEqual(tile1: Tile, tile2: Tile): boolean {
  return (
    tile1.letter === tile2.letter &&
    tile1.score === tile2.score &&
    tile1.effect === tile2.effect
  );
}

/**
 * Get a string representation of a tile for debugging
 */
export function tileToString(tile: Tile): string {
  const effectStr = tile.effect ? ` (${tile.effect})` : '';
  return `${tile.letter}(${tile.score})${effectStr}`;
}
