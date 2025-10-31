# Drawing Mechanics

This document explains the tile drawing system, including single draws, bulk fills, redraws, and automatic bag management.

## Drawing Overview

The drawing system manages the flow of tiles from bag to rack, with automatic refill from the discard pile when the bag is depleted.

## Core Drawing Functions

### Single Tile Draw: drawOne()

Draws one tile and places it in the first available rack slot:

```typescript
export function drawOne(currentState: TileSupplyState): DrawResult | null {
    const slotIndex = findFirstEmptySlot(currentState.rack);
    if (slotIndex === null) return null; // No empty slots available

    const { tile, newBag, newDiscard } = drawTile(currentState.bag, currentState.discard);
    if (!tile) return null; // No tiles available in bag or discard

    const newRack = [...currentState.rack];
    newRack[slotIndex] = tile;

    return {
        rack: newRack,
        bag: newBag,
        discard: newDiscard,
    };
}
```

### Fill Rack: drawToFill()

Fills all empty rack slots with tiles from bag/discard:

```typescript
export function drawToFill(currentState: TileSupplyState): DrawResult {
    let rackWork = [...currentState.rack];
    let currentBag = currentState.bag;
    let currentDiscard = currentState.discard;

    while (true) {
        const slot = findFirstEmptySlot(rackWork);
        if (slot === null) break; // Rack is full

        const { tile, newBag, newDiscard } = drawTile(currentBag, currentDiscard);
        if (!tile) break; // No more tiles available

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

### Redraw: redraw()

Replaces all tiles in rack with new draws (maintains tile count):

```typescript
export function redraw(currentState: TileSupplyState): DrawResult {
    const currentTileCount = currentState.rack.filter(t => t !== null).length;
    let currentBag = currentState.bag;
    let currentDiscard = currentState.discard;
    const newRack: RackState = Array(currentState.rack.length).fill(null);

    for (let i = 0; i < currentTileCount; i++) {
        const { tile, newBag, newDiscard } = drawTile(currentBag, currentDiscard);
        if (!tile) break; // Stop if no more tiles available

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

## Bag Refill Logic

### drawTile() with Auto-Refill

The core drawing function automatically manages bag depletion:

```typescript
function drawTile(bag: Bag, discard: TileData[]): {
    tile: TileData | null;
    newBag: Bag;
    newDiscard: TileData[];
    didRefill: boolean;
} {
    // First, refill bag from discard if empty
    const { newBag, newDiscard, didRefill } = refillBagFromDiscard(bag, discard);

    // Then draw from (possibly refilled) bag
    const { tile, newBag: updatedBag } = drawTileFromBag(newBag);

    return {
        tile,
        newBag: updatedBag,
        newDiscard,
        didRefill,
    };
}
```

### refillBagFromDiscard()

Handles automatic bag replenishment:

```typescript
function refillBagFromDiscard(bag: Bag, discard: TileData[]): {
    newBag: Bag;
    newDiscard: TileData[];
    didRefill: boolean;
} {
    if (bag.length === 0 && discard.length > 0) {
        return {
            newBag: shuffleBag([...discard]), // Shuffle discarded tiles
            newDiscard: [],                     // Empty discard pile
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

## Drawing in Game Flow

### After Play Resolution

Rack is automatically filled after each play:

```typescript
// In PlayResolution.resolvePlay()
const tileSupplyResult = TileSupply.drawToFill({
    rack: args.rack,
    bag: args.bag,
    discard: args.discard,
});

return {
    // ... other results
    board: lockedBoard,
    rack: tileSupplyResult.rack,
    bag: tileSupplyResult.bag,
    discard: tileSupplyResult.discard,
};
```

### Manual Drawing (Debug)

Debug menu allows manual drawing:

```typescript
// Draw one tile
const result = TileSupply.drawOne({
    rack: state.rack,
    bag: state.bag,
    discard: state.discard,
});
if (result) {
    setRack(result.rack);
    setBag(result.bag);
    setDiscard(result.discard);
}

// Draw to fill rack
const result = TileSupply.drawToFill({
    rack: state.rack,
    bag: state.bag,
    discard: state.discard,
});
setRack(result.rack);
setBag(result.bag);
setDiscard(result.discard);
```

## Discard and Draw Operations

### discardAndDraw()

Discards a tile and immediately draws a replacement:

```typescript
export function discardAndDraw(
    tile: TileData,
    sourceRackIndex: number | null,
    currentState: TileSupplyState
): DiscardAndDrawResult | null {
    // Remove tile from rack if it was there
    let updatedRack = [...currentState.rack];
    if (sourceRackIndex !== null) {
        updatedRack[sourceRackIndex] = null;
    }

    // Add tile to discard
    const updatedDiscard = [...currentState.discard, tile];

    // Determine target slot for drawing
    const slotIndex = sourceRackIndex !== null
        ? sourceRackIndex  // Replace in same slot
        : findFirstEmptySlot(updatedRack);

    if (slotIndex === null) {
        return {
            rack: updatedRack,
            bag: currentState.bag,
            discard: updatedDiscard,
            drawnSlot: null,
        };
    }

    // Draw new tile using updated discard
    const { tile: newTile, newBag, newDiscard } = drawTile(currentState.bag, updatedDiscard);
    if (!newTile) {
        return {
            rack: updatedRack,
            bag: currentState.bag,
            discard: updatedDiscard,
            drawnSlot: null,
        };
    }

    // Place new tile in target slot
    updatedRack[slotIndex] = newTile;

    return {
        rack: updatedRack,
        bag: newBag,
        discard: newDiscard,
        drawnSlot: slotIndex,
    };
}
```

## Drawing Rules and Constraints

### Rack Capacity

- **Standard Rack**: 7 slots maximum
- **Empty Slots**: Drawing fills empty slots first
- **Full Rack**: `drawOne()` returns `null` when rack is full

### Tile Availability

- **Bag Priority**: Draws from bag first
- **Auto-Refill**: When bag empties, automatically shuffles discard pile
- **Exhaustion**: When both bag and discard are empty, drawing stops

### Redraw Behavior

- **Tile Count Preservation**: Maintains same number of tiles in rack
- **Position Reset**: Places drawn tiles in order (indices 0, 1, 2, ...)
- **Empty Slot Consolidation**: Empty slots move to end of rack

## Drawing in Different Game Phases

### Draft Mode

No automatic drawing during draft mode - tiles come from suggestions.

### Game Mode

- **After Play**: `drawToFill()` called automatically
- **Manual Operations**: Debug drawing available
- **Discard Operations**: `discardAndDraw()` for tile replacement

### Game End Conditions

Drawing stops when:
- Rack is full (7 tiles)
- No tiles remain in bag or discard
- Game ends due to other conditions

## Performance Characteristics

### Time Complexity

- **drawOne()**: O(1) - constant time draw and rack update
- **drawToFill()**: O(k) where k ≤ 7 (rack slots)
- **redraw()**: O(n) where n is current tile count
- **discardAndDraw()**: O(1) - similar to single draw

### Memory Usage

- **Immutability**: Each operation creates new arrays
- **Garbage Collection**: Old state objects are collected
- **Peak Usage**: Temporary arrays during shuffle operations

## Error Handling

### Invalid States

- **Full Rack**: Graceful handling with `null` returns
- **Empty Supplies**: Drawing functions return `null` when no tiles available
- **Index Bounds**: Rack operations validate indices

### Recovery Mechanisms

- **State Validation**: Operations check preconditions
- **Fallback Behavior**: Return current state when operations fail
- **Debug Tools**: Manual state manipulation for testing

## Debug and Testing

### Debug Drawing Operations

```typescript
// In useGameController debug actions
onDraw: () => {
    const result = TileSupply.drawOne({
        rack: state.rack,
        bag: state.bag,
        discard: state.discard,
    });
    if (!result) return;
    setRack(result.rack);
    setBag(result.bag);
    setDiscard(result.discard);
},

onDrawAll: () => {
    const result = TileSupply.drawToFill({
        rack: state.rack,
        bag: state.bag,
        discard: state.discard,
    });
    setRack(result.rack);
    setBag(result.bag);
    setDiscard(result.discard);
},

onRedraw: () => {
    const result = TileSupply.redraw({
        rack: state.rack,
        bag: state.bag,
        discard: state.discard,
    });
    setRack(result.rack);
    setBag(result.bag);
    setDiscard(result.discard);
},
```

## Refactoring Opportunities

1. **Drawing Strategies**: Support different drawing algorithms
2. **Rack Size Config**: Make rack size configurable
3. **Drawing Limits**: Add per-turn drawing limits
4. **Tile Preview**: Show next tiles without drawing
5. **Drawing Animation**: Visual feedback for tile draws
6. **Bulk Operations**: Batch multiple draw operations

The drawing system provides reliable tile supply management with automatic resource cycling and comprehensive error handling.
