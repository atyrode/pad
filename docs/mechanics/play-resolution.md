# Play Resolution Mechanics

This document explains the play resolution system, including validation, scoring, tile locking, sticker consumption, and rack refilling.

## Play Resolution Overview

Play resolution occurs when a player commits their tile placements. The system validates the play, calculates scores, locks tiles, consumes bonuses, and prepares for the next turn.

## Play Resolution Flow

### resolvePlay() Function

`src/engine/PlayResolution.ts` contains the main resolution logic:

```typescript
export function resolvePlay(args: ResolvePlayArgs): ResolvePlayResult {
    // 1. Calculate score for current play
    const { totalScore } = calculateCurrentPlayScore(args.board, args.stickers);

    // 2. Lock just-placed tiles (canTake → false)
    const lockedBoard: BoardState = args.board.map(row =>
        row.map(cell => (cell.tile && cell.canTake
            ? { ...cell, canPlace: false, canTake: false }
            : cell))
    );

    // 3. Consume stickers under locked tiles
    let newStickers = args.stickers;
    for (let row = 0; row < args.board.length; row++) {
        for (let col = 0; col < args.board[row].length; col++) {
            const cell = args.board[row][col];
            if (cell.tile && cell.canTake) {
                newStickers = consumeSticker(newStickers, { row, col });
            }
        }
    }

    // 4. Fill rack from bag/discard
    const tileSupplyResult = TileSupply.drawToFill({
        rack: args.rack,
        bag: args.bag,
        discard: args.discard,
    });

    return {
        totalScore: args.currentTotalScore + totalScore,
        board: lockedBoard,
        stickers: newStickers,
        placementHistory: [], // Clear placement history
        rack: tileSupplyResult.rack,
        bag: tileSupplyResult.bag,
        discard: tileSupplyResult.discard,
    };
}
```

### Resolution Steps

1. **Score Calculation**: Compute points for current play
2. **Tile Locking**: Make placed tiles permanent
3. **Sticker Consumption**: Use up bonuses under new tiles
4. **Rack Refilling**: Draw new tiles for next turn
5. **History Clearing**: Reset placement tracking

## Play Validation

### Can Play Check

Before resolution, the system validates that a play is legal:

```typescript
// In selectors.ts
export function canPlaySelector(args: {
    board: BoardState;
    stickers: StickerState;
    isDictionaryLoaded: boolean;
}): boolean {
    if (!args.isDictionaryLoaded) return false;

    const words = findAllWords(args.board);
    const currentWords = words.filter(w => !w.isLocked);

    if (currentWords.length === 0) return false;

    // Must form single contiguous line
    if (!areUnlockedTilesInSingleLine(args.board)) return false;

    // All words must be valid
    const allWordsValid = currentWords.every(wordInfo =>
        isValidWordSync(wordInfo.word) === true
    );
    if (!allWordsValid) return false;

    // Must touch existing tiles or cover start position
    const startStickerConsumed = isStartStickerConsumed(args.stickers);
    if (!startStickerConsumed) {
        const allWordsCoverStart = currentWords.every(wordInfo =>
            doesWordCoverStartSticker(wordInfo, args.stickers)
        );
        if (!allWordsCoverStart) return false;
    } else {
        if (!doesCurrentPlayTouchLocked(args.board)) return false;
    }

    return true;
}
```

### Validation Rules

- **Dictionary Loaded**: Words can only be validated if dictionary is available
- **Words Exist**: Must form at least one valid word
- **Single Line**: All placed tiles must form one contiguous line
- **Valid Words**: All formed words must exist in dictionary
- **Connection**: Must connect to existing tiles (except first play)
- **Start Coverage**: First play must cover center start position

## Scoring System

### Current Play Score Calculation

`calculateCurrentPlayScore()` computes points for unlocked tiles:

```typescript
export function calculateCurrentPlayScore(board: BoardState, stickers?: StickerState): PlayScore {
    const words = findAllWords(board);
    const currentWords = words.filter(w => !w.isLocked);

    let totalPoints = 0;
    let totalLetters = 0;
    let stickerPoints = 0;
    let stickerMulti = 0;
    let bingoAchieved = false;

    for (const word of currentWords) {
        let placedCount = 0;

        // Process each letter in word
        if (word.direction === 'horizontal') {
            for (let col = word.position.col; col < word.position.col + word.word.length; col++) {
                const cell = board[word.position.row][col];
                if (cell.tile) {
                    totalPoints += cell.tile.score;
                    totalLetters++;
                    if (cell.canTake) placedCount++; // Count newly placed tiles

                    // Check for stickers
                    if (stickers && isStickerActive(stickers, { row: word.position.row, col })) {
                        const sticker = stickers[word.position.row][col];
                        if (sticker) {
                            if (sticker.type === 'multi') {
                                stickerMulti += sticker.value;
                            } else if (sticker.type === 'points') {
                                stickerPoints += sticker.value;
                            }
                        }
                    }
                }
            }
        }
        // Similar logic for vertical words...

        if (placedCount === 7) bingoAchieved = true;
    }

    // Apply bingo bonus
    if (bingoAchieved) stickerPoints += 50;

    const finalPoints = totalPoints + stickerPoints;
    const finalMulti = totalLetters + stickerMulti;

    return {
        totalScore: finalPoints * finalMulti,
        breakdown: {
            baseTilePoints: totalPoints,
            stickerPoints: stickerPoints,
            baseTileMulti: totalLetters,
            stickerMulti: stickerMulti,
            points: finalPoints,
            multi: finalMulti,
            total: finalPoints * finalMulti
        }
    };
}
```

### Scoring Formula

**Word Score = (Letter Scores + Sticker Points) × (Letter Count + Sticker Multipliers)**

### Bingo Bonus

- **Condition**: Exactly 7 tiles placed in one play
- **Bonus**: +50 points added to sticker points
- **Application**: Applied before final multiplication

## Tile Locking

### Locking Process

After validation, tiles become permanent:

```typescript
const lockedBoard: BoardState = args.board.map(row =>
    row.map(cell => (cell.tile && cell.canTake
        ? { ...cell, canPlace: false, canTake: false }
        : cell))
);
```

### State Changes

| Before | After | Meaning |
|--------|-------|---------|
| `canTake: true` | `canTake: false` | Tile is locked in place |
| `canPlace: true` | `canPlace: false` | Position no longer accepts new tiles |

### Locked Tile Properties

- **Immovable**: Cannot be dragged or moved
- **Permanent**: Stays on board for rest of game
- **Bonus Source**: Can provide bonuses to future words
- **Word Formation**: Contributes to future word validation

## Sticker Consumption

### Consumption Logic

Stickers under newly placed tiles are consumed:

```typescript
let newStickers = args.stickers;
for (let row = 0; row < args.board.length; row++) {
    for (let col = 0; col < args.board[row].length; col++) {
        const cell = args.board[row][col];
        if (cell.tile && cell.canTake) { // Just placed
            newStickers = consumeSticker(newStickers, { row, col });
        }
    }
}
```

### consumeSticker() Function

`src/utils/stickerUtils.ts` handles consumption:

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

### Consumption Effects

- **State Change**: `consumed: false → true`
- **Visual Update**: Sticker disappears from board
- **Bonus Removal**: No longer provides bonuses
- **Permanent**: Consumed stickers stay consumed

## Rack Refilling

### Post-Play Drawing

After play resolution, rack is filled to capacity:

```typescript
const tileSupplyResult = TileSupply.drawToFill({
    rack: args.rack,
    bag: args.bag,
    discard: args.discard,
});
```

### Refill Process

- **Empty Slots**: Fills all null positions in rack
- **Bag Priority**: Draws from bag first
- **Auto-Refill**: Shuffles discard into bag if bag empty
- **Maximum**: Limited to 7 tiles (rack size)

## Placement History Management

### History Clearing

After successful play resolution:

```typescript
return {
    // ... other results
    placementHistory: [], // Clear for next turn
};
```

### History Purpose

- **Current Turn**: Tracks placements during tile arrangement
- **Validation**: Used for play legality checks
- **Debugging**: Shows tile placement sequence
- **Future**: Could support undo functionality

## Play Resolution in Game Flow

### Triggering Resolution

Play resolution is triggered by:

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

    // Apply all state changes
    setters.setTotalScore(result.totalScore);
    setters.setBoard(result.board);
    setters.setStickers(result.stickers);
    setters.setRack(result.rack);
    setters.setBag(result.bag);
    setters.setDiscard(result.discard);
    setters.setPlacementHistory(result.placementHistory);
};
```

### State Updates

All state changes happen atomically:

- **Score Update**: Add play score to total
- **Board Update**: Lock tiles and update positions
- **Sticker Update**: Consume used bonuses
- **Rack Update**: Fill with new tiles
- **Supply Update**: Update bag and discard
- **History Reset**: Clear placement tracking

## Error Handling

### Validation Failures

If `canPlaySelector()` returns false:

- **UI Feedback**: Play button disabled
- **User Notification**: Tooltip explains why play invalid
- **No Resolution**: Play resolution not attempted

### Resolution Failures

Though unlikely due to pre-validation, resolution could fail if:

- **State Inconsistency**: Board state doesn't match expectations
- **Tile Supply Issues**: Problems with bag/discard refilling
- **Sticker Issues**: Invalid sticker consumption attempts

### Recovery Mechanisms

- **State Validation**: Pre-resolution checks prevent most failures
- **Atomic Updates**: All changes succeed or none do
- **Fallback Behavior**: Clear placement history even if other operations fail

## Performance Considerations

### Resolution Complexity

- **Word Finding**: O(n²) for board scanning
- **Dictionary Validation**: O(k) for k words
- **Sticker Processing**: O(n²) for board iteration
- **Tile Supply**: O(1) to O(rack_size) for drawing

### Memory Impact

- **New Objects**: Creates new board, rack, sticker arrays
- **History Clearing**: Removes placement history entries
- **Garbage Collection**: Old state objects become eligible for cleanup

## Debug and Testing

### Debug Play Resolution

```typescript
// In debug menu
onForcePlay: () => {
    // Bypass validation for testing
    const result = PlayResolution.resolvePlay({
        board: state.board,
        stickers: state.stickers,
        rack: state.rack,
        bag: state.bag,
        discard: state.discard,
        currentTotalScore: state.totalScore,
    });
    // Apply results...
},

onTestScoring: () => {
    const score = PlayResolution.calculateCurrentPlayScore(state.board, state.stickers);
    console.log('Play would score:', score);
},
```

## Refactoring Opportunities

1. **Validation Separation**: Extract validation logic from resolution
2. **Partial Resolution**: Support canceling resolution midway
3. **Resolution Phases**: Break into smaller, testable phases
4. **Error Recovery**: Better handling of resolution failures
5. **Performance**: Optimize word finding and validation
6. **Analytics**: Track play statistics and patterns

The play resolution system ensures game rules are properly enforced while providing comprehensive scoring and state management for turn transitions.
