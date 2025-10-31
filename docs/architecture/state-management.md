# State Management Architecture

This document explains how game state is managed throughout the application using Zustand for global state management with typed slices and selectors.

## Store Structure

The game state is managed through a Zustand store in `src/state/store.ts`, organized into typed slices for better maintainability:

```typescript
interface GameStore extends
  BoardSlice, RackSlice, BagSlice, DiscardSlice,
  StickersSlice, ScoreSlice, DraftSlice, UiSlice, DictionarySlice {

  // Batch update for complex operations
  batchUpdate: (updates: Partial<GameStore>) => void;
  resetGame: () => void;
}
```

### State Slices

The store is divided into logical slices:

- **BoardSlice**: Game board state and placement history
- **RackSlice**: Player's tile rack management
- **BagSlice**: Tile bag operations
- **DiscardSlice**: Discarded tiles tracking
- **StickersSlice**: Bonus system state
- **ScoreSlice**: Game score management
- **DraftSlice**: Draft mode state and controls
- **UiSlice**: UI settings (opacity, coordinates)
- **DictionarySlice**: Dictionary loading status

## Store Implementation

The store uses Zustand with devtools middleware:

```typescript
export const useGameStore = create<GameStore>()(
  devtools(
    (set, get) => ({
      // Board slice
      board: initialBoard,
      placementHistory: [],
      setBoard: (board) => set({ board }),
      addPlacement: (entry) => set((state) => ({
        placementHistory: [...state.placementHistory, entry]
      })),

      // ... other slices

      // Batch update for atomic operations
      batchUpdate: (updates) => set(updates),

      // Reset game
      resetGame: () => set({
        board: initialBoard,
        rack: initialRack,
        // ... reset all state
      }),
    }),
    {
      name: 'manifold-game-store',
      enabled: process.env.NODE_ENV === 'development',
    }
  )
);
```

## State Access Patterns

### Direct State Access

Components use the main store hook:

```typescript
function MyComponent() {
    const board = useGameStore((state) => state.board);
    const rack = useGameStore((state) => state.rack);
    const totalScore = useGameStore((state) => state.totalScore);

    // Use state...
}
```

### Action Access

State updates use slice-specific actions:

```typescript
function MyComponent() {
    const { setBoard, setRack, addPlacement, batchUpdate } = useGameStore((state) => ({
        setBoard: state.setBoard,
        setRack: state.setRack,
        addPlacement: state.addPlacement,
        batchUpdate: state.batchUpdate,
    }));

    const handleTilePlacement = () => {
        // Update multiple state slices atomically
        batchUpdate({
            board: newBoard,
            rack: newRack,
            placementHistory: [...history, newEntry],
        });
    };
}
```

### Selector Hooks

Derived state is accessed through selector hooks in `src/state/selectors.ts`:

```typescript
export function useCanPlay(): boolean {
    const board = useGameStore((state) => state.board);
    const stickers = useGameStore((state) => state.stickers);
    const isDictionaryLoaded = useGameStore((state) => state.isDictionaryLoaded);

    return Rules.areAllCurrentWordsValid(board, stickers, isDictionaryLoaded).isValid;
}

export function useCanShuffle(): boolean {
    const rack = useGameStore((state) => state.rack);
    return rack.filter(t => !!t).length > 1;
}
```

## State Update Patterns

### Atomic Updates

Complex operations use `batchUpdate` for consistency:

```typescript
// In GameService or hooks
const result = GameService.resolvePlay(gameState);

batchUpdate({
    totalScore: result.totalScore,
    board: result.board,
    stickers: result.stickers,
    placementHistory: result.placementHistory,
    rack: result.rack,
    bag: result.bag,
    discard: result.discard,
});
```

### Engine Integration

Engine functions remain pure and return new state objects:

```typescript
// GameService orchestrates complex operations
static resolvePlay(state: GameStateSnapshot): ResolvePlayResult {
    const result = PlayResolution.resolvePlay({
        board: state.board,
        stickers: state.stickers,
        rack: state.rack,
        bag: state.bag,
        discard: state.discard,
        currentTotalScore: state.totalScore,
    });

    return {
        board: result.board,
        rack: result.rack,
        bag: result.bag,
        discard: result.discard,
        stickers: result.stickers,
        totalScore: result.totalScore,
        placementHistory: result.placementHistory,
    };
}
```

## Dictionary Loading

The dictionary is loaded asynchronously in the store initialization:

```typescript
// Dictionary loading happens outside the store
// Components check isDictionaryLoaded state
useEffect(() => {
    Dictionary.preload()
        .then(() => {
            setDictionaryLoaded(true);
        })
        .catch(() => {
            // Mark as loaded to avoid blocking UI
            setDictionaryLoaded(true);
        });
}, []);
```

## State Flow Example

Here's how a typical tile placement flows through the system:

```
User drags tile → useGameController.handleDragEnd
                                      → GameService.placeFromRack()
                                      → Domain functions (Board.setTile, Rack.removeAt)
                                      → Returns new state objects
                                      → batchUpdate() commits all changes atomically
                                      → Zustand store updates
                                      → Components re-render with new state
```

## Benefits of Zustand Approach

1. **Type Safety**: Full TypeScript support with inferred types
2. **Performance**: Selective subscriptions prevent unnecessary re-renders
3. **Developer Experience**: Built-in devtools integration
4. **Simplicity**: No action types, reducers, or context setup
5. **Testability**: Store methods are easily testable
6. **Atomic Updates**: `batchUpdate` ensures consistency

## Refactoring Opportunities

1. **State Persistence**: Add localStorage/sessionStorage integration
2. **Optimistic Updates**: Could implement optimistic UI updates
3. **State History**: Placement history could enable undo/redo functionality
4. **State Validation**: Add runtime validation for state consistency
5. **Performance Monitoring**: Track re-render frequencies and optimize subscriptions
