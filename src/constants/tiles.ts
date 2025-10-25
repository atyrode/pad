/**
 * Tile distribution constants
 * Defines the available tiles and their properties
 */

/**
 * Tile styling constants
 * Defines visual properties for tiles
 */
export const TILE_STYLING = {
  // Border radius for tiles (in Tailwind classes)
  BORDER_RADIUS: 'rounded-sm',
} as const;

import { Tile, createTile } from '../game/mechanics/tile';

export interface TileDistribution {
  letter: string;
  score: number;
  count: number;
  effect?: string;
}

/**
 * Simple tile distribution for testing, based on https://imgur.com/a/scrabble-ntFIpED, from https://www.reddit.com/r/scrabble/comments/1ejuh0j/comment/lgic9tn/
 * A-Z with placeholder scores (you can customize this later)
 */
export const TILE_DISTRIBUTION: TileDistribution[] = [
  // Vowels with lower scores
  { letter: 'A', score: 1, count: 9 },
  { letter: 'E', score: 1, count: 11 },
  { letter: 'I', score: 1, count: 7 },
  { letter: 'O', score: 1, count: 8 },
  { letter: 'U', score: 1, count: 4 },
  
  // Common consonants
  { letter: 'N', score: 1, count: 5 },
  { letter: 'R', score: 1, count: 5 },
  { letter: 'T', score: 1, count: 6 },
  { letter: 'L', score: 1, count: 4 },
  { letter: 'S', score: 1, count: 5 },
  { letter: 'D', score: 2, count: 4 },
  { letter: 'G', score: 2, count: 3 },
  
  // Less common letters
  { letter: 'B', score: 3, count: 2 },
  { letter: 'C', score: 3, count: 2 },
  { letter: 'M', score: 3, count: 3 },
  { letter: 'P', score: 3, count: 3 },
  { letter: 'F', score: 4, count: 2 },
  { letter: 'H', score: 4, count: 3 },
  { letter: 'V', score: 5, count: 2 },
  { letter: 'W', score: 4, count: 2 },
  { letter: 'Y', score: 4, count: 2 },
  
  // High-value letters
  { letter: 'K', score: 5, count: 2 },
  { letter: 'J', score: 8, count: 1 },
  { letter: 'X', score: 8, count: 1 },
  { letter: 'Q', score: 10, count: 1 },
  { letter: 'Z', score: 8, count: 1 },
  
  // Blank tiles (wildcards)
  { letter: '*', score: 0, count: 2, effect: 'blank' },
];

/**
 * Create a full set of tiles from the distribution
 * Returns an array of individual Tile objects
 */
export function createTileDistribution(): Tile[] {
  const tiles: Tile[] = [];
  
  for (const distribution of TILE_DISTRIBUTION) {
    for (let i = 0; i < distribution.count; i++) {
      tiles.push(createTile(
        distribution.letter,
        distribution.score,
        distribution.effect
      ));
    }
  }
  
  return tiles;
}

/**
 * Get the total number of tiles in the distribution
 */
export function getTotalTileCount(): number {
  return TILE_DISTRIBUTION.reduce((total, tile) => total + tile.count, 0);
}

/**
 * Get tiles by letter (useful for debugging or specific queries)
 */
export function getTilesByLetter(letter: string): TileDistribution[] {
  return TILE_DISTRIBUTION.filter(tile => tile.letter === letter);
}

/**
 * Get tiles by score range (useful for analysis)
 */
export function getTilesByScoreRange(minScore: number, maxScore: number): TileDistribution[] {
  return TILE_DISTRIBUTION.filter(tile => tile.score >= minScore && tile.score <= maxScore);
}
