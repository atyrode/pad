# Discarding Mechanics

This document explains the tile discarding system, including discard operations, replacement drawing, UI components, and animation.

## Discard Overview

Discarding allows players to exchange tiles they don't want for new ones from the bag. Tiles can be discarded from the rack or board, with optional immediate replacement.

## Discard Operations

### removeForDiscard()

Removes a tile from rack or board for discarding, with placement history cleanup:

```typescript
export function removeForDiscard(
    rack: RackState,
    board: BoardState,
    placementHistory: PlacementHistoryEntry[],
    tileId: string
): RemoveForDiscardResult | null {
    // Try to find tile in rack first
    const rackIndex = TileOperations.findTileInRack(rack, tileId);
    if (rackIndex !== null) {
        const tile = rack[rackIndex];
        if (!tile) return null;

        // Remove from rack
        const newRack = [...rack];
        newRack[rackIndex] = null;

        return {
            rack: newRack,
            board,
            removedTile: tile,
            placementHistoryUpdates: [], // No history cleanup for rack tiles
        };
    }

    // Try to find tile on board
    const boardPos = TileOperations.findTilePosition(board, tileId);
    if (boardPos) {
        const cell = board[boardPos.row][boardPos.col];
        if (!cell.tile || !cell.canTake) return null;

        const tile = cell.tile;

        // Remove from board
        const newBoard = board.map(row => [...row]);
        newBoard[boardPos.row][boardPos.col] = {
            ...newBoard[boardPos.row][boardPos.col],
            tile: null,
        };

        // Clean up placement history
        const updatedHistory = placementHistory.filter(
            e => !(e.tileId === tileId &&
                   e.position.row === boardPos.row &&
                   e.position.col === boardPos.col)
        );

        return {
            rack,
            board: newBoard,
            removedTile: tile,
            placementHistoryUpdates: updatedHistory,
        };
    }

    return null; // Tile not found
}
```

### discardAndDraw()

Complete discard operation with immediate replacement:

```typescript
export function discardAndDraw(
    rack: RackState,
    board: BoardState,
    placementHistory: PlacementHistoryEntry[],
    supplyState: TileSupplyState,
    tileId: string
): DiscardResult | null {
    // Remove tile from source
    const removeResult = removeForDiscard(rack, board, placementHistory, tileId);
    if (!removeResult) return null;

    // Determine source rack index for TileSupply
    const sourceRackIndex = TileOperations.findTileInRack(rack, tileId);

    // Use updated rack for supply operation
    const updatedSupplyState: TileSupplyState = {
        ...supplyState,
        rack: removeResult.rack,
    };

    // Perform discard and draw
    const drawResult = TileSupply.discardAndDraw(
        removeResult.removedTile,
        sourceRackIndex,
        updatedSupplyState
    );

    if (!drawResult) {
        // If draw fails, just discard without replacement
        return {
            rack: removeResult.rack,
            board: removeResult.board,
            bag: supplyState.bag,
            discard: [...supplyState.discard, removeResult.removedTile],
            placementHistoryUpdates: removeResult.placementHistoryUpdates,
            drawnSlot: null,
        };
    }

    return {
        rack: drawResult.rack,
        board: removeResult.board,
        bag: drawResult.bag,
        discard: drawResult.discard,
        placementHistoryUpdates: removeResult.placementHistoryUpdates,
        drawnSlot: drawResult.drawnSlot,
    };
}
```

## Discard Slot UI

### DiscardSlot Component

`src/components/DiscardSlot.tsx` provides the visual discard target:

```typescript
export default function DiscardSlot({ ref, tileSize, hidden }) {
    return (
        <div
            ref={ref}
            id="discard-slot"
            className={`
                absolute w-12 h-12 bg-zinc-800 border-2 border-dashed
                border-zinc-600 rounded-lg flex items-center justify-center
                transition-colors duration-200
                ${hidden ? 'opacity-0 pointer-events-none' : 'opacity-100'}
                hover:border-red-500 hover:bg-zinc-700
            `}
            style={{
                width: tileSize,
                height: tileSize,
            }}
        >
            {/* Trash icon or discard indicator */}
            <TrashIcon className="w-6 h-6 text-zinc-400" />
        </div>
    );
}
```

### Positioning

The discard slot is positioned relative to the rack:

```typescript
// In GameArea.tsx
<div className="absolute right-full mr-2 top-1/2 -translate-y-1/2">
    <DiscardSlot ref={discardRef} tileSize={boardCellSize} hidden={isDraftMode} />
</div>
```

## Discard Animation

### Animation System

`useDragEndWithDiscard` manages discard animations:

```typescript
const [discardAnim, setDiscardAnim] = useState<{ tile: TileData } | null>(null);
const [isDiscarding, setIsDiscarding] = useState(false);

const handleDragEnd = (event) => {
    if (event.over?.id === 'discard-slot') {
        // Trigger discard operation
        const result = DiscardOperations.discardAndDraw(/* ... */);

        // Start animation
        setIsDiscarding(true);
        setDiscardAnim({ tile: removedTile });

        // Complete after animation
        setTimeout(() => {
            // Update state
            setRack(result.rack);
            setBag(result.bag);
            setDiscard(result.discard);

            // End animation
            setDiscardAnim(null);
            setIsDiscarding(false);
        }, 180); // Animation duration
    }
};
```

### Visual Animation

The animation shows the discarded tile moving to the discard slot:

```typescript
// In GameArea.tsx
{discardAnim && (
    <div
        className="pointer-events-none absolute"
        style={{
            left: -boardCellSize - 8,
            top: '50%',
            transform: 'translateY(-50%)',
            width: boardCellSize - 2,
            height: boardCellSize - 2,
            transition: 'opacity 180ms ease, transform 180ms ease',
            opacity: 0, // Fades out during animation
        }}
    >
        <div className="w-full h-full bg-zinc-800 border border-zinc-600 rounded-lg flex items-center justify-center text-white font-bold">
            {discardAnim.tile.displayValue || discardAnim.tile.value}
        </div>
    </div>
)}
```

## Placement History Cleanup

### Board Discard History Management

When discarding from board, placement history must be cleaned up:

```typescript
// Remove entries for this specific tile at this position
const updatedHistory = placementHistory.filter(
    e => !(e.tileId === tileId &&
           e.position.row === boardPos.row &&
           e.position.col === boardPos.col)
);
```

### History Entry Structure

Each placement history entry tracks:

```typescript
interface PlacementHistoryEntry {
    tileId: string;
    position: Position;
    wasBlank?: boolean; // True if tile was originally blank
}
```

### Cleanup Logic

- **Rack Discards**: No history cleanup needed (rack tiles aren't in history)
- **Board Discards**: Remove history entries for discarded tile at specific position
- **Blank Tiles**: History tracks whether tile was originally blank

## Discard and Draw Flow

### Complete Discard Sequence

1. **Tile Selection**: Player drags tile to discard slot
2. **Immediate Removal**: Tile removed from source (rack/board)
3. **History Cleanup**: Placement history updated if from board
4. **Discard Addition**: Tile added to discard pile
5. **Animation Start**: Visual feedback begins
6. **Draw Replacement**: New tile drawn from bag/discard
7. **Rack Update**: New tile placed in appropriate rack slot
8. **Animation Complete**: Visual feedback ends
9. **State Update**: All state changes applied

### Replacement Logic

```typescript
// Determine replacement slot
const slotIndex = sourceRackIndex !== null
    ? sourceRackIndex  // Replace in same rack slot
    : findFirstEmptySlot(updatedRack); // Or first empty slot
```

## Discard Rules and Constraints

### When Discarding is Allowed

- **Rack Tiles**: Any tile in rack can be discarded
- **Board Tiles**: Only `canTake=true` tiles can be discarded
- **Game Phase**: Discarding disabled during draft mode
- **Tile Availability**: Replacement depends on bag/discard contents

### Discard Without Replacement

If no tiles available for replacement:

```typescript
if (!drawResult) {
    // Just discard without drawing
    return {
        rack: updatedRack,  // Tile removed
        bag: supplyState.bag,
        discard: [...supplyState.discard, removedTile], // Tile added
        placementHistoryUpdates: updatedHistory,
        drawnSlot: null, // No replacement
    };
}
```

## Integration with Drag System

### useDragEndWithDiscard Hook

Extends the main drag system for discard handling:

```typescript
export function useDragEndWithDiscard(params) {
    const {
        board, setBoard, rack, setRack,
        bag, setBag, discard, setDiscard,
        placementHistory, setPlacementHistory,
        openBlankTilePopup,
        originalHandleDragEnd,
    } = params;

    const handleDragEnd = (event) => {
        // Check for discard drop first
        if (event.over?.id === 'discard-slot') {
            // Handle discard...
            return;
        }

        // Check for blank tile popup
        if (isBlankTileBeingPlaced) {
            openBlankTilePopup();
            return;
        }

        // Fallback to normal drag handling
        originalHandleDragEnd(event);
    };

    return { handleDragEnd, discardAnim, isDiscarding };
}
```

### Priority Order

Event handling priority:

1. **Discard Zone**: Check for discard drops first
2. **Blank Tiles**: Intercept blank tile placements
3. **Normal Drags**: Handle standard drag operations

## Debug Operations

### Debug Discard Testing

```typescript
// In debug menu - simulate discard
onDiscardTest: () => {
    if (state.rack[0]) {
        const result = DiscardOperations.discardAndDraw(
            state.rack, state.board, state.placementHistory,
            { rack: state.rack, bag: state.bag, discard: state.discard },
            state.rack[0].id
        );
        if (result) {
            setRack(result.rack);
            setBag(result.bag);
            setDiscard(result.discard);
            setPlacementHistory(result.placementHistoryUpdates);
        }
    }
},
```

## Performance Considerations

### Animation Timing

- **Duration**: 180ms for smooth visual feedback
- **Blocking**: Operations blocked during animation (`isDiscarding`)
- **Cleanup**: Animation state cleared after completion

### Memory Management

- **History Cleanup**: Removes unnecessary history entries
- **State Updates**: Atomic updates prevent inconsistent states
- **Garbage Collection**: Old state objects properly discarded

## Error Handling

### Invalid Discard Operations

- **Protected Tiles**: Cannot discard locked tiles (`canTake=false`)
- **Missing Tiles**: Operations fail gracefully if tile not found
- **Full Discard**: No practical limit on discard pile size

### Recovery Mechanisms

- **State Validation**: Operations check preconditions
- **Fallback Behavior**: Discard without replacement if drawing fails
- **Animation Safety**: Animation state resets even if operations fail

## Refactoring Opportunities

1. **Discard Strategies**: Multiple discard/replacement algorithms
2. **Animation System**: More sophisticated discard animations
3. **Discard Limits**: Per-turn or per-game discard limits
4. **Discard History**: Track discard history for analytics
5. **Visual Feedback**: Better discard zone indicators
6. **Undo System**: Allow undoing discards

The discarding system provides flexible tile management with comprehensive state handling and smooth user feedback.
