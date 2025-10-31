# Data Flow Architecture

This document explains how data flows through the Manifold game system, from user interactions through hooks, engine functions, and state updates.

## Data Flow Overview

The application follows a unidirectional data flow pattern:

```
User Interaction → Component Event → Hook Handler → Engine Function → State Update → Re-render
```

## State Flow Patterns

### Global State Flow

The main state flow moves through the Context API:

```
GameProvider (Context)
├── useGame() → Read current state
├── useGameDispatch() → Dispatch actions
└── useGameSetters() → Convenient state updates
```

### Component State Access

Components access state through hooks:

```typescript
function GameArea() {
    // Read state slices
    const { board, rack, isDraftMode } = useGame();

    // Get dispatch for actions
    const dispatch = useGameDispatch();

    // Get convenient setters
    const { setBoard, setRack } = useGameSetters();

    // Pass to child components
    return <Board board={board} onTilePlace={handlePlacement} />;
}
```

## Event Handling Patterns

### User Interaction Flow

1. **DOM Event** - User interacts with component (click, drag, keypress)
2. **Component Handler** - Component receives event and calls hook handler
3. **Hook Logic** - Hook processes event, calls engine functions
4. **Engine Computation** - Pure function computes new state
5. **State Update** - Hook dispatches action to update state
6. **Re-render** - Components re-render with new state

### Example: Tile Placement

```
Mouse Click → BoardCell.onClick → useGameController.handleRightClick
                                      ↓
                            TileOperations.placeTileOnBoardFromRack
                                      ↓
                            { board: newBoard, rack: newRack }
                                      ↓
                            setBoard(newBoard); setRack(newRack)
                                      ↓
                            dispatch({ type: "setBoard", payload: { board } })
                                      ↓
                            gameReducer → new state → re-render
```

## Hook Coordination Patterns

### useGameController as Central Coordinator

The main hook orchestrates all interactions:

```typescript
export function useGameController() {
    // Compose multiple specialized hooks
    const dragAndDrop = useDragAndDrop({ ... });
    const keyboard = useKeyboardSelector({ ... });
    const discard = useDragEndWithDiscard({ ... });

    // Combine handlers with priority
    const handleDragEnd = (event) => {
        // 1. Check for discard first
        const discardResult = discard.handleDragEnd(event);
        if (discardResult.handled) return;

        // 2. Handle normal drag operations
        dragAndDrop.handleDragEnd(event);
    };

    return { handleDragEnd, /* ... other handlers */ };
}
```

### Event Handler Chaining

Complex interactions chain multiple handlers:

```typescript
// Drag end event flows through multiple checks
handleDragEnd(event) {
    // Blank tile check
    if (isBlankTile && needsLetterSelection) {
        openBlankTilePopup();
        return;
    }

    // Discard zone check
    if (isOverDiscardZone) {
        handleDiscard(event);
        return;
    }

    // Normal drag operation
    handleNormalDrag(event);
}
```

## Engine Function Integration

### State Transformation Pattern

Engine functions transform state objects:

```typescript
// Input: current state
const currentState = {
    board: state.board,
    rack: state.rack,
    bag: state.bag,
    discard: state.discard,
};

// Engine function call
const result = TileSupply.drawToFill(currentState);

// Result: transformed state
setRack(result.rack);
setBag(result.bag);
setDiscard(result.discard);
```

### Result Object Pattern

Engine functions return structured result objects:

```typescript
interface PlaceTileOnBoardResult {
    board: BoardState;
    rack: RackState;
    placementHistoryEntry: PlacementHistoryEntry | null;
    swappedTile: TileData | null;
}

// Usage
const result = placeTileOnBoardFromRack(rack, index, board, position);
if (result) {
    setBoard(result.board);
    setRack(result.rack);
    if (result.placementHistoryEntry) {
        // Handle placement tracking
    }
}
```

## State Update Patterns

### Atomic Updates

State updates are dispatched as atomic actions:

```typescript
// ❌ Multiple dispatches (not atomic)
dispatch({ type: "setBoard", payload: { board: newBoard } });
dispatch({ type: "setRack", payload: { rack: newRack } });

// ✅ Batch update (atomic)
dispatch({
    type: "batchUpdate",
    payload: { board: newBoard, rack: newRack }
});
```

### Reducer State Updates

The reducer handles state transitions:

```typescript
function gameReducer(state: GameState, action: GameAction): GameState {
    switch (action.type) {
        case "setBoard":
            return { ...state, board: action.payload.board };

        case "batchUpdate":
            return { ...state, ...action.payload };

        default:
            return state;
    }
}
```

### Setter Function Pattern

Convenient setters wrap dispatch calls:

```typescript
export function useGameSetters() {
    const dispatch = useGameDispatch();

    const setBoard = useCallback((board: BoardState) => {
        dispatch({ type: "setBoard", payload: { board } });
    }, [dispatch]);

    return { setBoard, setRack, setBag, /* ... */ };
}
```

## Component Props Flow

### Props Drilling Pattern

State and handlers flow down through component hierarchy:

```
GameArea
├── board, rack, handleRightClick, handleDragEnd, ...
│
├── Board
│   ├── board (filtered), onRightClick, ...
│   │
│   └── BoardCell
│       ├── tile, canPlace, canTake, onRightClick (specific), ...
│       │
│       └── Tile
│           └── tile, size, opacity, ...
│
└── Rack
    ├── rack, onRackRightClick, ...
    │
    └── RackCell
        └── tile, index, onRackRightClick (specific), ...
```

### Context vs Props Decision

- **Props**: Used for component-specific data and event handlers
- **Context**: Used for global state access (useGame, useGameDispatch)

## Asynchronous Data Flow

### Dictionary Loading

Async operations update state when complete:

```typescript
// In GameProvider
useEffect(() => {
    preloadDictionary()
        .then(() => {
            dispatch({ type: "initDictionaryLoaded", payload: { loaded: true } });
        })
        .catch(() => {
            // Still mark as loaded to avoid blocking UI
            dispatch({ type: "initDictionaryLoaded", payload: { loaded: true } });
        });
}, []);
```

### Effect-Driven Updates

Some state updates are triggered by effects:

```typescript
// Draft seeding (useSeedBagFromDraft)
useEffect(() => {
    if (!isDraftMode || !draftEnded || hasSeededFromDraft) return;

    const draftedTiles = extractTilesFromDraft(draftBoard);
    const newBag = TileSupply.shuffleBag(draftedTiles);

    setBag(newBag);
    setHasSeededFromDraft(true);
}, [isDraftMode, draftEnded, hasSeededFromDraft, draftBoard]);
```

## Validation and Error Handling

### Validation Flow

Validation happens at multiple levels:

1. **Engine Level**: Pure validation functions
2. **Hook Level**: Business rule validation
3. **Component Level**: UI feedback

```typescript
// Engine validation
export function canPlaceAt(board: BoardState, position: Position): boolean {
    const cell = board[position.row][position.col];
    return cell.canPlace;
}

// Hook validation (combines multiple rules)
const canPlay = useMemo(() => {
    return canPlaySelector({ board, stickers, isDictionaryLoaded });
}, [board, stickers, isDictionaryLoaded]);

// Component feedback
<button disabled={!canPlay}>
    {canPlay ? "Play" : "Invalid play"}
</button>
```

### Error Handling Patterns

- **Engine Functions**: Return `null` for invalid operations
- **Hooks**: Handle errors gracefully, update UI state
- **Components**: Show user feedback for invalid actions

## Performance Optimization Patterns

### Memoization

Expensive computations are memoized:

```typescript
// Memoize derived state
const canPlay = useMemo(() =>
    canPlaySelector({ board, stickers, isDictionaryLoaded }),
    [board, stickers, isDictionaryLoaded]
);

// Memoize event handlers
const handleRightClick = useCallback((tile, position) => {
    // Expensive operation
}, [dependencies]);
```

### Selective Re-renders

Components only re-render when relevant state changes:

```typescript
// Component receives specific props
<Board
    board={board}           // Re-renders when board changes
    rack={rack}            // Re-renders when rack changes
    onRightClick={handleRightClick} // Stable callback
/>
```

## Refactoring Opportunities

1. **State Structure**: Some props could be consolidated using compound components
2. **Event Handling**: Could use event delegation for better performance
3. **State Updates**: Batch more updates to reduce render cycles
4. **Memoization**: Add more memoization for expensive computations
5. **Error Boundaries**: Add error boundaries for better error handling
6. **Suspense**: Could use React Suspense for async operations

The current data flow is clear and predictable, but could benefit from more batching of state updates and better memoization strategies.
