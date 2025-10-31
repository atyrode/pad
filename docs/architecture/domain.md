# Domain Layer Architecture

This document explains the domain layer design pattern used in the Manifold codebase, which provides pure functional modules for core game mechanics.

## Domain Layer Overview

The domain layer contains pure, immutable functions that encapsulate the core business logic of the Scrabble game. These modules are completely independent of React, UI, or state management concerns.

```
src/domain/
├── board/Board.ts      # Board state management and word finding
├── rack/Rack.ts        # Rack operations and tile management
├── bag/Bag.ts          # Tile bag creation and shuffling
├── stickers/Stickers.ts # Bonus system logic
├── dictionary/Dictionary.ts # Word validation
└── draft/Draft.ts      # Draft mode mechanics
```

## Design Principles

### 1. Pure Functions
All domain functions are pure - they take inputs and return outputs without side effects:

```typescript
// ✅ Pure function
export function setTile(board: BoardState, pos: Position, tile: TileData | null): BoardState {
    // Returns new board, no mutations
    return board.map(row => row.map(cell =>
        cell.row === pos.row && cell.col === pos.col
            ? { ...cell, tile }
            : cell
    ));
}

// ❌ Impure function (has side effects)
export function updateBoard(pos: Position, tile: TileData) {
    globalBoard[pos.row][pos.col].tile = tile; // Mutation!
}
```

### 2. Immutable Data Structures
All state updates return new objects rather than mutating existing ones:

```typescript
export function addToRack(rack: RackState, tile: TileData): RackState {
    const newRack = [...rack];
    const emptyIndex = newRack.findIndex(slot => slot === null);
    if (emptyIndex !== -1) {
        newRack[emptyIndex] = tile;
    }
    return newRack;
}
```

### 3. Single Responsibility
Each domain module has a focused responsibility:

- **Board**: Board state, word finding, position calculations
- **Rack**: Tile rack management, slot operations
- **Bag**: Tile bag creation, shuffling, drawing
- **Stickers**: Bonus system logic, sticker consumption
- **Dictionary**: Word validation, dictionary loading
- **Draft**: Draft mode board creation and management

### 4. Comprehensive APIs
Domain modules provide complete APIs for their areas:

```typescript
// Board module exports
export function createEmpty(): BoardState;
export function setTile(board: BoardState, pos: Position, tile: TileData | null): BoardState;
export function clearTile(board: BoardState, pos: Position): BoardState;
export function findAllWords(board: BoardState): WordInfo[];
export function withinBounds(pos: Position): boolean;
// ... many more functions
```

## Module Structure

Each domain module follows a consistent structure:

### 1. Type Definitions
Modules define their own interfaces and types:

```typescript
// In Board.ts
export interface WordInfo {
    word: string;
    position: Position;
    direction: 'horizontal' | 'vertical';
    isLocked: boolean;
    board?: BoardState;
}
```

### 2. Factory Functions
Create initial states:

```typescript
export function createEmpty(): BoardState {
    return Array(BOARD_SIZE).fill(null).map(() =>
        Array(BOARD_SIZE).fill(null).map(() => ({
            tile: null,
            canPlace: true,
            canTake: true
        }))
    );
}
```

### 3. State Operations
Pure functions that transform state:

```typescript
export function shuffle(rack: RackState): RackState {
    const tiles = rack.filter(tile => tile !== null);
    const shuffled = [...tiles].sort(() => Math.random() - 0.5);
    return shuffled.concat(Array(rack.length - shuffled.length).fill(null));
}
```

### 4. Query Functions
Read-only operations that extract information:

```typescript
export function count(rack: RackState): number {
    return rack.filter(tile => tile !== null).length;
}

export function isFull(rack: RackState): boolean {
    return rack.every(tile => tile !== null);
}
```

## Integration with Engine Layer

Domain modules are used by the Engine layer, which orchestrates complex operations:

```typescript
// In GameService.ts
import * as Board from '../domain/board/Board';
import * as Rack from '../domain/rack/Rack';

static placeFromRack(rack: RackState, rackIndex: number, board: BoardState): PlaceFromRackResult {
    const tile = rack[rackIndex];
    if (!tile) return null;

    // Use domain functions
    const newBoard = Board.setTile(board, targetPosition, tile);
    const newRack = Rack.removeAt(rack, rackIndex);

    return { board: newBoard, rack: newRack };
}
```

## Testing Benefits

Pure functions are easily testable:

```typescript
describe('Board.setTile', () => {
    it('should place tile at correct position', () => {
        const board = Board.createEmpty();
        const tile = { id: 'A1', value: 'A', score: 1 };

        const result = Board.setTile(board, { row: 0, col: 0 }, tile);

        expect(result[0][0].tile).toEqual(tile);
        expect(result[0][1].tile).toBeNull(); // Other positions unchanged
    });
});
```

## Performance Considerations

### 1. Immutable Updates
While immutability creates new objects, the shallow copy approach minimizes memory usage:

```typescript
export function setTile(board: BoardState, pos: Position, tile: TileData | null): BoardState {
    // Only creates new arrays for changed rows
    return board.map((row, rowIndex) =>
        rowIndex === pos.row
            ? row.map((cell, colIndex) =>
                colIndex === pos.col ? { ...cell, tile } : cell
              )
            : row
    );
}
```

### 2. Memoization Opportunities
Complex computations can be memoized where appropriate:

```typescript
export const BOARD_SIZE = 11; // Compile-time constant
export const CELL_COUNT = BOARD_SIZE * BOARD_SIZE; // Pre-computed
```

## Evolution and Maintenance

### Adding New Domain Logic
When adding new game mechanics:

1. Identify which domain module should own the logic
2. Add pure functions following the established patterns
3. Update Engine layer to use new domain functions
4. Add comprehensive tests

### Refactoring Existing Logic
When refactoring:

1. Ensure all functions remain pure
2. Maintain existing APIs or provide migration path
3. Update Engine layer callers
4. Verify all tests still pass

## Benefits

1. **Testability**: Pure functions are easily unit tested
2. **Reusability**: Domain logic can be used across different contexts
3. **Maintainability**: Clear separation of concerns
4. **Performance**: Immutable updates enable React optimization
5. **Reliability**: No side effects means predictable behavior
6. **Framework Independence**: Domain logic works without React/Zustand

The domain layer serves as the solid foundation that ensures game logic remains correct, testable, and maintainable regardless of UI or state management changes.
