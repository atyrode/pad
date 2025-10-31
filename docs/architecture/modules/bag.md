# Bag Domain Module

This document describes the Bag domain module, which encapsulates all bag-related operations in a single, self-contained API.

## Overview

The Bag module (`src/domain/bag/Bag.ts`) provides a clean, immutable API for all bag operations. It replaces the scattered bag utilities that were previously in `src/engine/TileSupply.ts`.

## API

### Creation and Sizing

#### `createStandard(): Bag`
Create a new tile bag with standard Scrabble distribution.

```typescript
const bag = Bag.createStandard();
// Creates bag with 100 tiles (2 blanks, 98 letters)
```

#### `fullSize(): number`
Get the total number of tiles in a full bag.

```typescript
const totalTiles = Bag.fullSize(); // Returns 100
```

### Shuffling

#### `shuffle(bag: Bag): Bag`
Shuffle a bag using Fisher-Yates algorithm.

```typescript
const shuffledBag = Bag.shuffle(bag);
```

### Drawing Operations

#### `drawOne(bag: Bag): { tile: TileData | null; bag: Bag }`
Draw a single tile from the bag (without refilling from discard).

```typescript
const { tile, bag: newBag } = Bag.drawOne(bag);
if (tile) {
    // Got a tile
} else {
    // Bag is empty
}
```

#### `draw(bag: Bag, discard: TileData[]): { tile: TileData | null; bag: Bag; discard: TileData[]; didRefill: boolean }`
Draw a tile from the bag, automatically refilling from discard if needed.

```typescript
const { tile, bag: newBag, discard: newDiscard, didRefill } = Bag.draw(bag, discard);
if (didRefill) {
    // Bag was refilled from discard pile
}
```

#### `refillFromDiscard(bag: Bag, discard: TileData[]): { bag: Bag; discard: TileData[]; didRefill: boolean }`
Refill the bag from the discard pile if the bag is empty.

```typescript
const { bag: refilledBag, discard: emptyDiscard, didRefill } = Bag.refillFromDiscard(bag, discard);
```

## Invariants

- **Immutability**: All operations return new bag states; input bags are never modified
- **Pure Functions**: No side effects, deterministic results
- **Type Safety**: All operations are strongly typed with Bag and TileData

## Usage Examples

### Basic Operations
```typescript
import * as Bag from "src/domain/bag/Bag";

// Create and shuffle a bag
let bag = Bag.createStandard();
bag = Bag.shuffle(bag);

// Draw tiles
const { tile, bag: bagAfterDraw } = Bag.drawOne(bag);
if (!tile) {
    // Bag is empty
}

// Draw with auto-refill from discard
const { tile: drawnTile, bag: finalBag, discard: finalDiscard } =
    Bag.draw(bagAfterDraw, currentDiscard);
```

### Integration with TileSupply
```typescript
// In TileSupply.ts
import * as BagDomain from "../domain/bag/Bag";

export function drawToFill(currentState: TileSupplyState): DrawResult {
    // ... rack logic ...
    const { tile, bag: newBag, discard: newDiscard } = BagDomain.draw(currentBag, currentDiscard);
    // ... combine with rack operations ...
}
```

### Game State Management
```typescript
// In game logic
const initialBag = Bag.createStandard();
const shuffledBag = Bag.shuffle(initialBag);

// During play
const { tile, bag: updatedBag } = Bag.drawOne(currentBag);
```

## Tile Distribution

The standard bag contains 100 tiles with the following distribution:

| Letter | Count | Points | Letter | Count | Points |
|--------|-------|--------|--------|-------|--------|
| Blank  | 2     | 0      | J      | 1     | 8      |
| E      | 15    | 1      | Q      | 1     | 10     |
| A      | 9     | 1      | K      | 1     | 5      |
| I      | 8     | 1      | W      | 1     | 4      |
| N      | 6     | 1      | X      | 1     | 8      |
| O      | 6     | 1      | Y      | 1     | 4      |
| R      | 6     | 1      | Z      | 1     | 10     |
| S      | 6     | 1      |        |        |        |
| T      | 6     | 1      |        |        |        |
| U      | 6     | 1      |        |        |        |
| L      | 5     | 1      |        |        |        |
| D      | 3     | 2      |        |        |        |
| M      | 3     | 3      |        |        |        |
| G      | 2     | 2      |        |        |        |
| B      | 2     | 3      |        |        |        |
| C      | 2     | 3      |        |        |        |
| P      | 2     | 3      |        |        |        |
| F      | 2     | 4      |        |        |        |
| H      | 2     | 4      |        |        |        |
| V      | 2     | 4      |        |        |        |

## Migration Notes

This module replaces the bag-related functions that were previously in `src/engine/TileSupply.ts`. All function names follow a consistent API:

| Old Function | New Function | Notes |
|--------------|--------------|-------|
| `createTileBag()` | `Bag.createStandard()` | Renamed for clarity |
| `shuffleBag()` | `Bag.shuffle()` | Same behavior |
| `getFullBagSize()` | `Bag.fullSize()` | Same behavior |
| `drawTileFromBag()` | `Bag.drawOne()` | Renamed for clarity |
| `drawTile()` | `Bag.draw()` | Renamed for clarity |
| `refillBagFromDiscard()` | `Bag.refillFromDiscard()` | Same behavior |

## Implementation Details

### Shuffling Algorithm
The `shuffle` function uses the Fisher-Yates algorithm for uniform randomness:

```typescript
export function shuffle(bag: Bag): Bag {
    const shuffled = [...bag];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}
```

### Draw with Refill Logic
The `draw` function automatically handles the refill cycle:

1. If bag has tiles: draw directly
2. If bag is empty and discard has tiles: shuffle discard into bag, then draw
3. If both are empty: return null tile

This ensures the game can continue as long as there are tiles available anywhere in the system.
