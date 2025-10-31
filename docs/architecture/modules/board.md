# Board Domain Module

This document describes the Board domain module, which encapsulates all board-related operations in a single, self-contained API.

## Overview

The Board module (`src/domain/board/Board.ts`) provides a clean, immutable API for all board operations. It replaces the scattered utilities that were previously in `src/utils/boardUtils.ts`.

## API

### Word Information

```typescript
interface WordInfo {
    word: string;
    position: Position;
    direction: 'horizontal' | 'vertical';
    isLocked: boolean;
}
```

### Core Operations

#### `createEmpty(): BoardState`
Create an empty board with the standard size (11x11).

```typescript
const board = Board.createEmpty();
```

#### `parseEmptySlotId(id: string): Position | null`
Parse an empty board slot ID string to extract the position.

```typescript
const position = Board.parseEmptySlotId("empty-5-7");
// Returns { row: 5, col: 7 } or null if invalid
```

#### `withinBounds(pos: Position): boolean`
Check if a position is within board bounds.

```typescript
if (Board.withinBounds({ row: 5, col: 7 })) {
    // Position is valid
}
```

### Cell Operations

#### `getCell(board: BoardState, pos: Position)`
Get a cell at a specific position.

```typescript
const cell = Board.getCell(board, { row: 5, col: 7 });
```

#### `setTile(board: BoardState, pos: Position, tile: TileData): BoardState`
Set a tile at a specific position (immutable).

```typescript
const newBoard = Board.setTile(board, { row: 5, col: 7 }, tile);
```

#### `clearTile(board: BoardState, pos: Position): BoardState`
Clear a tile at a specific position (immutable).

```typescript
const newBoard = Board.clearTile(board, { row: 5, col: 7 });
```

### Word and Validation Operations

#### `findAllWords(board: BoardState): WordInfo[]`
Find all words on the board (both horizontal and vertical).

```typescript
const words = Board.findAllWords(board);
// Returns array of WordInfo objects for all words found
```

#### `areUnlockedTilesInSingleLine(board: BoardState): boolean`
Check if all unlocked tiles on the board form a single contiguous line.

```typescript
if (Board.areUnlockedTilesInSingleLine(board)) {
    // Tiles form a valid single line
}
```

#### `doesCurrentPlayTouchLocked(board: BoardState): boolean`
Check if any currently placed unlocked tile touches a locked tile.

```typescript
if (Board.doesCurrentPlayTouchLocked(board)) {
    // Play connects to existing words
}
```

## Invariants

- **Immutability**: All operations return new board states; input boards are never modified
- **Bounds Checking**: Operations validate positions and handle edge cases gracefully
- **Type Safety**: All operations are strongly typed with BoardState and Position
- **Pure Functions**: No side effects, deterministic results

## Usage Examples

### Basic Operations
```typescript
import * as Board from "src/domain/board/Board";

// Create and populate a board
let board = Board.createEmpty();
board = Board.setTile(board, { row: 5, col: 7 }, tileA);
board = Board.setTile(board, { row: 5, col: 8 }, tileB);

// Check validity
const words = Board.findAllWords(board);
const isValidLine = Board.areUnlockedTilesInSingleLine(board);
const touchesLocked = Board.doesCurrentPlayTouchLocked(board);
```

### Integration with Engine
```typescript
// In PlayResolution.ts
import * as Board from "../domain/board/Board";

export function calculateCurrentPlayScore(board: BoardState, stickers: StickerState): PlayScore {
    const words = Board.findAllWords(board);
    const currentWords = words.filter(w => !w.isLocked);
    // ... calculate score
}
```

### Component Usage
```typescript
// In components
import * as Board from "../domain/board/Board";

function BoardAnalysis({ board }: { board: BoardState }) {
    const wordCount = Board.findAllWords(board).length;
    const isValidPlay = Board.areUnlockedTilesInSingleLine(board);

    return (
        <div>
            <p>Words: {wordCount}</p>
            <p>Valid line: {isValidPlay ? 'Yes' : 'No'}</p>
        </div>
    );
}
```

## Selectors

Board operations are used in state selectors for computed values:

```typescript
// In selectors.ts
import * as Board from "../domain/board/Board";

export function canPlaySelector(args: { board: BoardState; stickers: StickerState; isDictionaryLoaded: boolean }): boolean {
    if (!args.isDictionaryLoaded) return false;

    const words = Board.findAllWords(args.board);
    const currentWords = words.filter(w => !w.isLocked);

    if (currentWords.length === 0) return false;
    if (!Board.areUnlockedTilesInSingleLine(args.board)) return false;

    // ... additional validation
}
```

## Migration Notes

This module replaces the previous `src/utils/boardUtils.ts` utilities. All function names remain the same except for `createInitialBoard` → `createEmpty`:

| Old Function | New Function | Notes |
|--------------|--------------|-------|
| `createInitialBoard()` | `Board.createEmpty()` | Renamed for clarity |
| `parseEmptySlotId()` | `Board.parseEmptySlotId()` | Same behavior |
| `findAllWords()` | `Board.findAllWords()` | Same behavior |
| `areUnlockedTilesInSingleLine()` | `Board.areUnlockedTilesInSingleLine()` | Same behavior |
| `doesCurrentPlayTouchLocked()` | `Board.doesCurrentPlayTouchLocked()` | Same behavior |

## Constants

Board size is defined in `src/constants/board.ts`:

```typescript
export const BOARD_SIZE = 11;
```

This ensures the board size is defined in one place and can be easily changed if needed.

## Word Finding Algorithm

The `findAllWords` function implements a comprehensive word-finding algorithm:

1. **Horizontal Scanning**: For each row, find consecutive tile sequences starting at leftmost positions
2. **Vertical Scanning**: For each column, find consecutive tile sequences starting at topmost positions
3. **Word Validation**: Only sequences of 2+ tiles are considered valid words
4. **Lock Detection**: Words are marked as locked if all tiles are non-takeable (canTake = false)

## Validation Rules

### Single Line Validation
The `areUnlockedTilesInSingleLine` function enforces that all unlocked tiles:
- Are in the same row OR same column
- Form a contiguous line (allowing gaps only where filled by locked tiles)

### Touch Validation
The `doesCurrentPlayTouchLocked` function ensures new plays connect to existing words by checking if any unlocked tile is orthogonally adjacent to a locked tile.
