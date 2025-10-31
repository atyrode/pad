# Blank Tiles Mechanics

This document explains the blank tile system, including data structure, letter selection, transformation, and reversion mechanics.

## Blank Tile Overview

Blank tiles ("*") are wildcards that players can assign to any letter. They provide strategic flexibility but have special handling throughout the game.

## Blank Tile Data Structure

### TileData Extensions

Blank tiles extend the base tile structure:

```typescript
interface TileData {
    id: string;           // Unique identifier
    value: string;        // "*" for blanks, or assigned letter
    score: number;        // 0 for blanks
    originalValue?: string; // Always "*" for transformed blanks
    displayValue?: string;  // The assigned letter (A-Z)
}
```

### Blank Tile Creation

Blanks are created in the tile distribution:

```typescript
// In tileDefinitions.ts
export const ALL_TILE_DEFINITIONS: TileDefinition[] = [
    { id: 0, letter: '*', score: 0 }, // Blank tile
    // ... other tiles
];

// In TileSupply.createTileBag()
for (const { tileId, count } of TILE_DISTRIBUTION) {
    const tileDefinition = getTileDefinitionById(tileId);
    if (tileDefinition.letter === '*') {
        // Create blank tiles
        bag.push({
            id: crypto.randomUUID(),
            value: '*',
            score: 0,
        });
    }
}
```

## Blank Tile Detection

### Value Checking

Systems identify blanks by checking the `value` field:

```typescript
const isBlankTile = tile.value === '*';
const isTransformedBlank = tile.originalValue === '*';
```

### Special Handling Points

Blanks receive special treatment in several places:

- **Drag Operations**: Intercepted for letter selection
- **Scoring**: Use `displayValue` for word formation
- **Removal**: Automatically revert to blank form
- **Display**: Show assigned letter instead of "*"

## Letter Selection Flow

### useBlankTilePlacement Hook

Manages the blank tile letter selection process:

```typescript
export function useBlankTilePlacement({ board, setBoard, rack, setRack, setPlacementHistory }) {
    const [blankTilePopup, setBlankTilePopup] = useState<BlankTilePopupState | null>(null);

    const openBlankTilePopup = (params: {
        blankTile: TileData;
        targetPosition: Position;
        sourceRackIndex: number;
    }) => {
        setBlankTilePopup({
            show: true,
            blankTile: params.blankTile,
            targetPosition: params.targetPosition,
            sourceRackIndex: params.sourceRackIndex,
        });
    };

    const handleLetterSelection = (letter: string) => {
        if (!blankTilePopup) return;

        const { blankTile, targetPosition, sourceRackIndex } = blankTilePopup;

        // Transform blank tile
        const transformedTile: TileData = {
            ...blankTile,
            value: letter.toUpperCase(),
            originalValue: '*',
            displayValue: letter.toUpperCase(),
        };

        // Temporarily update rack with transformed tile
        const tempRack = [...rack];
        tempRack[sourceRackIndex] = transformedTile;

        // Place the transformed tile
        const result = TileOperations.placeTileOnBoardFromRack(
            tempRack, sourceRackIndex, board, targetPosition, true
        );

        if (result) {
            setBoard(result.board);
            setRack(result.rack);
            setPlacementHistory(prev => [...prev, result.placementHistoryEntry!]);
        }

        setBlankTilePopup(null);
    };

    const handlePopupCancel = () => {
        setBlankTilePopup(null);
    };

    return {
        blankTilePopup,
        openBlankTilePopup,
        handleLetterSelection,
        handlePopupCancel,
    };
}
```

### Drag Interception

Blank tiles are intercepted during drag operations:

```typescript
// In useDragEndWithDiscard
if (activeRackIndex !== null && overBoardPos && tile.value === "*") {
    // Intercept blank tile placement
    openBlankTilePopup({
        blankTile: tile,
        targetPosition: overBoardPos,
        sourceRackIndex: activeRackIndex
    });
    return; // Don't complete normal placement
}
```

## Letter Selection Popup

### LetterSelectionPopup Component

`src/components/LetterSelectionPopup.tsx` provides the letter selection interface:

```typescript
export default function LetterSelectionPopup({ onLetterSelect, onCancel }) {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <h2 className="text-xl font-bold mb-4">Choose Letter for Blank Tile</h2>

                <div className="grid grid-cols-6 gap-2 mb-4">
                    {letters.map(letter => (
                        <button
                            key={letter}
                            onClick={() => onLetterSelect(letter)}
                            className="w-12 h-12 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg transition-colors"
                        >
                            {letter}
                        </button>
                    ))}
                </div>

                <div className="flex justify-end">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
```

### Available Letters

The popup shows all 26 letters (A-Z) for selection. No restrictions on letter choice - players can assign any letter they want.

## Blank Tile Transformation

### Transformation Process

When a letter is selected, the blank tile is transformed:

```typescript
const transformedTile: TileData = {
    ...blankTile,
    value: letter.toUpperCase(),        // The assigned letter
    originalValue: '*',                 // Mark as originally blank
    displayValue: letter.toUpperCase(), // Display value (same as value)
};
```

### State After Transformation

- **value**: Contains the assigned letter (A-Z)
- **originalValue**: Always "*" to track blank origin
- **displayValue**: Same as value for display purposes
- **score**: Remains 0 (blanks don't score)

## Blank Tile Reversion

### Automatic Reversion on Removal

When blank tiles are removed from the board, they automatically revert to blank form:

```typescript
// In TileOperations.removeTileFromBoardToRack
let tileToAdd: TileData = removedTile;
let revertedTile: TileData | null = null;

if (wasBlank) {
    revertedTile = {
        ...removedTile,
        value: '*',
        originalValue: undefined,
        displayValue: undefined,
    } as TileData;
    tileToAdd = revertedTile;
}
```

### wasBlank Detection

```typescript
const wasBlank = removedTile.originalValue === '*';
```

### Reversion Logic

- **Detection**: Check `originalValue === '*'`
- **Transformation**: Reset to original blank state
- **Rack Addition**: Add reverted tile back to rack
- **History Tracking**: Track that tile was originally blank

## Placement History Tracking

### Blank Tile History Entries

Placement history tracks blank tile transformations:

```typescript
const placementHistoryEntry: PlacementHistoryEntry = {
    tileId: tile.id,
    position: targetPosition,
    wasBlank: tile.originalValue === '*', // Track blank origin
};
```

### History Usage

- **Undo Operations**: Know whether to revert tile to blank
- **Play Resolution**: Track blank tile placements
- **Debug Display**: Show blank tile information

## Display and Rendering

### Visual Representation

Blank tiles display differently based on their state:

#### In Rack (Unassigned)
```typescript
// Show "*" symbol
<div className="tile-blank">*</div>
```

#### On Board (Assigned)
```typescript
// Show assigned letter
<div className="tile-assigned">{tile.displayValue}</div>
```

#### In Debug/Info
```typescript
// Show both original and assigned
<div className="tile-info">
    {tile.displayValue} (was *)
</div>
```

### Tile Component Handling

`src/components/Tile.tsx` handles blank tile display:

```typescript
export default function Tile({ tile, size, opacity }) {
    const displayLetter = tile.displayValue || tile.value;
    const isBlank = tile.originalValue === '*';

    return (
        <div className={`tile ${isBlank ? 'tile-blank' : 'tile-normal'}`}>
            <span className="letter">{displayLetter}</span>
            <span className="score">{tile.score}</span>
            {isBlank && <div className="blank-indicator">★</div>}
        </div>
    );
}
```

## Scoring and Word Formation

### Word Formation

Transformed blanks participate in words using their assigned letters:

```typescript
// In boardUtils.findAllWords
word += board[row][currentCol].tile!.value; // Uses assigned letter
```

### Scoring Rules

- **Letter Score**: 0 points (blank tiles don't contribute letter scores)
- **Word Multipliers**: Blanks count toward word length for multipliers
- **Bingo Bonus**: Blanks count as tiles for 7-tile bingo bonus

### Score Calculation

```typescript
// In PlayResolution.calculateWordScore
const points = cell.tile.score; // 0 for blanks
const letterCount++;           // Blanks count toward word length
```

## Special Rules and Edge Cases

### Blank Tile Restrictions

- **No Double Assignment**: Once assigned, blanks stay assigned until removed
- **No Reassignment**: Cannot change letter after placement
- **Rack Storage**: Assigned blanks remain assigned in rack

### Board Interactions

- **Swapping**: Can swap assigned blanks with other tiles
- **Movement**: Can move assigned blanks between board positions
- **Removal**: Always reverts to blank when removed

### Multiple Blanks

- **Same Word**: Multiple blanks can have different letters
- **Different Assignments**: Each blank can be assigned independently
- **Tracking**: Each blank maintains its own assignment

## Debug and Testing

### Debug Blank Tile Operations

```typescript
// In debug menu
onAddBlankTile: () => {
    const blankTile = createBlankTile('debug');
    const result = TileSupply.drawOne({
        rack: state.rack,
        bag: [blankTile, ...state.bag],
        discard: state.discard,
    });
    if (result) {
        setRack(result.rack);
        setBag(result.bag);
    }
},

onTestBlankTransformation: () => {
    // Simulate blank tile placement and letter selection
    const mockBlank = createBlankTile('test');
    // ... test transformation logic
},
```

## Error Handling

### Invalid Operations

- **Missing Popup State**: Operations check for valid popup state
- **Invalid Letters**: Letter selection validates A-Z input
- **Missing Tiles**: Operations handle missing tile references

### Recovery Mechanisms

- **Popup Cancellation**: Cancel button resets to clean state
- **State Validation**: Operations validate blank tile state
- **Fallback Behavior**: Graceful handling of transformation failures

## Refactoring Opportunities

1. **Letter Restrictions**: Add rules for valid letter assignments
2. **Blank Tile Types**: Support different types of blank tiles
3. **Assignment Persistence**: Allow reassignment of removed blanks
4. **Visual Design**: Better blank tile visual indicators
5. **Accessibility**: Keyboard navigation for letter selection
6. **Analytics**: Track blank tile usage patterns

The blank tile system provides strategic depth with comprehensive state management and smooth user interaction flows.
