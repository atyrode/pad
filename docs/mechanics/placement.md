# Placement Mechanics

This document explains the tile placement operations, including rack-to-board placement, board-to-rack removal, board-to-board movement, tile swapping, and placement history tracking.

## Placement Overview

Placement operations move tiles between different game areas (rack, board positions) while maintaining game state consistency and tracking placement history.

## Core Placement Operations

### TileOperations Module

`src/engine/TileOperations.ts` provides the core placement functions:

```typescript
export interface PlaceTileOnBoardResult {
    board: BoardState;
    rack: RackState;
    placementHistoryEntry: PlacementHistoryEntry | null;
    swappedTile: TileData | null;
}

export interface RemoveTileFromBoardResult {
    board: BoardState;
    rack: RackState;
    removedTile: TileData | null;
    wasBlank: boolean;
    revertedTile: TileData | null;
}

export interface MoveTileBetweenBoardPositionsResult {
    board: BoardState;
}

export interface SwapTilesResult {
    board: BoardState;
    rack: RackState;
}
```

## Rack to Board Placement

### placeTileOnBoardFromRack()

Places a tile from rack onto board, handling swapping and placement history:

```typescript
export function placeTileOnBoardFromRack(
    rack: RackState,
    rackIndex: number,
    board: BoardState,
    targetPosition: Position,
    trackHistory: boolean = true
): PlaceTileOnBoardResult | null {
    const tile = rack[rackIndex];
    if (!tile) return null;

    const targetCell = board[targetPosition.row][targetPosition.col];
    if (!targetCell.canPlace) return null;

    // Handle swapping if target position has a tile
    const swappedTile: TileData | null = targetCell.tile && targetCell.canTake
        ? targetCell.tile
        : null;

    // Remove tile from rack
    let newRack = removeTileFromRack(rack, rackIndex);

    // Add swapped tile back to rack if any
    if (swappedTile) {
        newRack = moveTileToRack(newRack, swappedTile, rackIndex);
    }

    // Place tile on board
    const newBoard = placeTileOnBoard(board, tile, targetPosition);

    // Create placement history entry
    const placementHistoryEntry: PlacementHistoryEntry | null = trackHistory
        ? { tileId: tile.id, position: targetPosition, wasBlank: tile.originalValue === '*' }
        : null;

    return {
        board: newBoard,
        rack: newRack,
        placementHistoryEntry,
        swappedTile,
    };
}
```

### Placement Rules

- **Tile Existence**: Must have a tile at the specified rack index
- **Board Validity**: Target position must allow placement (`canPlace = true`)
- **Swapping Logic**: If target has a takeable tile, it gets swapped back to rack
- **History Tracking**: Optionally tracks placement for undo/debugging

## Board to Rack Removal

### removeTileFromBoardToRack()

Removes a tile from board and places it in rack, with automatic blank reversion:

```typescript
export function removeTileFromBoardToRack(
    board: BoardState,
    boardPosition: Position,
    rack: RackState,
    targetRackIndex: number | null = null
): RemoveTileFromBoardResult | null {
    const sourceCell = board[boardPosition.row][boardPosition.col];
    if (!sourceCell.tile || !sourceCell.canTake) return null;

    const removedTile = sourceCell.tile;
    const wasBlank = removedTile.originalValue === '*';

    // Find target rack slot
    let rackIndex = targetRackIndex;
    if (rackIndex === null) {
        rackIndex = findFirstEmptySlot(rack);
        if (rackIndex === null) return null;
    }

    // Handle blank tile reversion
    let tileToAdd: TileData = removedTile;
    let revertedTile: TileData | null = null;

    if (wasBlank) {
        revertedTile = {
            ...removedTile,
            value: '*',
            originalValue: undefined,
            displayValue: undefined,
        } as TileData;
        tileToAdd = revertedTile;
    }

    // Remove from board
    const newBoard = removeTileFromBoard(board, boardPosition);

    // Add to rack
    const newRack = moveTileToRack(rack, tileToAdd, rackIndex);

    return {
        board: newBoard,
        rack: newRack,
        removedTile,
        wasBlank,
        revertedTile,
    };
}
```

### Removal Rules

- **Tile Existence**: Must have a tile at the board position
- **Removability**: Tile must be takeable (`canTake = true`)
- **Rack Space**: Must have space in rack (or specify target index)
- **Blank Reversion**: Transformed blanks automatically revert to "*" when removed

## Board to Board Movement

### moveTileBetweenBoardPositions()

Moves a tile between two board positions:

```typescript
export function moveTileBetweenBoardPositions(
    board: BoardState,
    sourcePosition: Position,
    targetPosition: Position
): MoveTileBetweenBoardPositionsResult | null {
    const sourceCell = board[sourcePosition.row][sourcePosition.col];
    if (!sourceCell.tile || !sourceCell.canTake) return null;

    const targetCell = board[targetPosition.row][targetPosition.col];
    const targetAllowsPlacement = !targetCell.tile
        ? targetCell.canPlace
        : targetCell.canPlace && targetCell.canTake;

    if (!targetAllowsPlacement) return null;

    // Swap tiles (handles both empty and occupied targets)
    const newBoard = swapBoardTiles(board, sourcePosition, targetPosition);

    return { board: newBoard };
}
```

### Movement Rules

- **Source Validity**: Source must have a takeable tile
- **Target Validity**: Target must allow placement
- **Swapping**: If target has tile, tiles are swapped
- **Same Position**: Invalid (no-op)

## Tile Swapping Operations

### swapRackAndBoardTile()

Bidirectional swapping between rack and board:

```typescript
export function swapRackAndBoardTile(
    rack: RackState,
    rackIndex: number,
    board: BoardState,
    boardPosition: Position,
    trackHistory: boolean = true
): (SwapTilesResult & { placementHistoryEntry: PlacementHistoryEntry | null }) | null {
    const rackTile = rack[rackIndex];
    const boardCell = board[boardPosition.row][boardPosition.col];

    if (!rackTile) return null;
    if (!boardCell.canPlace || (boardCell.tile && !boardCell.canTake)) return null;

    const boardTile = boardCell.tile;
    const wasBlank = rackTile.originalValue === '*';

    // Update rack
    let newRack = [...rack];
    if (boardTile) {
        newRack[rackIndex] = boardTile;
    } else {
        newRack[rackIndex] = null;
    }

    // Update board
    const newBoard = placeTileOnBoard(board, rackTile, boardPosition);

    // Placement history for board placement
    const placementHistoryEntry: PlacementHistoryEntry | null = trackHistory && rackTile
        ? { tileId: rackTile.id, position: boardPosition, wasBlank }
        : null;

    return {
        board: newBoard,
        rack: newRack,
        placementHistoryEntry,
    };
}
```

### Swapping Rules

- **Rack Tile Required**: Must have tile in specified rack slot
- **Board Access**: Target must allow placement
- **Existing Tile**: If board has tile, it must be takeable for swapping
- **Empty Target**: Can place on empty valid positions

## Low-Level Board Operations

### placeTileOnBoard()

Primitive board placement:

```typescript
function placeTileOnBoard(board: BoardState, tile: TileData, pos: Position): BoardState {
    const newBoard = board.map(row => [...row]);
    const existing = newBoard[pos.row][pos.col];
    newBoard[pos.row][pos.col] = { ...existing, tile };
    return newBoard;
}
```

### removeTileFromBoard()

Primitive board removal:

```typescript
function removeTileFromBoard(board: BoardState, pos: Position): BoardState {
    const newBoard = board.map(row => [...row]);
    const existing = newBoard[pos.row][pos.col];
    newBoard[pos.row][pos.col] = { ...existing, tile: null };
    return newBoard;
}
```

### swapBoardTiles()

Primitive board tile swapping:

```typescript
function swapBoardTiles(board: BoardState, pos1: Position, pos2: Position): BoardState {
    const newBoard = board.map(row => [...row]);

    const tile1 = newBoard[pos1.row][pos1.col].tile;
    const tile2 = newBoard[pos2.row][pos2.col].tile;

    newBoard[pos1.row][pos1.col] = {
        ...newBoard[pos1.row][pos1.col],
        tile: tile2,
    };

    newBoard[pos2.row][pos2.col] = {
        ...newBoard[pos2.row][pos2.col],
        tile: tile1,
    };

    return newBoard;
}
```

## Rack Operations

### moveTileToRack()

Places tile in specific rack slot:

```typescript
export function moveTileToRack(rack: RackState, tile: TileData, index: number): RackState {
    const newRack = [...rack];
    if (index >= 0 && index < rack.length) {
        newRack[index] = tile;
    }
    return newRack;
}
```

### removeTileFromRack()

Removes tile from rack slot:

```typescript
export function removeTileFromRack(rack: RackState, index: number): RackState {
    const newRack = [...rack];
    if (index >= 0 && index < rack.length) {
        newRack[index] = null;
    }
    return newRack;
}
```

### swapRackTiles()

Swaps two tiles in rack:

```typescript
export function swapRackTiles(rack: RackState, index1: number, index2: number): RackState {
    const newRack = [...rack];
    if (index1 >= 0 && index1 < rack.length && index2 >= 0 && index2 < rack.length) {
        const tile1 = newRack[index1];
        const tile2 = newRack[index2];
        newRack[index1] = tile2;
        newRack[index2] = tile1;
    }
    return newRack;
}
```

## Placement History Tracking

### PlacementHistoryEntry Structure

```typescript
interface PlacementHistoryEntry {
    tileId: string;
    position: Position;
    wasBlank?: boolean; // True if tile was originally a blank
}
```

### History Tracking

Placement history is maintained for:

- **Debugging**: Understanding tile movement sequences
- **Validation**: Checking play legality
- **Undo Operations**: Potential future undo functionality
- **Analytics**: Understanding player behavior

### History Updates

```typescript
// Adding to history
setPlacementHistory(prev => [...prev, placementHistoryEntry]);

// Clearing history (after play resolution)
setPlacementHistory([]);

// Cleaning up specific entries (during discard)
const updatedHistory = placementHistory.filter(
    e => !(e.tileId === tileId && e.position.row === pos.row && e.position.col === pos.col)
);
```

## Search Operations

### findTileInRack()

Locates tile by ID in rack:

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

### findTilePosition()

Locates tile by ID on board:

```typescript
export function findTilePosition(board: BoardState, tileId: string): Position | null {
    for (let row = 0; row < board.length; row++) {
        for (let col = 0; col < board[row].length; col++) {
            if (board[row][col]?.tile?.id === tileId) {
                return { row, col };
            }
        }
    }
    return null;
}
```

### findFirstEmptySlot()

Finds first empty rack position:

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

## Integration with Drag System

### Drag Operation Routing

`useDragAndDrop` routes drag operations to appropriate placement functions:

```typescript
// Rack → Board
if (activeRackIndex !== null && (overBoardPos || emptyPos)) {
    const result = placeTileOnBoardFromRack(
        rack, activeRackIndex, board, targetPos, true
    );
    // Apply result...
}

// Board → Rack
else if (activeBoardPos && overRackIndex !== null) {
    const result = removeTileFromBoardToRack(
        board, activeBoardPos, rack, overRackIndex
    );
    // Apply result...
}

// Board → Board
else if (activeBoardPos && (overBoardPos || emptyPos)) {
    const result = moveTileBetweenBoardPositions(
        board, activeBoardPos, targetPos
    );
    // Apply result...
}

// Rack → Rack
else if (activeRackIndex !== null && (overRackIndex !== null || overRackTileIndex !== null)) {
    const newRack = swapRackTiles(rack, activeRackIndex, targetIndex);
    setRack(newRack);
}
```

## Error Handling

### Operation Validation

All placement operations validate preconditions:

- **Null Checks**: Ensure tiles exist where expected
- **Bounds Checks**: Validate array indices and board positions
- **Permission Checks**: Verify `canPlace` and `canTake` flags
- **State Consistency**: Ensure operations don't create invalid states

### Failure Handling

Operations return `null` for failures:

```typescript
// Caller handles failures gracefully
const result = placeTileOnBoardFromRack(rack, index, board, position);
if (!result) {
    // Handle failure (invalid placement, etc.)
    return;
}
// Apply successful result
setBoard(result.board);
setRack(result.rack);
```

## Performance Considerations

### Operation Complexity

- **Single Operations**: O(1) - direct array access
- **Search Operations**: O(n) - linear searches
- **Bulk Operations**: O(n) - array copying and transformation
- **History Operations**: O(m) - where m is history length

### Memory Usage

- **Immutability**: Each operation creates new arrays
- **Garbage Collection**: Old state objects are properly cleaned up
- **History Growth**: Placement history can grow large during long sessions

## Refactoring Opportunities

1. **Operation Consolidation**: Some functions could be combined or simplified
2. **Type Safety**: Better generic types for operation results
3. **Validation Layer**: Centralized validation separate from operations
4. **Bulk Operations**: Support for multi-tile operations
5. **Undo System**: Use placement history for undo functionality
6. **Operation Logging**: Better tracking of operation sequences

The placement system provides comprehensive tile movement capabilities with strong validation and state consistency guarantees.
