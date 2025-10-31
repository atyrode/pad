# User Interaction Systems

This document explains the various user interaction systems in the game, including drag-and-drop, keyboard navigation, context menus, and modal interactions.

## Interaction Overview

The game supports multiple input methods:

- **Mouse/Drag**: Primary interaction for tile movement
- **Keyboard**: Alternative navigation and input
- **Context Menus**: Right-click for quick actions
- **Modal Dialogs**: Blank tile letter selection

## Drag and Drop System

### Core Implementation: useDragAndDrop

The drag-and-drop system uses `@dnd-kit` and is managed by `useDragAndDrop`:

```typescript
const {
    sensors,           // Sensor configuration
    handleDragStart,   // Track dragged item
    handleDragOver,    // Track drop targets
    handleDragEnd,     // Execute drag operation
    overBoardPos,      // Current board hover position
    overRackIndex,     // Current rack hover index
    activeId,          // ID of item being dragged
} = useDragAndDrop({
    board: state.board,
    setBoard: setters.setBoard,
    rack: state.rack,
    setRack: setters.setRack,
    onTilePlaced: handlePlacementHistory,
});
```

### Drag Scenarios

The system handles multiple drag scenarios:

#### 1. Board → Board (Tile Movement)
```typescript
// Move tile between board positions
const result = TileOperations.moveTileBetweenBoardPositions(
    board, sourcePos, targetPos
);
if (result) setBoard(result.board);
```

#### 2. Rack → Board (Tile Placement)
```typescript
// Place tile from rack onto board
const result = TileOperations.placeTileOnBoardFromRack(
    rack, rackIndex, board, targetPos, true
);
if (result) {
    setBoard(result.board);
    setRack(result.rack);
    onTilePlaced(result.placementHistoryEntry);
}
```

#### 3. Board → Rack (Tile Removal)
```typescript
// Remove tile from board to rack
const result = TileOperations.removeTileFromBoardToRack(
    board, boardPos, rack, targetRackIndex
);
if (result) {
    setBoard(result.board);
    setRack(result.rack);
}
```

#### 4. Rack → Rack (Tile Reordering)
```typescript
// Reorder tiles in rack
const newRack = TileOperations.swapRackTiles(rack, index1, index2);
setRack(newRack);
```

### Discard Zone Handling

Tiles can be dragged to a discard zone for removal:

```typescript
// In useDragEndWithDiscard
const { handleDragEnd, discardAnim, isDiscarding } = useDragEndWithDiscard({
    // ... state
    originalHandleDragEnd: dragAndDrop.handleDragEnd,
});

const handleDragEnd = (event) => {
    if (event.over?.id === 'discard-slot') {
        // Handle discard operation
        const result = DiscardOperations.discardAndDraw(/* ... */);
        // Update state with discard animation
    } else {
        // Handle normal drag
        originalHandleDragEnd(event);
    }
};
```

### Visual Feedback

The system provides visual feedback during drag operations:

- **Drag Overlay**: Shows dragged tile following cursor
- **Drop Targets**: Highlights valid drop zones
- **Hover States**: Shows potential drop positions
- **Rack Hover**: Highlights rack slots during drag over

## Keyboard Navigation System

### Selector System: useKeyboardSelector

The keyboard system provides cursor-based board navigation:

```typescript
const { selectedCell, selectorDirection, advanceSelector } = useKeyboardSelector({
    onLetterInput: handleKeyboardTilePlacement,
    onBackspace: handleKeyboardTileRemoval,
    onShuffle: () => setRack(shuffleRack(rack)),
    onPlay: () => canPlay && handlePlay(),
    board: state.board,
});
```

### Navigation Controls

- **Arrow Keys**: Move selector cursor around board
- **Tab**: Toggle between horizontal/vertical placement direction
- **Letter Keys**: Place tiles at cursor position
- **Backspace**: Remove tile at cursor position
- **Space**: Shuffle rack
- **Enter**: Play current placement

### Smart Cursor Movement

The selector automatically skips non-placeable cells:

```typescript
const findNextNonLockedCell = (startRow, startCol, direction) => {
    // Skip cells where canPlace = false
    // Wrap around board edges
    // Return next valid position or null
};
```

### Placement Direction

The selector supports two placement directions:

- **Right**: Place tiles horizontally to the right
- **Down**: Place tiles vertically downward

Direction affects:
- Word formation during placement
- Cursor advancement after placement
- Visual direction indicator in UI

## Right-Click Context Menus

### Board Right-Click: handleRightClick

Right-clicking tiles on the board removes them to the rack:

```typescript
const handleRightClick = (tile: TileData, position: Position): boolean => {
    if (state.isDraftMode) return false;

    const emptySlotIndex = TileOperations.findFirstEmptySlot(state.rack);
    if (emptySlotIndex === null) return false;

    const result = TileOperations.removeTileFromBoardToRack(
        state.board, position, state.rack, emptySlotIndex
    );

    if (result) {
        setBoard(result.board);
        setRack(result.rack);
        return true; // Handled
    }
    return false;
};
```

### Rack Right-Click: handleRackRightClick

Right-clicking rack tiles places them at the keyboard selector position:

```typescript
const handleRackRightClick = (tile: TileData, rackIndex: number): boolean => {
    if (!selectedCell) return false;

    const targetCell = state.board[selectedCell.row][selectedCell.col];
    if (!targetCell.canPlace) return false;

    const result = TileOperations.placeTileOnBoardFromRack(
        state.rack, rackIndex, state.board, selectedCell, true
    );

    if (result) {
        setRack(result.rack);
        setBoard(result.board);
        setPlacementHistory(prev => [...prev, result.placementHistoryEntry!]);
        advanceSelector(); // Move cursor forward
        return true;
    }
    return false;
};
```

### Draft Mode Right-Click

Draft mode has special right-click behavior for suggestion rearrangement:

```typescript
const handleDraftSuggestionRightClick = (tile, position) => {
    // Special logic for moving suggestion tiles to placement zone
    // Only works on specific suggestion positions
};
```

## Blank Tile Handling

### Automatic Detection

When placing a blank tile (*), the system automatically opens a letter selection popup:

```typescript
// In useDragEndWithDiscard
if (activeRackIndex !== null && overBoardPos && tile.value === "*") {
    openBlankTilePopup({
        blankTile: tile,
        targetPosition: overBoardPos,
        sourceRackIndex: activeRackIndex
    });
    return; // Don't complete normal placement
}
```

### Letter Selection Flow

The `useBlankTilePlacement` hook manages the popup flow:

```typescript
const { blankTilePopup, openBlankTilePopup, handleLetterSelection, handlePopupCancel } =
    useBlankTilePlacement({
        board: state.board,
        setBoard: setters.setBoard,
        rack: state.rack,
        setRack: setters.setRack,
        setPlacementHistory: setters.setPlacementHistory,
    });
```

### Letter Selection Process

1. **Popup Opens**: Modal shows available letters
2. **Letter Choice**: User selects letter (A-Z)
3. **Tile Transformation**: Blank becomes letter tile
4. **Placement Completion**: Tile placed with proper history tracking
5. **Popup Closes**: Modal disappears

```typescript
const handleLetterSelection = (letter: string) => {
    const transformedTile = {
        ...blankTile,
        value: letter.toUpperCase(),
        originalValue: '*',
        displayValue: letter.toUpperCase(),
    };

    // Complete the placement
    const result = TileOperations.placeTileOnBoardFromRack(
        tempRackWithTransformedTile,
        sourceRackIndex,
        board,
        targetPosition,
        true
    );

    // Update state and close popup
    setBoard(result.board);
    setRack(result.rack);
    setPlacementHistory(prev => [...prev, result.placementHistoryEntry!]);
    setBlankTilePopup(null);
};
```

## Animation and Feedback

### Discard Animation

When tiles are discarded, they animate to the discard slot:

```typescript
// Trigger animation
setDiscardAnim({ tile: removedTile });

// After animation completes
setTimeout(() => {
    setDiscardAnim(null);
    // Complete discard operation
}, 180);
```

### Visual States

Components show different visual states:

- **Hover**: Mouse over interactive elements
- **Selected**: Keyboard selector position
- **Dragging**: Item being dragged
- **Valid Drop**: Valid drop target highlighting
- **Invalid Drop**: Invalid drop target (no highlighting)

## Input Method Coordination

### Mouse vs Keyboard Priority

The system supports both input methods simultaneously:

- **Mouse**: Direct manipulation (drag-drop, clicks)
- **Keyboard**: Accessibility and alternative input

### State Synchronization

Both input methods update the same underlying state:

- Drag operations update board/rack directly
- Keyboard operations use the same engine functions
- Both methods trigger placement history tracking
- Both respect the same validation rules

## Error Handling and Validation

### Drag Validation

Invalid drag operations are prevented:

```typescript
// Check if drop target is valid
const targetCell = board[targetPos.row][targetPos.col];
const targetAllowsPlacement = !targetCell.tile
    ? targetCell.canPlace
    : targetCell.canPlace && targetCell.canTake;

if (!targetAllowsPlacement) {
    // Cancel drag operation
    return;
}
```

### Keyboard Validation

Keyboard input validates before executing:

```typescript
const handleLetterInput = (letter: string) => {
    if (!selectorState.visible) return false;

    const position = selectorState.position;
    const cell = board[position.row][position.col];

    if (!cell.canPlace) return false;

    // Proceed with placement...
};
```

### User Feedback

The system provides immediate feedback for invalid actions:

- **Visual**: Invalid targets don't highlight
- **Cursor**: Changes to not-allowed cursor
- **Audio**: Could add sound effects (not implemented)
- **Haptic**: Could add vibration (not implemented)

## Accessibility Considerations

### Keyboard Navigation

- Full keyboard support for all actions
- Logical tab order and focus management
- Screen reader support through semantic HTML
- High contrast mode support

### Alternative Input Methods

- Touch support through drag-and-drop
- Potential gamepad support (not implemented)
- Voice input (not implemented)

## Refactoring Opportunities

1. **Input Unification**: Could create unified input handler system
2. **Gesture Support**: Add multi-touch gestures for mobile
3. **Undo/Redo**: Add undo system for all interactions
4. **Tutorial System**: Guided interactions for new players
5. **Accessibility**: Improve screen reader support
6. **Performance**: Optimize drag performance for large boards

The interaction system provides rich user experiences but could benefit from better unification of input methods and improved accessibility features.
