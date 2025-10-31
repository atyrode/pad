# State Management Architecture

This document explains how game state is managed throughout the application using React Context, useReducer, and custom hooks.

## GameState Structure

The entire game state is contained in a single `GameState` interface defined in `src/state/gameTypes.ts`:

```typescript
export interface GameState {
    board: BoardState;           // Current game board
    rack: RackState;             // Player's tile rack
    bag: Bag;                    // Remaining tiles in bag
    discard: TileData[];         // Discarded tiles

    stickers: StickerState;      // Bonus stickers on board
    totalScore: number;          // Cumulative game score

    isDraftMode: boolean;        // Whether in draft mode
    draftBoard: BoardState;      // Draft mode board
    draftRerollCount: number;    // Number of draft rerolls used
    draftEnded: boolean;         // Whether draft phase is complete
    hasSeededFromDraft: boolean; // Whether bag was seeded from draft

    placementHistory: PlacementHistoryEntry[]; // History of tile placements

    isDictionaryLoaded: boolean; // Whether French dictionary is loaded

    tileOpacity: number;         // UI opacity setting (0-100)
    showCoordinates: boolean;    // Whether to show board coordinates
}
```

## Context API Setup

The state is managed through React Context in `src/state/GameContext.tsx`:

```typescript
const GameStateContext = createContext<GameState | undefined>(undefined);
const GameDispatchContext = createContext<React.Dispatch<GameAction> | undefined>(undefined);

export function GameProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(gameReducer, undefined, getInitialState);
    // ... context providers
}
```

### Initial State
The initial state is created by `getInitialState()`:

```typescript
function getInitialState(): GameState {
    return {
        board: createInitialBoard(),
        rack: createInitialRack(),
        bag: [],  // Empty initially, seeded from draft
        discard: [],

        stickers: createInitialStickers(),
        totalScore: 0,

        isDraftMode: false,  // Start in game mode
        draftBoard: createInitialDraftBoard(),
        draftRerollCount: 0,
        draftEnded: false,
        hasSeededFromDraft: false,

        placementHistory: [],

        isDictionaryLoaded: false,

        tileOpacity: 100,
        showCoordinates: false,
    };
}
```

## Reducer Pattern

State updates are handled through a useReducer pattern in `src/state/gameReducer.ts`. All state changes go through dispatched actions:

```typescript
export type GameAction =
    | { type: "setBoard"; payload: { board: BoardState } }
    | { type: "setRack"; payload: { rack: RackState } }
    | { type: "setBag"; payload: { bag: Bag } }
    // ... many more action types
    | { type: "batchUpdate"; payload: Partial<GameState> };
```

### Reducer Implementation
The reducer handles each action type:

```typescript
export function gameReducer(state: GameState, action: GameAction): GameState {
    switch (action.type) {
        case "setBoard": {
            return { ...state, board: action.payload.board };
        }
        case "setRack": {
            return { ...state, rack: action.payload.rack };
        }
        // ... other cases
        case "batchUpdate": {
            return { ...state, ...action.payload };
        }
        default: {
            return state;
        }
    }
}
```

## State Access Hooks

Components access state through custom hooks:

```typescript
export function useGame(): GameState {
    const ctx = useContext(GameStateContext);
    if (ctx === undefined) {
        throw new Error("useGame must be used within a GameProvider");
    }
    return ctx;
}

export function useGameDispatch(): React.Dispatch<GameAction> {
    const ctx = useContext(GameDispatchContext);
    if (ctx === undefined) {
        throw new Error("useGameDispatch must be used within a GameProvider");
    }
    return ctx;
}
```

## State Setter Hooks

For convenience, `src/hooks/useGameSetters.ts` provides typed setter functions that dispatch actions:

```typescript
export function useGameSetters() {
    const dispatch = useGameDispatch();

    const setBoard = useCallback((board: BoardState) => {
        dispatch({ type: "setBoard", payload: { board } });
    }, [dispatch]);

    const setRack = useCallback((rack: RackState) => {
        dispatch({ type: "setRack", payload: { rack } });
    }, [dispatch]);

    // ... more setters

    return {
        setBoard,
        setRack,
        setBag,
        // ... all setters
    };
}
```

## State Update Patterns

### Direct Dispatch
For simple updates, components can dispatch actions directly:

```typescript
const dispatch = useGameDispatch();

// Update board
dispatch({ type: "setBoard", payload: { board: newBoard } });

// Batch multiple updates
dispatch({
    type: "batchUpdate",
    payload: {
        board: newBoard,
        rack: newRack,
        totalScore: newScore
    }
});
```

### Using Setters
For more convenient usage, use the setter hooks:

```typescript
const { setBoard, setRack, setTotalScore } = useGameSetters();

// These automatically dispatch the correct actions
setBoard(newBoard);
setRack(newRack);
setTotalScore(newScore);
```

### Engine Function Integration
Engine functions return new state objects, which are then dispatched:

```typescript
// In a hook or component
const { setBoard, setRack, setPlacementHistory } = useGameSetters();

const result = TileOperations.placeTileOnBoardFromRack(
    state.rack, rackIndex, state.board, position, true
);

if (result) {
    setBoard(result.board);
    setRack(result.rack);
    setPlacementHistory(prev => [...prev, result.placementHistoryEntry!]);
}
```

## State Slices and Selectors

### Current State Access
Components access specific state slices:

```typescript
function MyComponent() {
    const { board, rack, totalScore, isDraftMode } = useGame();
    // Use state...
}
```

### Derived State
Some computed values are calculated using selectors in `src/state/selectors.ts`:

```typescript
export function canPlaySelector(args: {
    board: BoardState;
    stickers: StickerState;
    isDictionaryLoaded: boolean;
}): boolean {
    // Complex logic to determine if play is valid
    return areAllCurrentWordsValidSelector(args.board, args.stickers, args.isDictionaryLoaded);
}
```

Selectors are used in components:

```typescript
const { board, stickers, isDictionaryLoaded } = useGame();
const canPlay = canPlaySelector({ board, stickers, isDictionaryLoaded });
```

## Dictionary Loading

The dictionary is loaded asynchronously and updates state when ready:

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

## State Persistence

Currently, state is not persisted between sessions. The game starts fresh each time the app loads.

## State Flow Example

Here's how a typical tile placement flows through the system:

```
User drags tile → useDragAndDrop hook → TileOperations.placeTileOnBoardFromRack()
                                      → Returns new board/rack
                                      → useGameSetters.setBoard/setRack()
                                      → Dispatch actions
                                      → gameReducer updates state
                                      → Components re-render with new state
```

## Refactoring Opportunities

1. **State Normalization**: Some state could be normalized (e.g., placement history could be derived from board state)
2. **Action Creators**: Could introduce action creator functions to reduce boilerplate
3. **State Machines**: Complex state transitions could use state machine patterns
4. **Selective Re-renders**: Large state object causes unnecessary re-renders; could split into smaller contexts
5. **State Validation**: Add runtime validation for state consistency
6. **Undo/Redo**: Placement history could enable undo functionality

The current state management is straightforward and works well for this game, but could be optimized for larger applications.
