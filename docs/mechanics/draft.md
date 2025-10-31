# Draft Mode Mechanics

This document explains the draft mode system, which allows players to select initial tiles before starting the main game.

## Draft Mode Overview

Draft mode serves as a pre-game phase where players:

1. **Select Tiles**: Choose from randomly suggested tiles
2. **Build Setup**: Arrange tiles in a designated placement zone
3. **Seed Bag**: Use selected tiles to populate the game bag
4. **Transition**: Move to regular game mode with prepared tiles

## Draft Board Structure

### Board Layout

The draft board uses the same 11x11 grid as the main game but with restricted placement:

```
┌─────────────────────────────────────┐
│ D R A F T                           │ ← Row 1: "DRAFT" title (locked)
├─────────────────────────────────────┤
│                                     │
│                                     │
│   ○   ○   ○                         │ ← Rows 4,2/5/8: Suggestion positions
│                                     │
│                                     │
│                                     │
│ ████████████████████                │ ← Rows 7-8: Placement zone (7 columns)
│ ████████████████████                │
│                                     │
│                                     │
└─────────────────────────────────────┘
```

### Placement Rules

- **Placement Zone**: Only rows 7-8, center 7 columns (positions 2-8) allow placement
- **Suggestion Zone**: Rows 4, columns 2/5/8 show tile suggestions (canTake=true, canPlace=false)
- **Title Zone**: Row 1 shows "DRAFT" in locked tiles
- **Restricted Areas**: All other positions have canPlace=false

## Draft Board Initialization

### createInitialDraftBoard()

`src/domain/draft/Draft.ts` creates the draft board:

```typescript
export function createInitialDraftBoard(): BoardState {
    const board = Board.createEmpty();

    // Disable placement everywhere by default
    for (let r = 0; r < board.length; r++) {
        for (let c = 0; c < board[r].length; c++) {
            board[r][c] = { ...board[r][c], canPlace: false };
        }
    }

    // Enable placement in center zone (rows 7-8, center 7 columns)
    const centerCount = 7;
    const centerStart = Math.floor((BOARD_SIZE - centerCount) / 2);
    [7, 8].forEach(rowIdx => {
        for (let c = centerStart; c < centerStart + centerCount; c++) {
            board[rowIdx][c] = { ...board[rowIdx][c], canPlace: true };
        }
    });

    // Add "DRAFT" title
    const draftLetters = ['D', 'R', 'A', 'F', 'T'];
    draftLetters.forEach((letter, index) => {
        const col = 3 + index; // Center on 11-column board
        const tile = createTileFromLetter(letter, `draft-${letter}-1-${col}`);
        board[1][col] = {
            tile,
            canPlace: false,
            canTake: false
        };
    });

    // Add initial vowel suggestions
    const initialVowels = Draft.generateUniqueTiles(2, 'vowel');
    board[4][2] = { tile: initialVowels[0], canPlace: false, canTake: true };
    board[4][8] = { tile: initialVowels[1], canPlace: false, canTake: true };
    board[4][5] = { tile: null, canPlace: false, canTake: true }; // Empty center

    return board;
}
```

## Suggestion System

### Suggestion Positions

Tiles are suggested at three positions: `(4,2)`, `(4,5)`, `(4,8)`

- **Left/Right**: Start with random vowels
- **Center**: Starts empty, filled during rerolls

### Reroll Mechanics: useDraftSuggestionsReroll

`src/hooks/useDraftSuggestionsReroll.ts` manages suggestion regeneration:

```typescript
export function useDraftSuggestionsReroll(args: {
    isDraftMode: boolean;
    draftBoard: BoardState;
    draftEnded: boolean;
    draftRerollCount: number;
    setDraftBoard: (updater) => void;
    setDraftRerollCount: (updater) => void;
    setDraftEnded: (updater) => void;
    suggestedOccupancyRef: React.MutableRefObject<Occupancy | null>;
}) {
    // Generates new suggestions when triggered
}
```

### Reroll Process

1. **Trigger**: Called when player clicks reroll or reaches reroll limit
2. **Generate**: Create new tile suggestions based on patterns
3. **Update Board**: Apply new tiles to suggestion positions
4. **Track Count**: Increment reroll counter

### Occupancy Patterns

Suggestions follow patterns defined by `Occupancy` (boolean array):

```typescript
type Occupancy = [boolean, boolean, boolean]; // [left, center, right]

// Example patterns:
// [true, true, true] - All three positions filled
// [true, false, true] - Vowels on sides, empty center
// [false, true, false] - Single tile in center
```

### Reroll Limit

Players get limited rerolls (tracked by `draftRerollCount`). When limit reached, `draftEnded` becomes true.

## Tile Placement in Draft

### Placement Zone

Players can drag tiles from suggestions to the placement zone (rows 7-8):

- **Source**: Suggestion positions (canTake=true)
- **Target**: Placement zone (canPlace=true)
- **Movement**: Standard drag-and-drop using `TileOperations`

### Special Right-Click

Draft mode has special right-click behavior for suggestions:

```typescript
const handleDraftSuggestionRightClick = (tile, position) => {
    // Only works on suggestion positions (4,2/5/8)
    const isFromSuggested = suggestedPositions.some(pos =>
        pos.row === position.row && pos.col === position.col
    );

    if (!isFromSuggested) return false;

    // Move tile to first available placement slot
    const target = findFirstEmptyPlacementSlot(draftBoard);
    if (!target) return false;

    // Swap tile to placement zone
    setDraftBoard(prevBoard => {
        const newBoard = prevBoard.map(row => [...row]);
        newBoard[position.row][position.col] = { ...newBoard[position.row][position.col], tile: null };
        newBoard[target.row][target.col] = { ...newBoard[target.row][target.col], tile };
        return newBoard;
    });
};
```

## Bag Seeding: useSeedBagFromDraft

### Transition Trigger

When draft ends (`draftEnded = true`), the system seeds the game bag:

```typescript
useSeedBagFromDraft({
    isDraftMode: state.isDraftMode,
    draftBoard: state.draftBoard,
    draftEnded: state.draftEnded,
    hasSeededFromDraft: state.hasSeededFromDraft,
    setBag: setters.setBag,
    setHasSeededFromDraft: setters.setHasSeededFromDraft,
});
```

### Seeding Process

```typescript
useEffect(() => {
    if (!isDraftMode || !draftEnded || hasSeededFromDraft) return;

    // Extract tiles from placement zone (rows 7-8, center 7 columns)
    const centerCount = 7;
    const centerStart = Math.floor((11 - centerCount) / 2);
    const positions = [7, 8].flatMap(r =>
        Array.from({ length: centerCount }, (_, i) => ({ row: r, col: centerStart + i }))
    );

    const draftedTiles = positions
        .map(p => draftBoard[p.row][p.col].tile)
        .filter(Boolean) as TileData[];

    if (draftedTiles.length !== 14) return; // Must have exactly 14 tiles

    // Create and shuffle bag
    const newBag = TileSupply.shuffleBag([...draftedTiles]);
    setBag(newBag);
    setHasSeededFromDraft(true);
}, [isDraftMode, draftBoard, draftEnded, hasSeededFromDraft]);
```

### Tile Requirements

- **Count**: Exactly 14 tiles must be placed in the placement zone
- **Validation**: System waits until exactly 14 tiles are present
- **Shuffle**: Final bag is shuffled before game begins

## Draft vs Game Mode Differences

### Board Differences

| Aspect | Draft Mode | Game Mode |
|--------|------------|-----------|
| **Board Type** | DraftBoard | Board |
| **Placement Rules** | Restricted zone | Full board |
| **Stickers** | Visual only (stars) | Functional bonuses |
| **Tile Locking** | No locking | Tiles lock after play |

### Interaction Differences

| Aspect | Draft Mode | Game Mode |
|--------|------------|-----------|
| **Drag Sources** | Suggestions only | Rack + board |
| **Right-click** | Special suggestion logic | Standard removal |
| **Keyboard** | Disabled | Full support |
| **Play Button** | N/A | Validates and locks tiles |

### State Differences

| State | Draft Mode | Game Mode |
|--------|------------|-----------|
| **isDraftMode** | true | false |
| **bag** | Empty [] | Seeded from draft |
| **draftBoard** | Active | Static (preserved) |
| **placementHistory** | N/A | Tracks placements |

## Draft Completion

### Automatic Transition

Draft mode ends when:

1. **Reroll Limit**: `draftRerollCount` reaches maximum
2. **Manual End**: Player clicks end draft (not implemented in current UI)

### Transition Effects

When draft ends:

1. **Bag Seeding**: Placement zone tiles → game bag
2. **Mode Switch**: `isDraftMode = false`
3. **UI Transition**: Smooth animation to game board
4. **Game Start**: Player can begin placing tiles

## Visual Design

### Draft Board Styling

- **Background**: Blue theme (`bg-blue-800 border-blue-900`)
- **Placement Zone**: Highlighted with star stickers
- **Suggestions**: Prominent display at top
- **Title**: "DRAFT" clearly visible

### Transition Animation

- **Fade Out**: Draft board fades as game board fades in
- **Smooth Transition**: CSS transitions between modes
- **State Preservation**: Draft board remains accessible for reference

## Error Handling

### Invalid Draft States

- **Incomplete Placement**: System waits for exactly 14 tiles
- **Missing Suggestions**: Handles empty suggestion slots gracefully
- **Invalid Moves**: Prevents placement outside allowed zones

### Recovery Mechanisms

- **Reset Draft**: Debug menu can reset draft state
- **State Validation**: Checks ensure valid transitions
- **Fallback Behavior**: Graceful handling of edge cases

## Refactoring Opportunities

1. **Draft Configuration**: Make placement zone size configurable
2. **Suggestion Algorithms**: More sophisticated tile suggestion logic
3. **Draft Persistence**: Save draft progress between sessions
4. **Multiplayer Draft**: Support for multiple players drafting
5. **Draft Analytics**: Track which suggestions players choose
6. **Tutorial Integration**: Guide new players through draft process

The draft system provides an engaging pre-game experience but could benefit from more dynamic suggestion algorithms and better player guidance.
