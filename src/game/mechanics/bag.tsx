/**
 * Tile bag mechanics
 * Manages the collection of tiles that players draw from
 */

import { Tile, createTile } from './tile';

export class TileBag {
  private tiles: Tile[];

  constructor(initialTiles: Tile[] = []) {
    this.tiles = [...initialTiles]; // Create a copy to avoid mutations
  }

  /**
   * Draw a specified number of tiles from the bag
   * Returns an array of drawn tiles (may be less than requested if bag is empty)
   */
  draw(count: number): Tile[] {
    console.log(`1. Bag has ${this.tiles.length} tiles remaining`);
    console.log(`2. Drawing ${count} tiles from bag`);
    console.log(`3. Content: ${this.tiles.map(t => t.letter).join(', ')}`);

    const drawnTiles: Tile[] = [];
    const actualCount = Math.min(count, this.tiles.length);
    
    for (let i = 0; i < actualCount; i++) {
      const tile = this.tiles.pop();
      console.log(`Drawn tile: ${tile?.letter}`);
      if (tile) {
        drawnTiles.push(tile);
      }
    }

    console.log(`5. Bag has ${this.tiles.length} tiles remaining`);
    
    return drawnTiles;
  }

  /**
   * Draw a single tile from the bag
   * Returns the tile or null if bag is empty
   */
  drawOne(): Tile | null {
    const tiles = this.draw(1);
    return tiles.length > 0 ? tiles[0] : null;
  }

  /**
   * Return tiles to the bag
   * Tiles are added to the bottom of the bag (not shuffled in)
   */
  return(tiles: Tile[]): void {
    this.tiles.unshift(...tiles);
  }

  /**
   * Shuffle the tiles in the bag randomly
   */
  shuffle(): void {
    for (let i = this.tiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.tiles[i], this.tiles[j]] = [this.tiles[j], this.tiles[i]];
    }
  }

  /**
   * Get the number of tiles remaining in the bag
   */
  remaining(): number {
    return this.tiles.length;
  }

  /**
   * Check if the bag is empty
   */
  isEmpty(): boolean {
    return this.tiles.length === 0;
  }

  /**
   * Peek at the remaining tiles (for debugging)
   * Returns a copy of the tiles array
   */
  peek(): Tile[] {
    return [...this.tiles];
  }

  /**
   * Add tiles to the bag (useful for initialization)
   */
  addTiles(tiles: Tile[]): void {
    this.tiles.push(...tiles);
  }

  /**
   * Clear all tiles from the bag
   */
  clear(): void {
    this.tiles = [];
  }

  /**
   * Get a snapshot of the bag's current state
   */
  getState(): { remaining: number; tiles: Tile[] } {
    return {
      remaining: this.remaining(),
      tiles: this.peek(),
    };
  }
}
