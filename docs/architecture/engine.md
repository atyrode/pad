# Engine Layer Architecture

This document explains the engine layer design, which provides high-level game operations and business rules orchestration.

## Engine Overview

The engine layer consists of two main components:

1. **GameService** - High-level orchestration for complex game operations
2. **Rules Engine** - Centralized validation and business logic
3. **Specialized Modules** - Pure functions for specific game mechanics

The engine layer bridges the pure domain functions with high-level game operations while remaining framework-agnostic.

## GameService (`src/engine/GameService.ts`)

The GameService provides high-level orchestration for complex game operations, composing multiple domain functions into complete game actions.

### Design Philosophy

GameService methods:
- Accept complete game state snapshots
- Orchestrate multiple domain operations
- Return complete new state objects
- Handle cross-cutting concerns (placement history, validation)

### Key Operations

```typescript
export class GameService {
    // Tile placement and movement
    static placeFromRack(rack, rackIndex, board, position, history): PlaceFromRackResult
    static removeToRack(board, position, rack, history): RemoveToRackResult
    static moveOnBoard(board, sourcePos, targetPos): MoveOnBoardResult
    static swapRackBoard(rack, rackIndex, board, position, history): SwapRackBoardResult

    // Play resolution
    static resolvePlay(state): ResolvePlayResult

    // Tile supply operations
    static discardAndDraw(tileId, state): DiscardAndDrawResult
    static drawToFill(state): DrawToFillResult
    static redraw(state): RedrawResult

    // Game initialization
    static createNewBag(): Bag
    static createInitialState(): GameStateSnapshot
}
```

### Example Usage

```typescript
// Complete tile placement operation
const result = GameService.placeFromRack(
    rack, 2, board, { row: 7, col: 7 }, placementHistory
);

// Returns updated board, rack, and placement history
batchUpdate({
    board: result.board,
    rack: result.rack,
    placementHistory: result.placementHistory,
});
```

## Rules Engine (`src/engine/Rules.ts`)

The Rules engine centralizes all game validation and business logic.

### Validation Results

```typescript
interface ValidationResult {
    isValid: boolean;
    reason?: string;
}

interface PlayValidationResult {
    canPlay: boolean;
    hasWords: boolean;
    wordsInSingleLine: boolean;
    wordsValid: boolean;
    coversStartSticker: boolean;
    touchesExistingWords: boolean;
    invalidWords: string[];
}
```

### Key Functions

```typescript
export class Rules {
    // Complete play validation
    static areAllCurrentWordsValid(board, stickers, dictLoaded): ValidationResult
    static validateCurrentPlay(board, stickers, dictLoaded): PlayValidationResult

    // Individual rule checks
    static canPlaceAt(board, position): ValidationResult
    static canTakeFrom(board, position): ValidationResult
    static canShuffleRack(rack): ValidationResult
}
```

### Integration with Selectors

Rules power Zustand selectors for reactive UI state:

```typescript
// In selectors.ts
export function useCanPlay(): boolean {
    const board = useGameStore((state) => state.board);
    const stickers = useGameStore((state) => state.stickers);
    const dictLoaded = useGameStore((state) => state.isDictionaryLoaded);

    return Rules.areAllCurrentWordsValid(board, stickers, dictLoaded).isValid;
}
```

## Specialized Engine Modules

The engine layer includes specialized modules that handle specific game mechanics:

### TileOperations (`src/engine/TileOperations.ts`)

**Purpose**: Low-level tile movement primitives, now using domain Board helpers.

#### Key Functions
- `placeTileOnBoardFromRack()` - Rack → Board placement
- `removeTileFromBoardToRack()` - Board → Rack removal
- `moveTileBetweenBoardPositions()` - Board → Board movement
- `swapRackAndBoardTile()` - Bidirectional rack/board swapping

#### Refactored Implementation
```typescript
// Now uses domain helpers instead of direct array manipulation
function placeTileOnBoard(board: BoardState, tile: TileData, pos: Position): BoardState {
    return Board.setTile(board, pos, tile); // Domain function
}

function removeTileFromBoard(board: BoardState, pos: Position): BoardState {
    return Board.clearTile(board, pos); // Domain function
}
```

### TileSupply (`src/engine/TileSupply.ts`)

**Purpose**: Tile bag management and drawing operations.

#### Key Functions
- `drawOne()` - Draw single tile to rack
- `drawToFill()` - Fill all empty rack slots
- `redraw()` - Replace all rack tiles
- `discardAndDraw()` - Discard one tile, draw replacement

### PlayResolution (`src/engine/PlayResolution.ts`)

**Purpose**: Play validation, scoring, and turn resolution.

#### Refactored Scoring
```typescript
// Now uses forEachWordCell helper to eliminate duplication
export function calculateWordScore(word: WordInfo, board: BoardState, stickers?: StickerState): number {
    let points = 0;
    let letterCount = 0;
    let stickerPoints = 0;
    let stickerMulti = 0;

    BoardDomain.forEachWordCellOnBoard(word, board, (position, cell) => {
        if (cell.tile) {
            points += cell.tile.score;
            letterCount++;

            if (stickers && Stickers.isStickerActive(stickers, position)) {
                const sticker = stickers[position.row][position.col];
                if (sticker) {
                    if (sticker.type === 'multi') {
                        stickerMulti += sticker.value;
                    } else if (sticker.type === 'points') {
                        stickerPoints += sticker.value;
                    }
                }
            }
        }
    });

    const totalPoints = points + stickerPoints;
    const totalMulti = letterCount + stickerMulti;
    return totalPoints * totalMulti;
}
```

### DiscardOperations (`src/engine/DiscardOperations.ts`)

**Purpose**: Discard operations and placement history cleanup.

#### Updated Implementation
```typescript
// Now uses domain Board.clearTile
const newBoard = Board.clearTile(board, boardPos);

// Clean up placement history
const updatedHistory = placementHistory.filter(
    e => !(e.tileId === tileId &&
           e.position.row === boardPos.row &&
           e.position.col === boardPos.col)
);
```

## Engine Integration Patterns

### GameService in Controllers

GameService methods are called from React hooks for complex operations:

```typescript
// In useGameController
const handlePlay = () => {
    const gameState: GameService.GameStateSnapshot = {
        board: state.board,
        rack: state.rack,
        bag: state.bag,
        discard: state.discard,
        stickers: state.stickers,
        totalScore: state.totalScore,
        placementHistory: state.placementHistory,
    };

    const result = GameService.resolvePlay(gameState);

    // Atomic state update
    batchUpdate({
        totalScore: result.totalScore,
        board: result.board,
        stickers: result.stickers,
        placementHistory: result.placementHistory,
        rack: result.rack,
        bag: result.bag,
        discard: result.discard,
    });
};
```

### Rules Engine in Selectors

Rules power reactive Zustand selectors:

```typescript
// In selectors.ts
export function useCanPlay(): boolean {
    const board = useGameStore((state) => state.board);
    const stickers = useGameStore((state) => state.stickers);
    const dictLoaded = useGameStore((state) => state.isDictionaryLoaded);

    return Rules.areAllCurrentWordsValid(board, stickers, dictLoaded).isValid;
}

export function useCanShuffle(): boolean {
    const rack = useGameStore((state) => state.rack);
    return Rules.canShuffleRack(rack).isValid;
}
```

## Domain Layer Integration

The engine layer heavily uses the domain layer for pure functional operations:

### Board Domain (`src/domain/board/Board.ts`)

**Purpose**: Immutable board state management and word analysis.

#### Key Functions
- `createEmpty()` - Create initial board state
- `setTile()` / `clearTile()` - Tile placement/removal
- `findAllWords()` - Word discovery with board reference
- `forEachWordCell()` - Iterate over word cells (eliminates duplication)
- `areUnlockedTilesInSingleLine()` - Single line validation
- `doesCurrentPlayTouchLocked()` - Connection validation

### Rack Domain (`src/domain/rack/Rack.ts`)

**Purpose**: Pure rack operations.

#### Key Functions
- `createEmpty()` - Initialize rack
- `addAt()` / `removeAt()` - Tile insertion/removal
- `shuffle()` - Randomize tile order
- `count()` / `isFull()` - Rack queries

### Other Domain Modules

- **Bag Domain**: Tile bag creation, shuffling, drawing
- **Stickers Domain**: Bonus system logic and consumption
- **Dictionary Domain**: Word validation and loading
- **Draft Domain**: Draft mode board management

## Testing Strategy

### GameService Testing
High-level operations are tested end-to-end:

```typescript
describe('GameService.placeFromRack', () => {
    it('should orchestrate complete placement operation', () => {
        const board = Board.createEmpty();
        const rack: RackState = [tileA, null, tileB, null];
        const history: PlacementHistoryEntry[] = [];

        const result = GameService.placeFromRack(rack, 0, board, { row: 7, col: 7 }, history);

        expect(result).not.toBeNull();
        expect(result!.board[7][7].tile).toEqual(tileA);
        expect(result!.rack[0]).toBeNull();
        expect(result!.placementHistory).toHaveLength(1);
    });
});
```

### Rules Engine Testing
Validation logic is thoroughly tested:

```typescript
describe('Rules.areAllCurrentWordsValid', () => {
    it('should validate complete play requirements', () => {
        const board = createTestBoardWithWords();
        const stickers = Stickers.createInitialStickers();

        const result = Rules.areAllCurrentWordsValid(board, stickers, true);

        expect(result.isValid).toBe(true);
    });

    it('should reject invalid words', () => {
        const board = createTestBoardWithInvalidWord();
        const result = Rules.areAllCurrentWordsValid(board, stickers, true);

        expect(result.isValid).toBe(false);
        expect(result.reason).toContain('Invalid words');
    });
});
```

### Domain Module Testing
Pure functions enable focused unit tests:

```typescript
describe('Board.forEachWordCell', () => {
    it('should iterate over horizontal word cells', () => {
        const word: WordInfo = {
            word: 'CAT',
            position: { row: 7, col: 7 },
            direction: 'horizontal',
            isLocked: false,
            board: testBoard
        };

        const cells: Position[] = [];
        Board.forEachWordCell(word, (pos) => cells.push(pos));

        expect(cells).toEqual([
            { row: 7, col: 7 },
            { row: 7, col: 8 },
            { row: 7, col: 9 }
        ]);
    });
});
```

## Performance Characteristics

### Atomic Updates
`batchUpdate` ensures consistent state transitions:

```typescript
// Single state commit for complex operations
batchUpdate({
    board: newBoard,
    rack: newRack,
    placementHistory: newHistory,
    // All related state changes
});
```

### Selective Re-rendering
Zustand's selective subscriptions prevent unnecessary re-renders:

```typescript
// Only components using board state re-render
const board = useGameStore((state) => state.board);
const canPlay = useCanPlay(); // Separate selector
```

### Algorithm Efficiency
- Word finding: O(n²) with optimized traversal
- Tile operations: O(1) using immutable updates
- State updates: O(1) with selective subscriptions

## Architecture Benefits

1. **Clear Separation**: GameService (orchestration) → Rules (validation) → Domain (pure ops)
2. **Testability**: Each layer can be tested in isolation
3. **Maintainability**: Changes to game logic are localized
4. **Performance**: Immutable updates enable React optimization
5. **Type Safety**: Full TypeScript coverage with runtime validation
6. **Framework Independence**: Engine logic works without React/Zustand

## Future Enhancements

1. **Error Types**: Structured error results instead of boolean/null returns
2. **Async Operations**: Support for async game operations (AI moves, network play)
3. **State History**: Undo/redo functionality using placement history
4. **Performance Monitoring**: Metrics for operation timing and re-render frequency
5. **Rule Extensions**: Plugin system for custom game variants

The refactored engine layer provides a robust, testable, and maintainable foundation for the Scrabble game while remaining adaptable to future requirements.
