# Scoring Mechanics

This document explains the word scoring system, including letter values, sticker bonuses, multipliers, and special rules like bingo.

## Scoring Overview

The game uses Scrabble-style scoring with bonuses from stickers and special rules. Scores are calculated per word and summed for the total play score.

## Letter Values

### Standard Scrabble Values

Each tile has a point value based on letter frequency:

| Letter | Points | Letter | Points | Letter | Points | Letter | Points |
|--------|--------|--------|--------|--------|--------|--------|--------|
| A, E, I, O, U | 1 | D, M | 2 | B, C, P | 3 | F, H, V, W, Y | 4 |
| K | 5 | J, X | 8 | Q, Z | 10 | Blank (*) | 0 |

### Score Access

Tile scores are accessed through the tile object:

```typescript
const letterScore = tile.score; // 0 for blanks, 1-10 for letters
```

## Word Score Calculation

### Basic Formula

**Word Score = Sum of Letter Scores × Word Length**

### calculateWordScore() Function

`src/engine/PlayResolution.ts` calculates individual word scores:

```typescript
export function calculateWordScore(word: WordInfo, board: BoardState, stickers?: StickerState): number {
    let points = 0;
    let letterCount = 0;
    let stickerPoints = 0;
    let stickerMulti = 0;

    // Process each letter in word
    if (word.direction === 'horizontal') {
        for (let col = word.position.col; col < word.position.col + word.word.length; col++) {
            const cell = board[word.position.row][col];
            if (cell.tile) {
                points += cell.tile.score;  // Letter score
                letterCount++;             // Count for multiplier

                // Check for active stickers
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
    } else {
        // Similar logic for vertical words
        for (let row = word.position.row; row < word.position.row + word.word.length; row++) {
            const cell = board[row][word.position.col];
            if (cell.tile) {
                points += cell.tile.score;
                letterCount++;

                if (stickers && isStickerActive(stickers, { row, col: word.position.col })) {
                    const sticker = stickers[row][word.position.col];
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

    // Apply scoring formula
    const totalPoints = points + stickerPoints;
    const totalMulti = letterCount + stickerMulti;

    return totalPoints * totalMulti;
}
```

## Sticker Bonuses

### Points Stickers (+10, +20)

Add bonus points before applying multipliers:

```typescript
// Example: Word "CAT" (3 + 1 + 1 = 5 points) on +10 sticker
const basePoints = 5;
const stickerPoints = 10;
const totalPoints = basePoints + stickerPoints; // 15
const multiplier = 3; // Word length
const finalScore = 15 * 3; // 45 points
```

### Multi Stickers (×2, ×3)

Multiply the final score by the sticker value:

```typescript
// Example: Word "DOG" (2 + 1 + 2 = 5 points) on ×2 sticker
const basePoints = 5;
const stickerPoints = 0;
const totalPoints = basePoints + stickerPoints; // 5
const multiplier = 3 + 2; // Word length + sticker multiplier = 5
const finalScore = 5 * 5; // 25 points
```

### Combined Effects

Stickers can combine for complex scoring:

```typescript
// Example: Word "HELLO" on both +10 points and ×2 multi
const basePoints = 8 + 1 + 1 + 1 + 1; // 12
const stickerPoints = 10;              // +10 points sticker
const totalPoints = 12 + 10;           // 22
const multiplier = 5 + 2;              // 5 letters + 2× multi
const finalScore = 22 * 7;             // 154 points
```

### Sticker Activation

Only active stickers provide bonuses:

```typescript
const isActive = isStickerActive(stickers, position);
// Returns true if sticker exists and not consumed
```

## Bingo Bonus

### 7-Tile Bonus

Extra 50 points for using all 7 tiles in one play:

```typescript
// In calculateCurrentPlayScore()
let bingoAchieved = false;

for (const word of currentWords) {
    let placedCount = 0;

    // Count newly placed tiles in this word
    if (word.direction === 'horizontal') {
        for (let col = word.position.col; col < word.position.col + word.word.length; col++) {
            const cell = board[word.position.row][col];
            if (cell.tile && cell.canTake) { // Newly placed
                placedCount++;
            }
        }
    }

    if (placedCount === 7) {
        bingoAchieved = true;
        break;
    }
}

// Apply bingo bonus
if (bingoAchieved) {
    stickerPoints += 50;
}
```

### Bingo Rules

- **Tile Count**: Exactly 7 newly placed tiles
- **Single Play**: All tiles placed in one turn
- **Bonus Amount**: +50 points
- **Application**: Added to sticker points before final calculation

## Play Score Calculation

### calculateCurrentPlayScore()

Calculates total score for all words in current play:

```typescript
export function calculateCurrentPlayScore(board: BoardState, stickers?: StickerState): PlayScore {
    const words = findAllWords(board);
    const currentWords = words.filter(w => !w.isLocked);

    let totalPoints = 0;
    let totalLetters = 0;
    let stickerPoints = 0;
    let stickerMulti = 0;
    let bingoAchieved = false;

    // Process each word
    for (const word of currentWords) {
        let placedCount = 0;

        if (word.direction === 'horizontal') {
            for (let col = word.position.col; col < word.position.col + word.word.length; col++) {
                const cell = board[word.position.row][col];
                if (cell.tile) {
                    totalPoints += cell.tile.score;
                    totalLetters++;
                    if (cell.canTake) placedCount++;

                    // Check stickers
                    if (stickers && isStickerActive(stickers, { row: word.position.row, col })) {
                        const sticker = stickers[word.position.row][col];
                        if (sticker?.type === 'multi') {
                            stickerMulti += sticker.value;
                        } else if (sticker?.type === 'points') {
                            stickerPoints += sticker.value;
                        }
                    }
                }
            }
        }

        if (placedCount === 7) bingoAchieved = true;
    }

    // Apply bingo bonus
    if (bingoAchieved) stickerPoints += 50;

    const finalPoints = totalPoints + stickerPoints;
    const finalMulti = totalLetters + stickerMulti;

    return {
        totalScore: finalPoints * finalMulti,
        breakdown: {
            baseTilePoints: totalPoints,    // Sum of letter scores
            stickerPoints: stickerPoints,   // Bonus points + bingo
            baseTileMulti: totalLetters,   // Letter count
            stickerMulti: stickerMulti,   // Multiplier bonuses
            points: finalPoints,            // Total before multiplication
            multi: finalMulti,             // Total multiplier
            total: finalPoints * finalMulti // Final score
        }
    };
}
```

### Score Breakdown Structure

```typescript
interface ScoreBreakdown {
    baseTilePoints: number;  // Sum of individual letter scores
    stickerPoints: number;   // Points from stickers + bingo bonus
    baseTileMulti: number;  // Number of letters in all words
    stickerMulti: number;   // Multiplier bonuses from stickers
    points: number;          // baseTilePoints + stickerPoints
    multi: number;           // baseTileMulti + stickerMulti
    total: number;           // points × multi
}
```

## Scoring Examples

### Simple Word
**Word**: "CAT" (3 + 1 + 1 = 5 points)
- Base tile points: 5
- Sticker points: 0
- Base multiplier: 3
- Sticker multiplier: 0
- **Total**: 5 × 3 = 15

### With Points Sticker
**Word**: "CAT" on +10 points sticker
- Base tile points: 5
- Sticker points: 10
- Base multiplier: 3
- Sticker multiplier: 0
- **Total**: (5 + 10) × 3 = 45

### With Multi Sticker
**Word**: "CAT" on ×2 multi sticker
- Base tile points: 5
- Sticker points: 0
- Base multiplier: 3
- Sticker multiplier: 2
- **Total**: 5 × (3 + 2) = 25

### With Bingo
**7-tile play**: "PLAYING" (10 + 4 + 1 + 2 + 1 + 2 + 4 = 24 points) + bingo
- Base tile points: 24
- Sticker points: 50 (bingo)
- Base multiplier: 7
- Sticker multiplier: 0
- **Total**: (24 + 50) × 7 = 518

### Complex Example
**Words**: "HI" (4 + 1 = 5) and "BY" (3 + 4 = 7) with various bonuses
- Base tile points: 5 + 7 = 12
- Sticker points: 10 (points sticker) + 50 (bingo) = 60
- Base multiplier: 2 + 2 = 4
- Sticker multiplier: 2 (multi sticker) = 2
- **Total**: (12 + 60) × (4 + 2) = 432

## Total Score Tracking

### Game Score Accumulation

```typescript
// In PlayResolution.resolvePlay()
const { totalScore: playScore } = calculateCurrentPlayScore(args.board, args.stickers);
const newTotal = args.currentTotalScore + playScore;

// Update state
setTotalScore(newTotal);
```

### Score Persistence

- **Per Game**: Score persists until game reset
- **Display**: Shown in UI components
- **Reset**: Can be reset via debug menu

## Scoring Edge Cases

### Blank Tiles

Blank tiles contribute 0 points but count toward word length:

```typescript
// Word "C*T" where * is blank
const scores = [3, 0, 1];  // C=3, *=0, T=1
const totalPoints = 3 + 0 + 1; // 4
const multiplier = 3; // 3 letters including blank
const finalScore = 4 * 3; // 12
```

### Multiple Words

All words formed by a play are scored together:

```typescript
// Placing "A" to form "CAT" and "DOG"
// Both words scored, bonuses applied to affected letters
const catScore = calculateWordScore(catWord, board, stickers);
const dogScore = calculateWordScore(dogWord, board, stickers);
const totalPlayScore = catScore + dogScore;
```

### Overlapping Bonuses

Stickers affect the word they're part of:

```typescript
// Word "HELLO" with sticker under "L"
// Only "HELLO" gets the bonus, not intersecting words
```

## Debug Scoring

### Score Inspection

Debug menu provides scoring tools:

```typescript
// Calculate current play score
const score = PlayResolution.calculateCurrentPlayScore(state.board, state.stickers);
console.log('Current play score:', score);

// Calculate individual word scores
const words = Board.findAllWords(state.board);
words.forEach(word => {
    const wordScore = PlayResolution.calculateWordScore(word, state.board, state.stickers);
    console.log(`${word.word}: ${wordScore} points`);
});
```

## Performance Considerations

### Scoring Complexity

- **Word Finding**: O(n²) board scan
- **Dictionary Validation**: O(k) for k words
- **Sticker Checks**: O(letter count) per word
- **Total**: Efficient for 11x11 board

### Caching Opportunities

- **Word Lists**: Could cache found words
- **Score Calculations**: Could memoize individual word scores
- **Sticker States**: Could pre-calculate active stickers

## Refactoring Opportunities

1. **Score Breakdown**: More detailed scoring explanations
2. **Bonus Types**: Additional sticker types
3. **Scoring Modes**: Different scoring rulesets
4. **Score History**: Track score progression
5. **Visual Feedback**: Show score calculations in UI
6. **Score Validation**: Verify scoring calculations

The scoring system provides rich strategic depth through bonuses and special rules while maintaining clear, predictable calculations.
