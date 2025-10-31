# Engine Layer Architecture

This document explains the pure function design of the engine layer, which contains all core game mechanics and business logic.

## Engine Overview

The engine layer consists of pure functions that implement game mechanics without any React or UI dependencies. These functions:

- Are stateless and deterministic
- Take input state and return new state
- Handle all game rules and validations
- Can be unit tested independently
- Are framework-agnostic

## Core Principles

### Purity and Immutability
All engine functions are pure and never mutate input data:

```typescript
// ✅ Pure function - returns new state
export function placeTileOnBoardFromRack(
    rack: RackState,
    rackIndex: number,
    board: BoardState,
    position: Position
): PlaceTileOnBoardResult | null {
    // Creates new board and rack objects
    const newBoard = board.map(row => [...row]);
    const newRack = [...rack];
    // ... modify copies
    return { board: newBoard, rack: newRack, ... };
}

// ❌ Impure - modifies input
function badPlaceTile(board: BoardState, tile: TileData, pos: Position) {
    board[pos.row][pos.col].tile = tile; // Mutation!
}
```

### Input/Output Contracts
Engine functions use structured interfaces for inputs and outputs:

```typescript
// Input state
interface TileSupplyState {
    rack: RackState;
    bag: Bag;
    discard: TileData[];
}

// Output result
interface DrawResult {
    rack: RackState;
    bag: Bag;
    discard: TileData[];
}
```

### Error Handling
Functions return `null` or structured error results instead of throwing:

```typescript
export function placeTileOnBoardFromRack(...): PlaceTileOnBoardResult | null {
    if (!tile) return null;           // Invalid input
    if (!targetCell.canPlace) return null; // Invalid placement
    // ... success case
    return { board: newBoard, rack: newRack, ... };
}
```

## Engine Modules

### TileOperations (`src/engine/TileOperations.ts`)

**Purpose**: Handles all tile movement operations between rack, board, and positions.

#### Key Functions
- `placeTileOnBoardFromRack()` - Rack → Board placement
- `removeTileFromBoardToRack()` - Board → Rack removal
- `moveTileBetweenBoardPositions()` - Board → Board movement
- `swapRackAndBoardTile()` - Bidirectional rack/board swapping

#### Notes
Rack utility functions (`findFirstEmptySlot`, `moveTileToRack`, `removeTileFromRack`, `swapRackTiles`, `findTileInRack`) have been moved to `src/utils/rackUtils.ts` for better organization.

#### Design Patterns
```typescript
// Composite operations combine primitives
export function placeTileOnBoardFromRack(
    rack: RackState, rackIndex: number,
    board: BoardState, targetPosition: Position,
    trackHistory: boolean = true
): PlaceTileOnBoardResult | null {
    const tile = rack[rackIndex];
    if (!tile) return null;

    // Use primitive operations
    let newRack = removeTileFromRack(rack, rackIndex);
    const newBoard = placeTileOnBoard(board, tile, targetPosition);

    // Add history tracking
    const placementHistoryEntry = trackHistory
        ? { tileId: tile.id, position: targetPosition, wasBlank: tile.originalValue === '*' }
        : null;

    return {
        board: newBoard,
        rack: newRack,
        placementHistoryEntry,
        swappedTile: null, // No swap in this case
    };
}
```

### TileSupply (`src/engine/TileSupply.ts`)

**Purpose**: Manages the tile bag, drawing, discarding, and supply mechanics.

#### Key Functions
- `drawOne()` - Draw single tile to rack
- `drawToFill()` - Fill all empty rack slots
- `redraw()` - Replace all rack tiles
- `discardAndDraw()` - Discard one tile, draw replacement

#### Bag Management
```typescript
// Bag automatically refills from discard when empty
function refillBagFromDiscard(bag: Bag, discard: TileData[]): {
    newBag: Bag;
    newDiscard: TileData[];
    didRefill: boolean;
} {
    if (bag.length === 0 && discard.length > 0) {
        return {
            newBag: shuffleBag([...discard]),
            newDiscard: [],
            didRefill: true,
        };
    }
    return { newBag: bag, newDiscard: discard, didRefill: false };
}
```

### PlayResolution (`src/engine/PlayResolution.ts`)

**Purpose**: Handles play validation, scoring, and resolution of complete turns.

#### Key Functions
- `resolvePlay()` - Complete play resolution
- `calculateCurrentPlayScore()` - Score current unlocked tiles
- `calculateWordScore()` - Score individual words

#### Play Resolution Flow
```typescript
export function resolvePlay(args: ResolvePlayArgs): ResolvePlayResult {
    // 1. Calculate score for current play
    const score = calculateCurrentPlayScore(args.board, args.stickers);

    // 2. Lock placed tiles (canTake → false)
    const lockedBoard = args.board.map(row =>
        row.map(cell => (cell.tile && cell.canTake
            ? { ...cell, canPlace: false, canTake: false }
            : cell))
    );

    // 3. Consume stickers under locked tiles
    let newStickers = args.stickers;
    // ... consume stickers logic

    // 4. Fill rack from bag/discard
    const tileSupplyResult = TileSupply.drawToFill({
        rack: args.rack,
        bag: args.bag,
        discard: args.discard,
    });

    return {
        totalScore: args.currentTotalScore + score.totalScore,
        board: lockedBoard,
        stickers: newStickers,
        rack: tileSupplyResult.rack,
        bag: tileSupplyResult.bag,
        discard: tileSupplyResult.discard,
        placementHistory: [], // Clear placement history
    };
}
```

### DiscardOperations (`src/engine/DiscardOperations.ts`)

**Purpose**: Handles discarding tiles and cleanup operations.

#### Key Functions
- `removeForDiscard()` - Remove tile from source for discarding
- `discardAndDraw()` - Complete discard and replacement operation

#### Placement History Cleanup
```typescript
// When discarding from board, clean up placement history
const updatedHistory = placementHistory.filter(
    e => !(e.tileId === tileId && e.position.row === boardPos.row && e.position.col === boardPos.col)
);
```

## Engine Integration Patterns

### State Updates in Hooks
Engine functions are called from hooks, with results dispatched to state:

```typescript
// In useGameController
const handlePlay = () => {
    const result = PlayResolution.resolvePlay({
        board: state.board,
        stickers: state.stickers,
        rack: state.rack,
        bag: state.bag,
        discard: state.discard,
        currentTotalScore: state.totalScore,
    });

    // Dispatch multiple state updates
    setters.setTotalScore(result.totalScore);
    setters.setBoard(result.board);
    setters.setStickers(result.stickers);
    setters.setRack(result.rack);
    setters.setBag(result.bag);
    setters.setDiscard(result.discard);
    setters.setPlacementHistory(result.placementHistory);
};
```

### Validation in Selectors
Engine functions power state selectors for UI decisions:

```typescript
// In selectors.ts
export function canPlaySelector(args: { board, stickers, isDictionaryLoaded }): boolean {
    if (!args.isDictionaryLoaded) return false;

    const words = boardUtils.findAllWords(args.board);
    const currentWords = words.filter(w => !w.isLocked);

    if (currentWords.length === 0) return false;

    // Use boardUtils for validation
    if (!boardUtils.areUnlockedTilesInSingleLine(args.board)) return false;

    // Dictionary validation
    const allWordsValid = currentWords.every(wordInfo =>
        dictionaryUtils.isValidWordSync(wordInfo.word) === true
    );
    if (!allWordsValid) return false;

    // ... more validation logic
}
```

## Utility Functions

### Board Utils (`src/utils/boardUtils.ts`)

**Purpose**: Board analysis, word finding, and placement validation.

#### Key Functions
- `findAllWords()` - Find all horizontal and vertical words
- `areUnlockedTilesInSingleLine()` - Validate single line placement
- `doesCurrentPlayTouchLocked()` - Validate connection to existing words
- `createInitialBoard()` - Board initialization

### Rack Utils (`src/utils/rackUtils.ts`)

**Purpose**: Rack-specific operations.

#### Key Functions
- `shuffleRack()` - Randomize rack tile order
- `createInitialRack()` - Empty rack initialization

### Sticker Utils (`src/utils/stickerUtils.ts`)

**Purpose**: Sticker management and bonus calculations.

#### Key Functions
- `createInitialStickers()` - Sticker placement
- `consumeSticker()` - Mark sticker as used
- `isStickerActive()` - Check if sticker provides bonus

### Tile Definitions (`src/utils/tileDefinitions.ts`)

**Purpose**: Tile letter definitions and scoring.

#### Key Functions
- `getTileDefinitionById()` - Get tile data by ID
- `getAllAvailableLetters()` - Available letters for blank tile selection

### Dictionary Utils (`src/utils/dictionaryUtils.ts`)

**Purpose**: Word validation using French dictionary.

#### Key Functions
- `isValidWord()` - Async word validation
- `isValidWordSync()` - Sync validation (if dictionary loaded)
- `preloadDictionary()` - Dictionary loading

## Testing Strategy

### Unit Testing
Engine functions can be tested independently:

```typescript
describe('TileOperations.placeTileOnBoardFromRack', () => {
    it('should place tile and update rack', () => {
        const result = placeTileOnBoardFromRack(
            mockRack, 0, mockBoard, { row: 7, col: 7 }
        );

        expect(result).not.toBeNull();
        expect(result!.rack[0]).toBeNull(); // Tile removed from rack
        expect(result!.board[7][7].tile).toEqual(mockTile); // Tile placed on board
    });

    it('should return null for invalid placement', () => {
        const result = placeTileOnBoardFromRack(
            mockRack, 0, mockBoard, { row: 0, col: 0 } // Invalid position
        );
        expect(result).toBeNull();
    });
});
```

### Integration Testing
Hooks can test engine function integration:

```typescript
describe('useGameController handlePlay', () => {
    it('should resolve play and update state', () => {
        const { result } = renderHook(() => useGameController());

        // Trigger play
        act(() => {
            result.current.handlePlay();
        });

        // Verify state updates through mock dispatch
        expect(mockDispatch).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'setTotalScore' })
        );
    });
});
```

## Performance Considerations

### Memoization
Expensive operations are memoized in hooks, not in engine functions:

```typescript
// ✅ Memoize in hook
const canPlay = useMemo(() =>
    canPlaySelector({ board, stickers, isDictionaryLoaded }),
    [board, stickers, isDictionaryLoaded]
);

// ❌ Don't memoize in engine (breaks purity)
export const getExpensiveCalculation = memoize((input) => { ... });
```

### Efficient Algorithms
Engine functions use efficient algorithms:

- Word finding: O(n²) traversal with early termination
- Tile operations: O(1) for individual operations
- Bag operations: O(n) for shuffling

## Refactoring Opportunities

1. **Function Granularity**: Some functions do too much; could be split into smaller functions
2. **Type Safety**: Better generic types for result objects
3. **Error Types**: Structured error types instead of `null` returns
4. **Validation**: Centralized validation functions to reduce duplication
5. **Composition**: Better composition patterns for complex operations
6. **Performance**: Some algorithms could be optimized for larger boards

The engine layer provides a solid foundation with clear separation of concerns, but could benefit from more granular function decomposition and better error handling patterns.
