# Components Architecture

This document explains the React component structure, hierarchy, and how components interact with game state and logic.

## Component Hierarchy

The component hierarchy follows a clean separation between layout, feature-specific, and atomic components:

```
GameArea (main container)
├── Board / DraftBoard (board display)
│   └── BoardCell (individual cells)
│       ├── Tile (tile display)
│       └── Sticker (bonus indicators)
├── Rack (tile rack)
│   └── RackCell (rack slots)
│       └── Tile (tile display)
├── DiscardSlot (discard area)
│   └── Tile (discarded tile animation)
├── LetterSelectionPopup (modal overlay)
│   └── Grid of letter buttons
└── DebugMenu (development tools)
```

## Main Container: GameArea

`src/components/GameArea.tsx` is the main game container that orchestrates the entire UI:

### Responsibilities
- Switches between draft mode and game mode layouts
- Manages board and rack sizing
- Coordinates drag-and-drop context
- Handles keyboard input routing
- Manages UI state (cell sizes, refs, exiting draft animation)

### Props Flow
GameArea receives extensive props from `useGameController`:

```typescript
interface GameAreaProps {
    // State slices
    board: BoardState;
    rack: RackState;
    draftBoard: BoardState;
    stickers: StickerState;
    isDraftMode: boolean;
    // ... many more state props

    // UI state
    boardCellSize: number;
    tileOpacity: number;
    showCoordinates: boolean;

    // Refs for DOM access
    boardRef: React.RefObject<HTMLDivElement>;
    rackRef: React.RefObject<HTMLDivElement>;
    gameAreaRef: React.RefObject<HTMLDivElement>;
    discardRef: React.RefObject<HTMLDivElement>;

    // Event handlers from hooks
    handleRightClick: (tile: TileData, position: Position) => boolean;
    handleRackRightClick: (tile: TileData, rackIndex: number) => boolean;
    handleShuffle: () => void;
    handlePlay: () => void;
    // ... many more handlers

    // DnD system
    sensors: SensorDescriptor[];
    handleDragStart: (event: DragStartEvent) => void;
    // ... DnD props
}
```

## Board Components

### Board vs DraftBoard
- `Board.tsx` - Regular game board with full functionality
- `DraftBoard.tsx` - Draft mode board with restricted placement zones

Both render a grid of `BoardCell` components.

### BoardCell
`src/components/BoardCell.tsx` represents individual board positions:

#### Responsibilities
- Renders tile and sticker at position
- Handles drag-and-drop interactions
- Shows selection indicators for keyboard navigation
- Manages right-click context menus
- Displays coordinate labels (optional)

#### Props Structure
```typescript
interface BoardCellProps {
    tile: TileData | null;
    canPlace: boolean;      // Whether tiles can be placed here
    canTake: boolean;       // Whether tiles can be removed from here
    row: number;
    col: number;

    // Drag and drop
    overRackIndex: number | null;

    // Refs for drag calculations
    rackRef?: React.RefObject<HTMLDivElement>;
    gameAreaRef?: React.RefObject<HTMLDivElement>;

    // Event handlers
    onRightClick?: (tile: TileData, position: Position) => boolean;

    // Visual elements
    sticker?: Sticker | null;
    tileOpacity?: number;
    showCoordinates?: boolean;
    isSelected?: boolean;
    selectorDirection?: Direction | null;
}
```

## Rack Components

### Rack
`src/components/Rack.tsx` displays the player's tile rack:

#### Responsibilities
- Renders 7 rack cells in a horizontal layout
- Handles shuffle button positioning
- Manages discard slot positioning
- Coordinates rack-level drag-and-drop

#### Props
```typescript
interface RackProps {
    rack: RackState;
    setRack: React.Dispatch<React.SetStateAction<RackState>>;
    boardCellSize: number;

    // Drag state
    overBoardPos: Position | null;
    overRackIndex: number | null;

    // Refs
    boardRef: React.RefObject<HTMLDivElement>;
    rackRef: React.RefObject<HTMLDivElement>;
    gameAreaRef: React.RefObject<HTMLDivElement>;

    selectedCell?: Position | null;
    onRackRightClick?: (tile: TileData, rackIndex: number) => boolean;
}
```

### RackCell
`src/components/RackCell.tsx` represents individual rack slots:

#### Responsibilities
- Renders tile in slot or empty slot indicator
- Handles drag interactions for tiles
- Shows selection state for keyboard navigation

## Atomic Components

### Tile
`src/components/Tile.tsx` renders individual game tiles:

#### Responsibilities
- Displays letter and score
- Handles blank tile special rendering
- Provides drag handles
- Shows visual feedback for interactions

#### Props
```typescript
interface TileProps {
    tile: TileData;
    size: number;
    opacity?: number;
    isDragging?: boolean;
    dragOverlay?: boolean;
}
```

### Sticker
`src/components/Sticker.tsx` shows bonus indicators:

#### Responsibilities
- Visual representation of bonus squares
- Shows consumption state
- Different styles for different sticker types

## Modal Components

### LetterSelectionPopup
`src/components/LetterSelectionPopup.tsx` handles blank tile letter selection:

#### Responsibilities
- Modal overlay for letter selection
- Grid of available letters
- Handles letter choice and cancellation
- Integrates with blank tile placement flow

## Development Components

### DebugMenu
`src/components/DebugMenu.tsx` provides development tools:

#### Responsibilities
- Testing controls for game state
- Debug actions (draw tiles, reset board, etc.)
- State inspection and modification
- Only shown in development

## Component Communication Patterns

### Props Drilling
Most components receive props directly from parent components. This creates a clear data flow but can result in many props being passed down:

```
GameArea ← useGameController (many props)
├── Board ← GameArea (filtered props)
│   └── BoardCell ← Board (cell-specific props)
```

### Refs for DOM Access
Components use refs for direct DOM manipulation:

- `boardRef` - For board cell size calculations
- `rackRef` - For drag-and-drop coordinate calculations
- `gameAreaRef` - For global positioning
- `discardRef` - For discard animations

### Event Handler Flow
Event handlers flow from hooks through components:

```
useGameController → handleRightClick → Board → BoardCell → user interaction
```

## Component State Management

### Local State
Some components manage their own local state:

- `GameArea` - Cell size, exiting draft animation
- `DebugMenu` - UI expansion state
- Modal components - Open/closed state (managed by hooks)

### Derived State
Components compute visual state from props:

- Selection indicators based on `selectedCell` and position
- Drag overlays based on drag state
- Visual feedback based on `canPlace`/`canTake`

## Rendering Optimizations

### Conditional Rendering
Components conditionally render based on game mode:

```jsx
{/* Draft mode vs Game mode */}
{isDraftMode ? <DraftBoard /> : <Board />}
```

### Activity Components
Some components use conditional visibility without unmounting:

```jsx
<Activity mode={!isDraftMode ? "visible" : "hidden"}>
    <Board /> {/* Stays mounted but hidden */}
</Activity>
```

## Styling Patterns

### CSS Classes
Components use Tailwind CSS with consistent patterns:

- `bg-green-800 border-green-900` for game board
- `bg-blue-800 border-blue-900` for draft board
- `grid gap-1` for cell layouts
- Responsive sizing with `aspect-square`

### Dynamic Styling
Some styles are computed from props:

```jsx
style={{
    width: `${BOARD_WIDTH}px`,
    maxWidth: BOARD_MAX_WIDTH,
    opacity: tileOpacity / 100
}}
```

## Refactoring Opportunities

1. **Props Consolidation**: `GameArea` receives too many props; could use context or compound components
2. **Component Splitting**: Some components handle multiple concerns (BoardCell handles rendering + interactions)
3. **Hook Integration**: Components could be thinner by moving logic to custom hooks
4. **Render Optimization**: Large component trees could benefit from React.memo or virtualization
5. **Type Safety**: Some prop interfaces could be more specific or use discriminated unions
6. **Accessibility**: Components lack ARIA labels and keyboard navigation support

The current component structure works well for this game but could be optimized for larger applications with more complex component interactions.
