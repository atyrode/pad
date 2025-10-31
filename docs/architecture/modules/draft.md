# Draft Domain Module

This document describes the Draft domain module, which encapsulates all draft-mode operations in a single, self-contained API.

## Overview

The Draft module (`src/domain/draft/Draft.ts`) provides a clean, immutable API for draft-mode functionality including board initialization, tile generation, and suggestion application. It replaces the scattered draft utilities that were previously in `src/utils/draftBoardUtils.ts`.

## API

### Board Creation

#### `createInitialDraftBoard(): BoardState`
Creates the initial draft board with "DRAFT" spelled out and suggestion positions.

```typescript
const draftBoard = Draft.createInitialDraftBoard();
// Returns 11x11 board with:
// - "DRAFT" letters on row 1 (locked)
// - Playable area on rows 7-8, center 7 columns
// - Suggestion positions at (4,2), (4,5), (4,8) with initial vowels
```

### Tile Generation

#### `generateRandomTiles(count: number): TileData[]`
Generates random tiles from the full tile set.

```typescript
const randomTiles = Draft.generateRandomTiles(5);
// Returns 5 random tiles from all available letters
```

#### `generateUniqueTiles(count: number, type: 'vowel' | 'consonant'): TileData[]`
Generates unique tiles of specified type (vowels or consonants).

```typescript
const vowels = Draft.generateUniqueTiles(3, 'vowel');
// Returns 3 unique vowels: ['A', 'E', 'I'] (different tiles)
```

#### `createBlankTile(idSuffix?: string): TileData`
Creates a blank tile (wildcard).

```typescript
const blank = Draft.createBlankTile('special');
// Returns tile with value '*', score 0
```

### Position Management

#### `getDraftCenterPositions(): Position[]`
Returns the three suggestion positions in draft mode.

```typescript
const positions = Draft.getDraftCenterPositions();
// Returns [{row: 4, col: 2}, {row: 4, col: 5}, {row: 4, col: 8}]
```

### Suggestion Application

#### `applyDraftTiles(board: BoardState, tiles: Array<TileData|null>, occupancy: [boolean,boolean,boolean]): BoardState`
Applies tiles to the suggestion positions with specified occupancy pattern.

```typescript
const newBoard = Draft.applyDraftTiles(board, [vowelTile, null, consonantTile], [true, false, true]);
// Places vowel at position 0, nothing at position 1, consonant at position 2
```

## Invariants

- **Immutability**: All operations return new board/states; input data is never modified
- **Pure Functions**: No side effects, deterministic results based on inputs
- **Type Safety**: All operations are strongly typed with BoardState and TileData

## Draft Board Layout

The draft board follows a specific layout:

| Position | Content | Properties |
|----------|---------|------------|
| Row 1, Cols 3-7 | "D R A F T" | `canPlace: false, canTake: false` |
| Rows 7-8, Center 7 cols | Playable area | `canPlace: true` |
| Row 4, Cols 2/5/8 | Suggestions | `canPlace: false, canTake: true` |

## Usage Examples

### Initializing Draft Mode
```typescript
import * as Draft from "../domain/draft/Draft";

// Create initial draft board
const draftBoard = Draft.createInitialDraftBoard();

// Set up game state
setDraftBoard(draftBoard);
setIsDraftMode(true);
```

### Generating Suggestions
```typescript
// Generate vowel suggestions
const vowels = Draft.generateUniqueTiles(2, 'vowel');
const tiles = [vowels[0], null, vowels[1]]; // Center empty
const occupancy = [true, false, true];

// Apply to board
const updatedBoard = Draft.applyDraftTiles(draftBoard, tiles, occupancy);
```

### Rerolling Suggestions
```typescript
// Generate consonant suggestions for reroll
const consonants = Draft.generateUniqueTiles(3, 'consonant');
const allTiles = [consonants[0], consonants[1], consonants[2]];
const fullOccupancy = [true, true, true];

const rerolledBoard = Draft.applyDraftTiles(draftBoard, allTiles, fullOccupancy);
```

### Random Tile Generation
```typescript
// Generate random tiles for debug/testing
const randomTiles = Draft.generateRandomTiles(10);
```

## Implementation Details

### Tile Generation Algorithm
- **Random Tiles**: Uses `Math.random()` with `ALL_TILE_DEFINITIONS` for uniform distribution
- **Unique Tiles**: Filters by vowel/consonant, then selects without replacement
- **IDs**: Timestamp-based for uniqueness (`Date.now()` + sequential counter)

### Board Modification
- **Immutable Updates**: Creates new board arrays, never modifies input
- **Selective Updates**: Only modifies specific positions, preserves rest of board
- **Property Management**: Correctly sets `canPlace`/`canTake` flags for draft mode

### Position Constants
The suggestion positions are hardcoded for the 11x11 board layout:
- Position 0: Row 4, Column 2 (left suggestion)
- Position 1: Row 4, Column 5 (center suggestion)
- Position 2: Row 4, Column 8 (right suggestion)

## Migration Notes

This module replaces the functions that were previously in `src/utils/draftBoardUtils.ts`. All function names remain the same:

| Function | Notes |
|----------|-------|
| `createInitialDraftBoard()` | Same behavior |
| `generateRandomTiles()` | Same behavior |
| `generateUniqueTiles()` | Same behavior |
| `createBlankTile()` | Same behavior |
| `getDraftCenterPositions()` | Same behavior |
| `applyDraftTiles()` | Same behavior |

## Dependencies

The module imports from:
- `Board.createEmpty()` - For base board creation
- `getTileDefinition()` - For tile creation from letters
- `ALL_TILE_DEFINITIONS` - For tile generation pools
