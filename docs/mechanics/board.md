# Board Mechanics

This document explains the game board system, including state structure, word finding, placement validation, and game rules enforcement.

## Board Structure

### Physical Layout

The board is an 11x11 grid (`BOARD_SIZE = 11`) with each cell containing:

```typescript
interface BoardCellState {
    tile: TileData | null;    // The tile in this cell
    canPlace: boolean;       // Can new tiles be placed here?
    canTake: boolean;        // Can tiles be removed from here?
}
```

### Cell States

Cells have different states that control gameplay:

| State | canPlace | canTake | Description |
|-------|----------|---------|-------------|
| **Empty Placeable** | true | true | Standard empty cell for placement |
| **Locked Tile** | false | false | Played tile (cannot move or replace) |
| **Temporary Tile** | false | true | Currently placed tile (can be moved) |

### Board Initialization

`src/domain/board/Board.ts` creates the initial board:

```typescript
export function createEmpty(): BoardState {
    const initialBoard: BoardState = Array(BOARD_SIZE).fill(null).map(() =>
        Array(BOARD_SIZE).fill(null).map(() => ({
            tile: null,
            canPlace: true,   // All cells start placeable
            canTake: true     // All cells start takeable
        }))
    );
    return initialBoard;
}
```

## Word Finding System

### findAllWords() Function

The core word finding algorithm in `src/domain/board/Board.ts`:

```typescript
export function findAllWords(board: BoardState): WordInfo[] {
    const words: WordInfo[] = [];

    // Find horizontal words
    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            // Check if this starts a horizontal word
            const isLeftmost = col === 0 || board[row][col - 1].tile === null;

            if (tile && isLeftmost) {
                // Collect consecutive tiles to the right
                let word = '';
                let currentCol = col;
                let allTilesLocked = true;

                while (currentCol < BOARD_SIZE && board[row][currentCol].tile) {
                    word += board[row][currentCol].tile!.value;
                    if (board[row][currentCol].canTake) {
                        allTilesLocked = false; // Has unlocked tiles
                    }
                    currentCol++;
                }

                if (word.length >= 2) { // Valid words need 2+ letters
                    words.push({
                        word,
                        position: { row, col },
                        direction: 'horizontal',
                        isLocked: allTilesLocked
                    });
                }
            }
        }
    }

    // Find vertical words (similar logic)
    // ... vertical word finding code

    return words;
}
```

### WordInfo Structure

Each found word includes:

```typescript
interface WordInfo {
    word: string;                    // The word text (e.g., "HELLO")
    position: Position;              // Starting position {row, col}
    direction: 'horizontal' | 'vertical'; // Word orientation
    isLocked: boolean;              // True if all tiles are locked (canTake=false)
}
```

### Word Detection Rules

- **Minimum Length**: Words must be 2+ letters
- **Contiguous**: All letters must be adjacent with no gaps
- **Boundaries**: Words stop at board edges or empty cells
- **Starting Points**: Only the leftmost/topmost cell of each word is recorded

## Placement Validation

### Single Line Rule: areUnlockedTilesInSingleLine()

All currently placed tiles (canTake=true) must form a single contiguous line:

```typescript
export function areUnlockedTilesInSingleLine(board: BoardState): boolean {
    // Collect all unlocked tile positions
    const unlockedPositions: Position[] = [];
    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            const cell = board[row][col];
            if (cell.tile && cell.canTake) {
                unlockedPositions.push({ row, col });
            }
        }
    }

    if (unlockedPositions.length === 0) return true; // Empty board is valid
    if (unlockedPositions.length === 1) return true; // Single tile is valid

    // Check if all tiles are in the same row
    const allSameRow = unlockedPositions.every(pos => pos.row === unlockedPositions[0].row);
    if (allSameRow) {
        return checkRowGaps(unlockedPositions);
    }

    // Check if all tiles are in the same column
    const allSameCol = unlockedPositions.every(pos => pos.col === unlockedPositions[0].col);
    if (allSameCol) {
        return checkColumnGaps(unlockedPositions);
    }

    return false; // Tiles scattered across multiple rows AND columns
}
```

### Gap Filling Rules

When tiles are in a line, gaps can be filled by locked tiles:

```typescript
function checkRowGaps(sortedPositions: Position[]): boolean {
    const row = sortedPositions[0].row;

    for (let i = 1; i < sortedPositions.length; i++) {
        const currentCol = sortedPositions[i].col;
        const prevCol = sortedPositions[i-1].col;

        if (currentCol - prevCol > 1) { // Gap exists
            // Check if gap is filled by locked tiles
            let hasLockedTileInGap = false;
            for (let col = prevCol + 1; col < currentCol; col++) {
                if (board[row][col].tile && !board[row][col].canTake) {
                    hasLockedTileInGap = true;
                    break;
                }
            }
            if (!hasLockedTileInGap) return false; // Invalid gap
        }
    }
    return true;
}
```

### Connection Rule: doesCurrentPlayTouchLocked()

New placements must connect to existing locked tiles (except first play):

```typescript
export function doesCurrentPlayTouchLocked(board: BoardState): boolean {
    // Pre-scan for any locked tiles
    let hasLockedTile = false;
    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            if (board[row][col].tile && !board[row][col].canTake) {
                hasLockedTile = true;
                break;
            }
        }
    }

    if (!hasLockedTile) return false; // First play - no locked tiles to touch

    const deltas = [
        { dr: -1, dc: 0 }, // up
        { dr: 1, dc: 0 },  // down
        { dr: 0, dc: -1 }, // left
        { dr: 0, dc: 1 },  // right
    ];

    // Check each unlocked tile for adjacency to locked tiles
    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            const cell = board[row][col];
            if (!cell.tile || !cell.canTake) continue;

            // Check all four directions
            for (const { dr, dc } of deltas) {
                const nr = row + dr, nc = col + dc;
                if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
                    const neighbor = board[nr][nc];
                    if (neighbor.tile && !neighbor.canTake) {
                        return true; // Touches locked tile
                    }
                }
            }
        }
    }

    return false; // No connection to locked tiles
}
```

## Placement Permissions

### canPlace and canTake Logic

Cell permissions control what actions are allowed:

#### canPlace Rules
- **Empty cells**: `canPlace = true` (can receive new tiles)
- **Occupied cells**: `canPlace = false` (cannot place on existing tiles)
- **Exception**: Can place on takeable tiles (swapping)

#### canTake Rules
- **Fresh placements**: `canTake = true` (can be moved/removed)
- **Locked tiles**: `canTake = false` (permanent after play resolution)

### Placement Validation in Engine

`TileOperations.placeTileOnBoardFromRack()` validates placements:

```typescript
export function placeTileOnBoardFromRack(
    rack: RackState, rackIndex: number, board: BoardState, targetPosition: Position
): PlaceTileOnBoardResult | null {
    const tile = rack[rackIndex];
    if (!tile) return null;

    const targetCell = board[targetPosition.row][targetPosition.col];
    if (!targetCell.canPlace) return null;

    // Handle swapping if target has a tile
    const swappedTile = targetCell.tile && targetCell.canTake ? targetCell.tile : null;

    // Update states...
}
```

## Play Resolution Effects

### Tile Locking

When a play is resolved, tiles become permanent:

```typescript
// In PlayResolution.resolvePlay()
const lockedBoard: BoardState = args.board.map(row =>
    row.map(cell => (cell.tile && cell.canTake
        ? { ...cell, canPlace: false, canTake: false }  // Lock tile
        : cell))
);
```

### State Transitions

| Action | Before | After |
|--------|--------|-------|
| **Place Tile** | canPlace: true, canTake: true | canPlace: false, canTake: true |
| **Resolve Play** | canTake: true | canTake: false (permanent) |
| **Remove Tile** | canTake: true | canPlace: true, canTake: true |

## Special Rules

### First Play Requirement

The first play must cover the center sticker position (5,5):

```typescript
// In canPlaySelector
const startStickerConsumed = isStartStickerConsumed(stickers);
if (!startStickerConsumed) {
    const allWordsCoverStart = currentWords.every(wordInfo =>
        doesWordCoverStartSticker(wordInfo, stickers)
    );
    if (!allWordsCoverStart) return false;
}
```

### Start Sticker Coverage

`doesWordCoverStartSticker()` checks if a word covers the center:

```typescript
export function doesWordCoverStartSticker(word: WordInfo, stickers: StickerState): boolean {
    const startRow = 5, startCol = 5;

    if (word.direction === 'horizontal') {
        return word.position.row === startRow &&
               startCol >= word.position.col &&
               startCol < word.position.col + word.word.length;
    } else {
        return word.position.col === startCol &&
               startRow >= word.position.row &&
               startRow < word.position.row + word.word.length;
    }
}
```

## Board Analysis Utilities

### Empty Slot Parsing

`parseEmptySlotId()` converts drag target IDs to positions:

```typescript
export function parseEmptySlotId(slotId: string): Position | null {
    if (!slotId.startsWith('empty-')) return null;
    const [, rowStr, colStr] = slotId.split('-');
    return { row: parseInt(rowStr), col: parseInt(colStr) };
}
```

### Board Coordinate System

- **Origin**: Top-left is (0,0)
- **Rows**: 0-10 (top to bottom)
- **Columns**: 0-10 (left to right)
- **Center**: (5,5) - start sticker position

## Visual Representation

### Board Rendering

`src/components/Board.tsx` renders the board grid:

```typescript
return (
    <div className="grid gap-1 p-1 bg-green-800 border border-10 border-green-900 rounded-lg aspect-square"
         style={{ gridTemplateColumns: `repeat(${BOARD_SIZE}, minmax(0, 1fr))` }}>
        {board.map((row, rowIndex) =>
            row.map((cell, colIndex) => (
                <BoardCell
                    key={`${rowIndex}-${colIndex}`}
                    tile={cell.tile}
                    canPlace={cell.canPlace}
                    canTake={cell.canTake}
                    row={rowIndex}
                    col={colIndex}
                    // ... other props
                />
            ))
        )}
    </div>
);
```

### Cell Visual States

Cells show different visual feedback:

- **Empty placeable**: Standard background
- **Occupied takeable**: Shows tile, draggable
- **Occupied locked**: Shows tile, not draggable
- **Selected**: Keyboard selector highlight
- **Drop target**: Drag hover highlight

## Error Conditions

### Invalid Board States

The system handles various error conditions:

- **Disconnected tiles**: Single line rule violations
- **Invalid words**: Dictionary validation failures
- **Missing connections**: Connection rule violations
- **First play violations**: Start sticker not covered

### Validation Timing

Validation occurs at different times:

- **During placement**: Immediate feedback for invalid moves
- **Play attempt**: Full validation before locking tiles
- **Real-time**: UI updates validity indicators

## Refactoring Opportunities

1. **Board Size**: Make board dimensions configurable
2. **Placement Rules**: Support for different rule sets
3. **Word Finding**: Optimize for larger boards
4. **Validation**: Separate validation concerns from engine functions
5. **Board Analysis**: Add more utility functions for board inspection
6. **Visual Feedback**: Better indication of valid/invalid placements

The board system provides a solid foundation for Scrabble-like gameplay with comprehensive rule enforcement and validation.
