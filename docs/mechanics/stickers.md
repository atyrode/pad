# Stickers Mechanics

This document explains the bonus sticker system, including types, placement, consumption, and scoring effects.

## Sticker Overview

Stickers provide bonus scoring opportunities on the board. They come in different types and are consumed when tiles are placed on them.

## Sticker Types

### Multi Stickers (×2, ×3)

**Purpose**: Multiply the total word score

```typescript
interface Sticker {
    type: 'multi';
    value: 2 | 3;        // Multiplication factor
    consumed: boolean;   // Whether used up
}
```

**Effect**: Multiplies the final word score by the sticker value
**Example**: Word worth 10 points on ×2 sticker = 20 points

### Points Stickers (+10, +20)

**Purpose**: Add bonus points to word score

```typescript
interface Sticker {
    type: 'points';
    value: 10 | 20;      // Points to add
    consumed: boolean;   // Whether used up
}
```

**Effect**: Adds points before applying multipliers
**Example**: Word worth 10 points + 10 point sticker = 20 points before multipliers

### Start Sticker

**Purpose**: Marks the center starting position

```typescript
interface Sticker {
    type: 'start';
    value: 0;            // No scoring bonus
    consumed: boolean;   // Whether covered
}
```

**Effect**: Must be covered by first play, then becomes inactive
**Special**: Doesn't provide scoring bonuses, only positional requirement

## Sticker Placement

### Initial Layout

`createInitialStickers()` in `src/domain/stickers/Stickers.ts` places stickers with 4-way rotational symmetry:

```typescript
export function createInitialStickers(): StickerState {
    const stickers: StickerState = Array(BOARD_SIZE).fill(null).map(() =>
        Array(BOARD_SIZE).fill(null)
    );

    // Multi stickers at corners (4-way symmetry)
    const multiPositions: Position[] = [
        { row: 1, col: 1 },   // Top-left
        { row: 1, col: 9 },   // Top-right
        { row: 9, col: 1 },   // Bottom-left
        { row: 9, col: 9 },   // Bottom-right
    ];

    // Points stickers closer to center (4-way symmetry)
    const pointsPositions: Position[] = [
        { row: 3, col: 3 },   // Top-left
        { row: 3, col: 7 },   // Top-right
        { row: 7, col: 3 },   // Bottom-left
        { row: 7, col: 7 },   // Bottom-right
    ];

    // Place multi stickers (×2)
    for (const pos of multiPositions) {
        stickers[pos.row][pos.col] = {
            type: 'multi',
            value: 2,
            consumed: false
        };
    }

    // Place points stickers (+10)
    for (const pos of pointsPositions) {
        stickers[pos.row][pos.col] = {
            type: 'points',
            value: 10,
            consumed: false
        };
    }

    // Place start sticker at center
    stickers[5][5] = {
        type: 'start',
        value: 0,
        consumed: false
    };

    return stickers;
}
```

### Layout Pattern

```
┌─────────────────────┐
│ ×                   × │ ← Multi stickers at corners
├─────────────────────┤
│                     │
│   +             +   │ ← Points stickers
│                     │
│                     │
│                     │
│        ○            │ ← Start sticker at center
│                     │
│   +             +   │ ← Points stickers
│                     │
│ ×                   × │ ← Multi stickers at corners
└─────────────────────┘
```

## Sticker Consumption

### Stickers.consumeSticker() Function

Stickers are consumed when tiles are placed on them:

```typescript
export function consumeSticker(stickers: StickerState, position: Position): StickerState {
    const newStickers = stickers.map(row => [...row]);
    const sticker = newStickers[position.row][position.col];

    if (sticker && !sticker.consumed) {
        newStickers[position.row][position.col] = {
            ...sticker,
            consumed: true
        };
    }

    return newStickers;
}
```

### Consumption Timing

Stickers are consumed during play resolution:

```typescript
// In PlayResolution.resolvePlay()
let newStickers = args.stickers;
for (let row = 0; row < args.board.length; row++) {
    for (let col = 0; col < args.board[row].length; col++) {
        const cell = args.board[row][col];
        if (cell.tile && cell.canTake) { // Just placed tile
            newStickers = Stickers.consumeSticker(newStickers, { row, col });
        }
    }
}
```

### Consumption Effects

- **State Change**: `consumed: false → true`
- **Visual Removal**: Sticker disappears from board
- **Bonus Loss**: No longer provides scoring bonuses
- **Permanent**: Consumed stickers cannot be reactivated

## Sticker States

### Active State

`Stickers.isStickerActive()` checks if a sticker provides bonuses:

```typescript
export function isStickerActive(stickers: StickerState, position: Position): boolean {
    const sticker = Stickers.getStickerAt(stickers, position);
    return sticker !== null && !sticker.consumed;
}
```

### Active Sticker Requirements

- **Exists**: Sticker must be present at position
- **Not Consumed**: Must not have been used before
- **Tile Present**: Must have a tile (for scoring calculations)

### Inactive States

Stickers become inactive when:

- **Consumed**: Used up by tile placement
- **Missing**: No sticker at position
- **Already Consumed**: Previously used

## Sticker Effects on Scoring

### Multi Stickers

Multipliers are applied to the entire word score:

```typescript
// In PlayResolution.calculateWordScore()
let stickerMulti = 0;

// Check each position in word
if (stickers && Stickers.isStickerActive(stickers, position)) {
    const sticker = stickers[position.row][position.col];
    if (sticker?.type === 'multi') {
        stickerMulti += sticker.value;
    }
}

// Final calculation
const totalPoints = points + stickerPoints;
const totalMulti = letterCount + stickerMulti;
return totalPoints * totalMulti;
```

**Example**: Word "HELLO" (8 + 1 + 1 + 1 + 1 = 12 points) on ×2 sticker
- Base points: 12
- Sticker points: 0
- Multipliers: 5 (letters) + 2 (sticker) = 7
- Final score: 12 × 7 = 84 points

### Points Stickers

Bonus points are added before multiplication:

```typescript
let stickerPoints = 0;

// Add points stickers
if (stickers && Stickers.isStickerActive(stickers, position)) {
    const sticker = stickers[position.row][position.col];
    if (sticker?.type === 'points') {
        stickerPoints += sticker.value;
    }
}

// Final calculation
const totalPoints = points + stickerPoints;
const totalMulti = letterCount + stickerMulti;
return totalPoints * totalMulti;
```

**Example**: Word "CAT" (3 + 1 + 1 = 5 points) on +10 sticker
- Base points: 5
- Sticker points: 10
- Multipliers: 3
- Final score: (5 + 10) × 3 = 45 points

### Combined Effects

Stickers can combine for complex scoring:

**Example**: Word "DOG" (2 + 1 + 2 = 5 points) on both +10 points and ×2 multi
- Base points: 5
- Sticker points: 10
- Multipliers: 3 (letters) + 2 (multi) = 5
- Final score: (5 + 10) × 5 = 75 points

### Start Sticker

The start sticker has no scoring effect but enforces game rules:

```typescript
export function isStartStickerConsumed(stickers: StickerState): boolean {
    const startSticker = stickers[5][5];
    return startSticker ? startSticker.consumed : true;
}
```

## Start Sticker Requirements

### First Play Rule

The first play must cover the start sticker position:

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

### doesWordCoverStartSticker()

Checks if a word covers the center position (5,5):

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

### Start Sticker Consumption

- **Automatic**: Consumed when first tile is placed on center
- **Requirement**: Must be covered by first play
- **Post-Consumption**: Becomes inactive, allows normal connection rules

## Sticker Management

### Sticker Statistics

`countStickers()` provides sticker counts by type and state:

```typescript
export function countStickers(stickers: StickerState): {
    multiActive: number;
    multiConsumed: number;
    pointsActive: number;
    pointsConsumed: number;
    startActive: number;
    startConsumed: number;
} {
    // Count each type...
}
```

### Sticker Access

`Stickers.getStickerAt()` retrieves sticker at position:

```typescript
export function getStickerAt(stickers: StickerState, position: Position): Sticker | null {
    return stickers[position.row][position.col];
}
```
```

## Visual Representation

### Sticker Component

`src/components/Sticker.tsx` renders sticker visuals:

```typescript
export default function Sticker({ type, value, consumed }) {
    if (consumed) return null; // Don't show consumed stickers

    const styles = {
        multi: 'bg-red-500 text-white',    // Red for multipliers
        points: 'bg-yellow-500 text-black', // Yellow for points
        start: 'bg-blue-500 text-white',   // Blue for start
    };

    return (
        <div className={`absolute inset-0 flex items-center justify-center text-xs font-bold rounded ${styles[type]}`}>
            {type === 'multi' && `×${value}`}
            {type === 'points' && `+${value}`}
            {type === 'start' && '○'}
        </div>
    );
}
```

### Board Integration

Stickers are rendered as overlays on board cells:

```typescript
// In BoardCell.tsx
{sticker && <Sticker type={sticker.type} value={sticker.value} consumed={sticker.consumed} />}
```

## Debug Operations

### Sticker Manipulation

Debug menu provides sticker controls:

```typescript
// Reset stickers
onResetStickers: () => {
    let stickers = Stickers.createInitialStickers();
    // Consume stickers where locked tiles exist
    for (let row = 0; row < state.board.length; row++) {
        for (let col = 0; col < state.board[row].length; col++) {
            const cell = state.board[row][col];
            if (cell.tile && !cell.canTake) {
                stickers = Stickers.consumeSticker(stickers, { row, col });
            }
        }
    }
    setStickers(stickers);
},
```

## Error Handling

### Invalid Sticker Operations

- **Double Consumption**: Attempting to consume already consumed stickers
- **Missing Stickers**: Trying to access stickers at invalid positions
- **Type Mismatches**: Incorrect sticker type handling

### Recovery Mechanisms

- **Validation**: Operations check sticker existence and state
- **Graceful Fallbacks**: Missing stickers don't crash scoring
- **State Consistency**: Sticker consumption is atomic with tile placement

## Refactoring Opportunities

1. **Sticker Types**: Add more sticker types (negative points, special effects)
2. **Dynamic Placement**: Allow stickers to be placed during gameplay
3. **Sticker Stacking**: Multiple stickers on same square
4. **Temporary Stickers**: Stickers that reactivate after certain conditions
5. **Sticker Chains**: Stickers that affect adjacent squares
6. **Visual Effects**: Better animations for sticker consumption

The sticker system adds strategic depth by providing bonus scoring opportunities while enforcing game structure through the start sticker requirement.
