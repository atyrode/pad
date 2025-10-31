# Bag Mechanics

This document explains the tile bag system, including creation, distribution, shuffling, and supply management.

## Bag Structure

### Bag Type Definition

The bag is a simple array of tiles:

```typescript
type Bag = TileData[];
```

Each `TileData` contains:
- `id`: Unique identifier (UUID)
- `value`: Letter or blank ("*" for blank tiles)
- `score`: Point value
- `originalValue?`: Stores "*" when blank is transformed
- `displayValue?`: The letter a blank represents

## Tile Distribution

### Standard Scrabble Distribution

The game uses standard Scrabble tile distribution in `TileSupply.ts`:

```typescript
const TILE_DISTRIBUTION: TileDistribution[] = [
    { tileId: 0, count: 2 },   // Blank tiles
    { tileId: 1, count: 9 },   // A
    { tileId: 2, count: 2 },   // B
    { tileId: 3, count: 2 },   // C
    // ... more entries
    { tileId: 26, count: 1 },  // Z
];
```

### Complete Distribution Table

| Letter | Count | Points | Letter | Count | Points |
|--------|-------|--------|--------|-------|--------|
| * (Blank) | 2 | 0 | N | 6 | 1 |
| A | 9 | 1 | O | 6 | 1 |
| B | 2 | 3 | P | 2 | 3 |
| C | 2 | 3 | Q | 1 | 10 |
| D | 4 | 2 | R | 6 | 1 |
| E | 12 | 1 | S | 4 | 1 |
| F | 2 | 4 | T | 6 | 1 |
| G | 3 | 2 | U | 4 | 1 |
| H | 2 | 4 | V | 2 | 4 |
| I | 9 | 1 | W | 2 | 4 |
| J | 1 | 8 | X | 1 | 8 |
| K | 1 | 5 | Y | 2 | 4 |
| L | 4 | 1 | Z | 1 | 10 |
| M | 2 | 3 | | | |

**Total Tiles**: 100 (98 letters + 2 blanks)

### Tile Definition System

Tiles are created using `tileDefinitions.ts`:

```typescript
interface TileDefinition {
    letter: string;
    score: number;
    id: number; // Internal ID for distribution
}

export const ALL_TILE_DEFINITIONS: TileDefinition[] = [
    { id: 0, letter: '*', score: 0 },    // Blank
    { id: 1, letter: 'A', score: 1 },
    { id: 2, letter: 'B', score: 3 },
    // ... all letters
];
```

## Bag Creation

### createStandard() Function

`Bag.createStandard()` generates a full bag:

```typescript
export function createStandard(): Bag {
    const bag: Bag = [];

    for (const { tileId, count } of TILE_DISTRIBUTION) {
        const tileDefinition = getTileDefinitionById(tileId);
        if (!tileDefinition) continue;

        for (let i = 0; i < count; i++) {
            bag.push({
                id: crypto.randomUUID(),
                value: tileDefinition.letter,
                score: tileDefinition.score,
            });
        }
    }

    return shuffle(bag);
}
```

### Bag Size Calculation

`fullSize()` returns total tiles:

```typescript
export function fullSize(): number {
    return TILE_DISTRIBUTION.reduce((total, tile) => total + tile.count, 0);
    // Returns 100
}
```

## Shuffling Algorithm

### Fisher-Yates Shuffle

`shuffle()` uses the Fisher-Yates algorithm:

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

### Shuffle Properties

- **Uniform Distribution**: Each tile has equal probability of ending up in any position
- **Immutability**: Returns new array, doesn't modify original
- **Performance**: O(n) time complexity
- **Cryptographic**: Uses `crypto.randomUUID()` for tile IDs

## Bag Operations

### Drawing Tiles

#### drawTileFromBag()

Removes and returns the top tile:

```typescript
function drawTileFromBag(bag: Bag): { tile: TileData | null; newBag: Bag } {
    if (bag.length === 0) {
        return { tile: null, newBag: bag };
    }

    const drawnTile = bag[0];
    const newBag = bag.slice(1);

    return { tile: drawnTile, newBag };
}
```

#### drawTile() with Refill

Automatically refills from discard when bag is empty:

```typescript
function drawTile(bag: Bag, discard: TileData[]): {
    tile: TileData | null;
    newBag: Bag;
    newDiscard: TileData[];
    didRefill: boolean;
} {
    const { newBag, newDiscard, didRefill } = refillBagFromDiscard(bag, discard);
    const { tile, newBag: updatedBag } = drawTileFromBag(newBag);

    return {
        tile,
        newBag: updatedBag,
        newDiscard,
        didRefill,
    };
}
```

### Refill from Discard

`refillBagFromDiscard()` handles bag depletion:

```typescript
function refillBagFromDiscard(bag: Bag, discard: TileData[]): {
    newBag: Bag;
    newDiscard: TileData[];
    didRefill: boolean;
} {
    if (bag.length === 0 && discard.length > 0) {
        return {
            newBag: Bag.shuffle([...discard]),
            newDiscard: [],
            didRefill: true,
        };
    }
    return {
        newBag: bag,
        newDiscard: discard,
        didRefill: false,
    };
}
```

## Drawing Operations

### drawOne()

Draws a single tile to the first available rack slot:

```typescript
export function drawOne(currentState: TileSupplyState): DrawResult | null {
    const slotIndex = findFirstEmptySlot(currentState.rack);
    if (slotIndex === null) return null; // No empty slots

    const { tile, newBag, newDiscard } = drawTile(currentState.bag, currentState.discard);
    if (!tile) return null; // No tiles available

    const newRack = [...currentState.rack];
    newRack[slotIndex] = tile;

    return {
        rack: newRack,
        bag: newBag,
        discard: newDiscard,
    };
}
```

### drawToFill()

Fills all empty rack slots:

```typescript
export function drawToFill(currentState: TileSupplyState): DrawResult {
    let rackWork = [...currentState.rack];
    let currentBag = currentState.bag;
    let currentDiscard = currentState.discard;

    while (true) {
        const slot = findFirstEmptySlot(rackWork);
        if (slot === null) break; // Rack is full

        const { tile, newBag, newDiscard } = drawTile(currentBag, currentDiscard);
        if (!tile) break; // No more tiles

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
```

### redraw()

Replaces all tiles in rack with new draws:

```typescript
export function redraw(currentState: TileSupplyState): DrawResult {
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
```

## Bag State in Game Flow

### Initial State

Game starts with empty bag:

```typescript
// In GameContext.tsx
function getInitialState(): GameState {
    return {
        // ...
        bag: [], // Empty until seeded from draft
        // ...
    };
}
```

### Draft Seeding

Bag is populated from draft selections:

```typescript
// In useSeedBagFromDraft
const draftedTiles = positions
    .map(p => draftBoard[p.row][p.col].tile)
    .filter(Boolean) as TileData[];

const newBag = Bag.shuffle([...draftedTiles]);
setBag(newBag);
```

### Game Progression

Bag depletes and refills throughout game:

1. **After Play**: `drawToFill()` replenishes rack
2. **Discard Operations**: Tiles move between rack, discard, bag
3. **Bag Depletion**: When bag empty, draws from discard pile
4. **Game End**: When no tiles remain in bag or discard

## Debug Operations

### Bag Manipulation

Debug menu provides bag controls:

```typescript
// Reset bag to full standard distribution
setBag(Bag.createStandard());

// Shuffle current bag
setBag(Bag.shuffle(state.bag));

// Clear bag
setBag([]);
```

## Bag Statistics

### Tile Counting

`getTileCounts()` could track distribution:

```typescript
function getTileCounts(bag: Bag): Map<string, number> {
    const counts = new Map<string, number>();
    for (const tile of bag) {
        const letter = tile.value;
        counts.set(letter, (counts.get(letter) || 0) + 1);
    }
    return counts;
}
```

### Bag State Queries

```typescript
export function getBagSize(bag: Bag): number {
    return bag.length;
}

export function isBagEmpty(bag: Bag): boolean {
    return bag.length === 0;
}

export function getRemainingTiles(bag: Bag, discard: TileData[]): number {
    return bag.length + discard.length;
}
```

## Error Handling

### Invalid Operations

- **Empty Bag**: Drawing returns `null` tile
- **Full Rack**: `drawOne()` returns `null`
- **Invalid Tiles**: Distribution validation prevents bad tiles

### Recovery Mechanisms

- **Bag Depletion**: Automatic refill from discard
- **State Validation**: Operations check for valid state
- **Debug Tools**: Manual bag manipulation for testing

## Performance Considerations

### Shuffle Efficiency

- **Algorithm**: Fisher-Yates is O(n) and efficient
- **Frequency**: Shuffling only occurs during creation and refill
- **Memory**: Creates new array copies for immutability

### Drawing Performance

- **Single Draw**: O(1) - just shift from array
- **Bulk Draw**: O(k) where k is number of tiles drawn
- **Refill**: O(n) for shuffling discard pile

## Refactoring Opportunities

1. **Distribution Config**: Make tile distribution configurable
2. **Bag Analytics**: Add functions to analyze bag composition
3. **Weighted Drawing**: Support for non-uniform tile distributions
4. **Bag Persistence**: Save/restore bag state between sessions
5. **Tile Types**: Support for special tile types beyond blanks
6. **Multi-bag**: Support for multiple tile bags in multiplayer

The bag system provides reliable tile supply management with proper randomization and automatic resource management.
