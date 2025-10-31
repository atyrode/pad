# Stickers Domain Module

This document describes the Stickers domain module, which encapsulates all sticker-related operations in a single, self-contained API.

## Overview

The Stickers module (`src/domain/stickers/Stickers.ts`) provides a clean, immutable API for all sticker operations (initialization, activation checks, consumption, word coverage checks). It replaces the scattered sticker utilities that were previously in `src/utils/stickerUtils.ts`.

## API

### Creation

#### `createInitialStickers(): StickerState`
Create initial sticker layout with 4-way rotational symmetry.

```typescript
const stickers = Stickers.createInitialStickers();
// Creates 11x11 board with 4 multi stickers, 4 points stickers, and 1 start sticker
```

### Consumption and State Changes

#### `consumeSticker(stickers: StickerState, position: Position): StickerState`
Mark a sticker as consumed at the given position (when tile is locked).

```typescript
const updatedStickers = Stickers.consumeSticker(stickers, { row: 5, col: 5 });
```

#### `reactivateSticker(stickers: StickerState, position: Position): StickerState`
Reactivate a sticker at the given position (when locked tile is removed).

```typescript
const reactivatedStickers = Stickers.reactivateSticker(stickers, { row: 5, col: 5 });
```

### Queries

#### `isStickerActive(stickers: StickerState, position: Position): boolean`
Check if a sticker is active (exists and not consumed).

```typescript
const isActive = Stickers.isStickerActive(stickers, { row: 1, col: 1 });
if (isActive) {
    // Apply sticker bonus
}
```

#### `getStickerAt(stickers: StickerState, position: Position): Sticker | null`
Get sticker at a specific position.

```typescript
const sticker = Stickers.getStickerAt(stickers, { row: 5, col: 5 });
if (sticker) {
    console.log(`Type: ${sticker.type}, Value: ${sticker.value}`);
}
```

#### `isStartStickerConsumed(stickers: StickerState): boolean`
Check if the start sticker (center position 5,5) is consumed.

```typescript
const startConsumed = Stickers.isStartStickerConsumed(stickers);
if (startConsumed) {
    // Start sticker requirements are satisfied
}
```

#### `doesWordCoverStartSticker(word: WordInfo, stickers: StickerState): boolean`
Check if a word covers the start sticker position.

```typescript
const coversStart = Stickers.doesWordCoverStartSticker(word, stickers);
if (coversStart) {
    // Word satisfies start sticker requirement
}
```

#### `countStickers(stickers: StickerState): { multiActive: number; multiConsumed: number; pointsActive: number; pointsConsumed: number; startActive: number; startConsumed: number }`
Count total stickers by type and consumption state.

```typescript
const counts = Stickers.countStickers(stickers);
console.log(`${counts.multiActive} multi stickers remaining`);
console.log(`${counts.pointsConsumed} points stickers used`);
```

## Invariants

- **Immutability**: All operations return new sticker states; input states are never modified
- **Pure Functions**: No side effects, deterministic results
- **Type Safety**: All operations are strongly typed with StickerState and Position

## Initial Sticker Layout

The standard layout places stickers with 4-way rotational symmetry:

| Position | Type | Value | Effect |
|----------|------|-------|--------|
| (1,1), (1,9), (9,1), (9,9) | Multi | 2x | Doubles word score |
| (3,3), (3,7), (7,3), (7,7) | Points | +10 | Adds 10 points to word |
| (5,5) | Start | 0 | Must be covered by first play |

## Usage Examples

### Basic Operations
```typescript
import * as Stickers from "src/domain/stickers/Stickers";

// Create initial layout
let stickers = Stickers.createInitialStickers();

// Check if position has active sticker
if (Stickers.isStickerActive(stickers, { row: 1, col: 1 })) {
    // Apply multiplier bonus
}

// Consume sticker when tile is locked
stickers = Stickers.consumeSticker(stickers, { row: 1, col: 1 });

// Reactivate when locked tile is removed
stickers = Stickers.reactivateSticker(stickers, { row: 1, col: 1 });
```

### Game Logic Integration
```typescript
// In scoring logic
function calculateWordScore(word: WordInfo, stickers: StickerState): number {
    let score = baseScore;
    let multiplier = 1;

    for (const pos of word.positions) {
        if (Stickers.isStickerActive(stickers, pos)) {
            const sticker = Stickers.getStickerAt(stickers, pos);
            if (sticker?.type === 'multi') {
                multiplier *= sticker.value;
            } else if (sticker?.type === 'points') {
                score += sticker.value;
            }
        }
    }

    return score * multiplier;
}
```

### Validation Logic
```typescript
// In play validation
function canPlayWords(words: WordInfo[], stickers: StickerState): boolean {
    // Check start sticker requirement
    const startConsumed = Stickers.isStartStickerConsumed(stickers);
    if (!startConsumed) {
        const hasWordCoveringStart = words.some(word =>
            Stickers.doesWordCoverStartSticker(word, stickers)
        );
        if (!hasWordCoveringStart) return false;
    }

    return true;
}
```

## Implementation Details

### Sticker Consumption Logic
When a tile is locked on a sticker position, the sticker is consumed and cannot provide bonuses for future words. This is handled by `consumeSticker()`.

### Sticker Reactivation Logic
When a locked tile is removed (allowing repositioning), any consumed sticker at that position is reactivated. This is handled by `reactivateSticker()`.

### Start Sticker Requirement
The start sticker at position (5,5) must be covered by at least one word in the first valid play. Subsequent plays don't need to cover it again.

## Migration Notes

This module replaces the functions that were previously in `src/utils/stickerUtils.ts`. All function names remain the same:

| Function | Notes |
|----------|-------|
| `createInitialStickers()` | Same behavior |
| `consumeSticker()` | Same behavior |
| `reactivateSticker()` | Same behavior |
| `isStickerActive()` | Same behavior |
| `getStickerAt()` | Same behavior |
| `isStartStickerConsumed()` | Same behavior |
| `doesWordCoverStartSticker()` | Same behavior |
| `countStickers()` | Same behavior |

## Dependencies

The module imports `WordInfo` as a type-only import from `domain/board/Board` to avoid circular dependencies, since board operations may need to check stickers.
