# Rack Domain Module

This document describes the Rack domain module, which encapsulates all rack-related operations in a single, self-contained API.

## Overview

The Rack module (`src/domain/rack/Rack.ts`) provides a clean, immutable API for all rack operations. It replaces the scattered utilities that were previously in `src/utils/rackUtils.ts`.

## API

### Core Operations

#### `createEmpty(size?: number): RackState`
Create an empty rack with the standard size (7) or a custom size.

```typescript
const rack = Rack.createEmpty(); // Creates rack with 7 empty slots
const customRack = Rack.createEmpty(5); // Creates rack with 5 empty slots
```

#### `firstEmpty(rack: RackState): number | null`
Find the index of the first empty slot in the rack.

```typescript
const emptyIndex = Rack.firstEmpty(rack);
if (emptyIndex !== null) {
    // Slot at emptyIndex is available
}
```

#### `count(rack: RackState): number`
Get the number of tiles currently in the rack.

```typescript
const tileCount = Rack.count(rack);
```

#### `isFull(rack: RackState): boolean`
Check if the rack is completely full.

```typescript
if (Rack.isFull(rack)) {
    // Rack has no empty slots
}
```

#### `indices(rack: RackState): number[]`
Get all valid rack indices.

```typescript
const allIndices = Rack.indices(rack); // [0, 1, 2, 3, 4, 5, 6] for standard rack
```

### Mutation Operations

All mutation operations return new rack states (immutable).

#### `addAt(rack: RackState, index: number, tile: TileData): RackState`
Add a tile to a specific rack position.

```typescript
const newRack = Rack.addAt(rack, 3, tile);
```

#### `removeAt(rack: RackState, index: number): RackState`
Remove a tile from a specific rack position.

```typescript
const newRack = Rack.removeAt(rack, 2);
```

#### `swap(rack: RackState, index1: number, index2: number): RackState`
Swap tiles between two rack positions.

```typescript
const newRack = Rack.swap(rack, 1, 4);
```

### Query Operations

#### `findById(rack: RackState, tileId: string): number | null`
Find the rack index of a tile by its ID.

```typescript
const rackIndex = Rack.findById(rack, "tile-123");
if (rackIndex !== null) {
    // Tile found at rackIndex
}
```

#### `shuffle(rack: RackState): RackState`
Shuffle all tiles in the rack using Fisher-Yates algorithm.

```typescript
const shuffledRack = Rack.shuffle(rack);
```

## Invariants

- **Immutability**: All operations return new rack states; input racks are never modified
- **Bounds Checking**: Operations validate indices and return unchanged racks for invalid inputs
- **Type Safety**: All operations are strongly typed with RackState
- **Pure Functions**: No side effects, deterministic results

## Usage Examples

### Basic Operations
```typescript
import * as Rack from "src/domain/rack/Rack";

// Create and populate a rack
let rack = Rack.createEmpty();
rack = Rack.addAt(rack, 0, tileA);
rack = Rack.addAt(rack, 1, tileB);

// Check status
const hasSpace = Rack.firstEmpty(rack) !== null;
const isComplete = Rack.isFull(rack);

// Find tiles
const position = Rack.findById(rack, tileId);

// Shuffle for variety
rack = Rack.shuffle(rack);
```

### Integration with Engine
```typescript
// In TileOperations.ts
import * as Rack from "../domain/rack/Rack";

export function placeTileOnBoardFromRack(...) {
    // Remove from rack
    let newRack = Rack.removeAt(rack, rackIndex);

    // Handle swaps
    if (swappedTile) {
        newRack = Rack.addAt(newRack, rackIndex, swappedTile);
    }

    return { rack: newRack, ... };
}
```

### Component Usage
```typescript
// In components
import * as Rack from "../domain/rack/Rack";

function MyComponent({ rack }: { rack: RackState }) {
    const canShuffle = Rack.count(rack) > 1;
    const hasEmptySlots = Rack.firstEmpty(rack) !== null;

    return (
        <div>
            {canShuffle && <ShuffleButton />}
            {hasEmptySlots && <DrawButton />}
        </div>
    );
}
```

## Selectors

Convenient selectors are provided in `src/state/selectors.ts`:

```typescript
import { rackTileCountSelector, isRackFullSelector, hasEmptySlotSelector } from "../state/selectors";

// These use the Rack API internally
const tileCount = rackTileCountSelector(rack);
const isFull = isRackFullSelector(rack);
const hasEmpty = hasEmptySlotSelector(rack);
```

## Migration Notes

This module replaces the previous `src/utils/rackUtils.ts` utilities. All function names follow a consistent API:

| Old Function | New Function | Notes |
|--------------|--------------|-------|
| `createInitialRack()` | `Rack.createEmpty()` | Same behavior |
| `findFirstEmptySlot()` | `Rack.firstEmpty()` | Same behavior |
| `moveTileToRack()` | `Rack.addAt()` | Renamed for clarity |
| `removeTileFromRack()` | `Rack.removeAt()` | Renamed for clarity |
| `swapRackTiles()` | `Rack.swap()` | Renamed for clarity |
| `findTileInRack()` | `Rack.findById()` | Renamed for clarity |
| `shuffleRack()` | `Rack.shuffle()` | Same behavior |

## Constants

Rack size is defined in `src/constants/rack.ts`:

```typescript
export const RACK_SIZE = 7;
```

This ensures the rack size is defined in one place and can be easily changed if needed.
