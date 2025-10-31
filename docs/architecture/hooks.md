# Custom Hooks Architecture

This document explains the custom React hooks that encapsulate game logic, user interactions, and state management throughout the application.

## Hook Overview

The application uses a composition-based hook architecture where:

- `useGameController` acts as the main orchestrator
- Specialized hooks handle specific domains (drag-drop, keyboard, etc.)
- Hooks compose engine functions with React patterns
- Clean separation between UI logic and business logic

## Main Orchestrator: useGameController

`src/hooks/useGameController.ts` is the central hub that coordinates all game functionality:

### Responsibilities
- **State Coordination**: Manages all game state updates through engine functions
- **Hook Composition**: Combines multiple specialized hooks
- **Event Handling**: Routes user interactions to appropriate handlers
- **UI State Management**: Manages component-specific state (refs, sizes, animations)
- **Game Logic**: Implements core game rules and transitions

### Hook Composition Pattern
```typescript
export function useGameController() {
    // State access
    const state = useGame();
    const dispatch = useGameDispatch();

    // State setters
    const setters = useGameSetters();

    // Specialized interaction hooks
    const dragAndDrop = useDragAndDrop({ ... });
    const keyboard = useKeyboardSelector({ ... });
    const blankTile = useBlankTilePlacement({ ... });

    // Specialized game logic hooks
    const draftSeeding = useSeedBagFromDraft({ ... });
    const draftReroll = useDraftSuggestionsReroll({ ... });

    // Return unified interface
    return {
        // State
        state,
        dispatch,

        // UI state
        boardCellSize,
        refs,

        // Composed handlers
        handleDragEnd: combinedDragHandler,
        handleRightClick: boardRightClickHandler,
        // ... many more
    };
}
```

### Return Interface
The hook returns a comprehensive interface used by `GameArea`:

```typescript
return {
    // Rendering/context
    mounted,
    state,
    dispatch,

    // UI state
    boardCellSize,
    setBoardCellSize,
    boardRef, rackRef, gameAreaRef, discardRef,
    exitingDraft,

    // DnD system
    sensors,
    handleDragStart,
    handleDragOver,
    handleDragEnd,

    // Keyboard system
    selectedCell,
    selectorDirection,
    advanceSelector,

    // Action handlers
    handleRightClick,
    handleDraftSuggestionRightClick,
    handleRackRightClick,
    handleShuffle,
    handlePlay,
    fillRackAfterPlay,

    // State flags
    canPlay,
    canShuffle,

    // Blank tile system
    blankTilePopup,
    handleLetterSelection,
    handlePopupCancel,

    // Debug system
    debugActions,

    // Utilities
    getAllAvailableLetters,
};
```

## Specialized Interaction Hooks

### Drag and Drop: useDragAndDrop

`src/hooks/useDragAndDrop.ts` handles all drag-and-drop interactions:

#### Responsibilities
- Manages DnD sensor configuration
- Tracks drag state (active item, drop targets)
- Routes drag events to appropriate engine functions
- Handles different drag scenarios (board↔rack, board↔board, rack↔rack)

#### Key Features
```typescript
const {
    sensors,           // DnD sensor configuration
    handleDragStart,   // Track what's being dragged
    handleDragOver,    // Track drop targets
    handleDragEnd,     // Execute drag operations
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

### Discard with Animation: useDragEndWithDiscard

`src/hooks/useDragEndWithDiscard.ts` extends drag-and-drop for discard operations:

#### Responsibilities
- Intercepts drag-end events for discard zone drops
- Manages discard animations
- Coordinates with TileSupply for discard-and-draw operations
- Cleans up placement history when discarding from board

#### Composition Pattern
```typescript
const { handleDragEnd, discardAnim, isDiscarding } = useDragEndWithDiscard({
    board: state.board,
    rack: state.rack,
    bag: state.bag,
    discard: state.discard,
    placementHistory: state.placementHistory,
    openBlankTilePopup,
    originalHandleDragEnd: dragAndDrop.handleDragEnd,
});
```

### Keyboard Navigation: useKeyboardSelector

`src/hooks/useKeyboardSelector.ts` provides keyboard-based board navigation:

#### Responsibilities
- Manages keyboard selection cursor on board
- Handles letter input for tile placement
- Implements backspace for tile removal
- Provides arrow key navigation
- Integrates with tile placement logic

#### Configuration
```typescript
const { selectedCell, selectorDirection, advanceSelector } = useKeyboardSelector({
    onLetterInput: handleKeyboardTilePlacement,
    onBackspace: handleKeyboardTileRemoval,
    onShuffle: () => setters.setRack(shuffleRack(state.rack)),
    onPlay: () => canPlay && handlePlay(),
    board: state.board,
});
```

### Keyboard Tile Actions: useKeyboardTileActions

`src/hooks/useKeyboardTileActions.ts` handles keyboard-based tile placement/removal:

#### Responsibilities
- Places tiles at selected position via keyboard input
- Removes tiles from board via backspace
- Tracks placement history
- Validates placement rules

### Blank Tile Placement: useBlankTilePlacement

`src/hooks/useBlankTilePlacement.ts` manages blank tile letter selection flow:

#### Responsibilities
- Shows/hides letter selection popup
- Handles letter selection and tile transformation
- Manages popup cancellation
- Coordinates with tile placement operations

## Specialized Game Logic Hooks

### Draft Bag Seeding: useSeedBagFromDraft

`src/hooks/useSeedBagFromDraft.ts` handles draft-to-game transition:

#### Responsibilities
- Monitors draft completion
- Extracts tiles from draft board placement zone
- Seeds the game bag with drafted tiles
- Prevents duplicate seeding

### Draft Suggestions Reroll: useDraftSuggestionsReroll

`src/hooks/useDraftSuggestionsReroll.ts` manages draft suggestion regeneration:

#### Responsibilities
- Generates random tile suggestions for draft
- Handles reroll mechanics and limits
- Tracks suggestion occupancy patterns
- Updates draft board with new suggestions

## State Management Hooks

### Game Setters: useGameSetters

`src/hooks/useGameSetters.ts` provides convenient state update functions:

#### Responsibilities
- Wraps dispatch calls with typed setter functions
- Provides memoized callbacks for performance
- Centralizes state update patterns

```typescript
const setters = useGameSetters(); // Returns { setBoard, setRack, setBag, ... }
```

## Utility Hooks

### Cell Size Management: useCellSize

`src/hooks/useCellSize.ts` handles responsive board sizing:

#### Responsibilities
- Calculates cell sizes based on container dimensions
- Provides size update callbacks
- Manages aspect ratio constraints

## Hook Composition Patterns

### Parameter Passing
Hooks receive dependencies explicitly rather than accessing global state:

```typescript
// Good: explicit dependencies
useDragAndDrop({
    board: state.board,
    setBoard: setters.setBoard,
    rack: state.rack,
    setRack: setters.setRack,
    // ...
});

// Avoided: implicit state access
const MyHook = () => {
    const state = useGame(); // Implicit
    // ...
};
```

### Return Object Composition
Hooks return structured objects that can be destructured:

```typescript
const drag = useDragAndDrop(params);
const keyboard = useKeyboardSelector(params);

// Usage
drag.handleDragEnd(event);
keyboard.selectedCell;
```

### Event Handler Chaining
Complex event handlers chain multiple hooks:

```typescript
// In useGameController
const handleDragEnd = (event) => {
    // First check for discard
    const discardResult = discardHook.handleDragEnd(event);
    if (discardResult.handled) return;

    // Then handle normal drag
    dragHook.handleDragEnd(event);
};
```

## Hook Dependencies and State Flow

### State Access Patterns
- **Direct State**: Hooks access state through `useGame()`
- **Dispatch Access**: Hooks access dispatch through `useGameDispatch()`
- **Setter Access**: Hooks use `useGameSetters()` for convenient updates
- **Engine Integration**: Hooks call engine functions and dispatch results

### Effect Dependencies
Hooks use effects for reactive behavior:

```typescript
// Draft seeding reacts to draft state changes
useEffect(() => {
    if (!isDraftMode || !draftEnded || hasSeededFromDraft) return;
    // Seed bag from draft...
}, [isDraftMode, draftBoard, draftEnded, hasSeededFromDraft]);
```

## Performance Considerations

### Memoization
Heavy computations are memoized:

```typescript
const debugActions = useMemo(() => ({
    onDraw: () => { /* expensive operation */ },
    // ...
}), [dependencies]);
```

### Callback Stability
Callbacks are memoized to prevent unnecessary re-renders:

```typescript
const setBoard = useCallback((board: BoardState) => {
    dispatch({ type: "setBoard", payload: { board } });
}, [dispatch]);
```

## Testing Patterns

### Hook Isolation
Hooks can be tested independently:

```typescript
// Test useDragAndDrop with mock state
const mockSetters = { setBoard: jest.fn(), setRack: jest.fn() };
const { result } = renderHook(() =>
    useDragAndDrop({ board: mockBoard, setBoard: mockSetters.setBoard, ... })
);
```

### Engine Function Testing
Since hooks delegate to engine functions, core logic can be tested via engine functions directly.

## Refactoring Opportunities

1. **Hook Splitting**: `useGameController` is too large and could be split into domain-specific controllers
2. **Custom Hooks for Components**: Some component logic could be extracted to custom hooks
3. **Reducer Actions**: Could create action creator functions to reduce dispatch boilerplate
4. **Hook Composition**: Better patterns for composing multiple hooks with shared state
5. **Error Handling**: Add error boundaries and error handling to hooks
6. **Hook Dependencies**: Some hooks have too many dependencies; could be consolidated

The hook architecture provides good separation of concerns and composability, but `useGameController` has grown too large and could benefit from further decomposition.
