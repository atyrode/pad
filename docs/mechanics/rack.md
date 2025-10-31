# Rack Mechanics

This document explains the player's tile rack system, including state management, tile organization, and shuffle functionality.

## Rack Structure

### Physical Layout

The rack holds 7 tiles in a horizontal arrangement:

```typescript
type RackState = (TileData | null)[]; // Array of 7 slots
```

Each slot can contain:
- **TileData**: A letter tile with score and ID
- **null**: Empty slot

### Visual Layout

```
┌─────┬─────┬─────┬─────┬─────┬─────┬─────┐
│  H  │  E  │  L  │  L  │  O  │     │     │
│  4  │  1  │  1  │  1  │  1  │     │     │
└─────┴─────┴─────┴─────┴─────┴─────┴─────┘
   1     2     3     4     5     6     7
```

## Rack Initialization

### createInitialRack()

`src/utils/rackUtils.ts` creates an empty rack:

```typescript
export function createInitialRack(): RackState {
    return Array(7).fill(null); // 7 empty slots
}
```

### Filling the Rack

The rack is filled through drawing mechanics:

```typescript
// From TileSupply.drawToFill()
export function drawToFill(currentState: TileSupplyState): DrawResult {
    let rackWork = [...currentState.rack];
    let currentBag = currentState.bag;
    let currentDiscard = currentState.discard;

    while (true) {
        const slot = findFirstEmptySlot(rackWork);
        if (slot === null) break; // No more empty slots

        const { tile, newBag, newDiscard } = drawTile(currentBag, currentDiscard);
        if (!tile) break; // No more tiles available

        rackWork[slot] = tile;
        currentBag = newBag;
        currentDiscard = newDiscard;
    }

    return { rack: rackWork, bag: currentBag, discard: currentDiscard };
}
```

## Tile Management

### Adding Tiles

Tiles are added to the rack through:

1. **Initial Draw**: After play resolution
2. **Discard Replacement**: When discarding a tile
3. **Board Removal**: When removing tiles from board

### Removing Tiles

Tiles are removed from the rack when:

1. **Placed on Board**: `TileOperations.placeTileOnBoardFromRack()`
2. **Discarded**: `DiscardOperations.discardAndDraw()`

### Rack Operations

#### Find First Empty Slot

`findFirstEmptySlot()` locates available space:

```typescript
export function findFirstEmptySlot(rack: RackState): number | null {
    for (let i = 0; i < rack.length; i++) {
        if (rack[i] === null) {
            return i;
        }
    }
    return null;
}
```

#### Find Tile by ID

`findTileInRack()` locates tiles for drag operations:

```typescript
export function findTileInRack(rack: RackState, tileId: string): number | null {
    for (let i = 0; i < rack.length; i++) {
        if (rack[i]?.id === tileId) {
            return i;
        }
    }
    return null;
}
```

## Shuffle Functionality

### Shuffle Algorithm

`shuffleRack()` randomizes tile positions:

```typescript
export function shuffleRack(rack: RackState): RackState {
    const tilesOnly = rack.filter(tile => tile !== null) as TileData[];
    const emptyCount = rack.length - tilesOnly.length;

    // Fisher-Yates shuffle
    for (let i = tilesOnly.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [tilesOnly[i], tilesOnly[j]] = [tilesOnly[j], tilesOnly[i]];
    }

    // Reconstruct rack with shuffled tiles + empty slots at end
    return [...tilesOnly, ...Array(emptyCount).fill(null)];
}
```

### Shuffle Rules

- **Minimum Tiles**: Requires at least 2 tiles to shuffle
- **Preserves Count**: Maintains same number of tiles and empty slots
- **Random Distribution**: Tiles can end up in any position
- **Empty Slots**: Empty slots are consolidated at the end

### Shuffle Validation

`canShuffleSelector()` determines if shuffle is allowed:

```typescript
export function canShuffleSelector(rack: RackState): boolean {
    return rack.filter(t => !!t).length > 1;
}
```

## Rack UI Components

### Rack Component

`src/components/Rack.tsx` renders the rack:

```typescript
export default function Rack({ rack, setRack, boardCellSize, ... }) {
    return (
        <div className="flex gap-1">
            {rack.map((tile, index) => (
                <RackCell
                    key={index}
                    tile={tile}
                    index={index}
                    boardCellSize={boardCellSize}
                    // ... drag props
                />
            ))}
        </div>
    );
}
```

### RackCell Component

`src/components/RackCell.tsx` renders individual slots:

#### Empty Slot
```typescript
if (!tile) {
    return (
        <div className="w-12 h-12 bg-zinc-700 border-2 border-dashed border-zinc-500 rounded-lg flex items-center justify-center">
            {/* Empty slot indicator */}
        </div>
    );
}
```

#### Occupied Slot
```typescript
return (
    <div className="relative">
        <Tile tile={tile} size={boardCellSize} />
        {/* Drag overlay effects */}
    </div>
);
```

## Drag and Drop Integration

### Rack as Drag Source

Tiles in the rack can be dragged to:

- **Board positions**: For placement
- **Other rack positions**: For reordering
- **Discard slot**: For discarding

### Rack as Drop Target

The rack accepts drops from:

- **Board tiles**: When removing tiles
- **Other rack tiles**: When reordering

### Drag State Tracking

`overRackIndex` tracks which rack slot is being hovered:

```typescript
// In useDragAndDrop
const [overRackIndex, setOverRackIndex] = useState<number | null>(null);

// During drag over
if (rackIndex !== null || rackTileIndex !== null) {
    setOverRackIndex(rackIndex !== null ? rackIndex : rackTileIndex);
}
```

## Rack Operations in Engine

### Rack Domain Module (`src/domain/rack/Rack.ts`)

All rack operations are encapsulated in the Rack domain module:

#### Core Rack Operations
```typescript
// Create an empty rack
const rack = Rack.createEmpty();

// Add/remove tiles
const withTile = Rack.addAt(rack, 2, tile);
const withoutTile = Rack.removeAt(rack, 2);

// Swap tiles
const swapped = Rack.swap(rack, 1, 4);

// Query operations
const emptyIndex = Rack.firstEmpty(rack);
const tileIndex = Rack.findById(rack, tileId);
const tileCount = Rack.count(rack);
const isFull = Rack.isFull(rack);

// Shuffle
const shuffled = Rack.shuffle(rack);
```

### TileOperations Integration

Rack operations are used by `TileOperations` functions:

#### Place from Rack to Board
```typescript
export function placeTileOnBoardFromRack(
    rack: RackState, rackIndex: number, board: BoardState, position: Position
): PlaceTileOnBoardResult {
    const tile = rack[rackIndex];
    if (!tile) return null;

    // Remove from rack using rackUtils
    let newRack = removeTileFromRack(rack, rackIndex);

    // Place on board
    const newBoard = placeTileOnBoard(board, tile, position);

    // Handle swapping
    if (board[position.row][position.col].tile) {
        newRack = moveTileToRack(newRack, swappedTile, rackIndex);
    }

    return { board: newBoard, rack: newRack, /* ... */ };
}
```

#### Remove from Board to Rack
```typescript
export function removeTileFromBoardToRack(
    board: BoardState, position: Position, rack: RackState, targetRackIndex?: number
): RemoveTileFromBoardResult {
    // Find target rack slot using rackUtils
    let rackIndex = targetRackIndex;
    if (rackIndex === null) {
        rackIndex = findFirstEmptySlot(rack);
        if (rackIndex === null) return null;
    }

    // Remove from board
    const newBoard = removeTileFromBoard(board, position);
    const tile = board[position.row][position.col].tile!;

    // Add to rack using rackUtils
    const newRack = moveTileToRack(rack, tile, rackIndex);

    return { board: newBoard, rack: newRack, removedTile: tile, /* ... */ };
}
```

## Rack State in Game Flow

### After Play Resolution

Rack is refilled after each play:

```typescript
// In PlayResolution.resolvePlay()
const tileSupplyResult = TileSupply.drawToFill({
    rack: args.rack,
    bag: args.bag,
    discard: args.discard,
});

return {
    // ... other results
    rack: tileSupplyResult.rack,
    bag: tileSupplyResult.bag,
    discard: tileSupplyResult.discard,
};
```

### During Draft Mode

Rack is not used during draft mode - tiles come from suggestions and placement zone.

### Debug Operations

Debug menu provides rack manipulation:

```typescript
// Clear rack
const emptyRack: RackState = Array(state.rack.length).fill(null);
setRack(emptyRack);

// Draw tiles to rack
const result = TileSupply.drawToFill({
    rack: state.rack,
    bag: state.bag,
    discard: state.discard,
});
setRack(result.rack);
```

## Visual Feedback

### Rack Status Indicators

- **Full Rack**: All 7 slots occupied
- **Partial Rack**: Mix of tiles and empty slots
- **Empty Rack**: All slots empty (uncommon)
- **Drag States**: Visual feedback during drag operations

### Shuffle Button State

Shuffle button shows different states:

- **Enabled**: 2+ tiles in rack
- **Disabled**: < 2 tiles in rack
- **Loading**: During shuffle animation (if implemented)

## Error Handling

### Invalid Rack Operations

- **Full Rack Placement**: Cannot place when no empty slots
- **Invalid Indices**: Out-of-bounds rack access
- **Missing Tiles**: Operations on null slots

### Recovery Mechanisms

- **State Validation**: Rack operations check bounds and validity
- **Graceful Fallbacks**: Return null for invalid operations
- **Debug Tools**: Manual rack manipulation for testing

## Refactoring Opportunities

1. **Rack Size**: Make rack size configurable
2. **Rack Operations**: Consolidate rack utility functions
3. **Visual Design**: Improve empty slot indicators
4. **Animation**: Add shuffle animations
5. **Accessibility**: Better keyboard navigation for rack
6. **Multi-selection**: Support for selecting multiple rack tiles

The rack system provides essential tile management functionality with clean separation between UI and business logic.
