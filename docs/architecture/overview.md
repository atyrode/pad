# System Overview

This document provides a high-level overview of the Manifold game architecture, including the directory structure, main components, and how they interact.

## Architecture Overview

Manifold follows a layered architecture with clear separation of concerns:

```
┌─────────────────┐
│   Components    │ ← React UI components
│    (src/)       │
├─────────────────┤
│     Hooks       │ ← Custom React hooks
│    (src/)       │
├─────────────────┤
│     Engine      │ ← Pure game logic functions
│    (src/)       │
├─────────────────┤
│     State       │ ← Global state management
│    (src/)       │
├─────────────────┤
│     Types       │ ← TypeScript definitions
│    (src/)       │
├─────────────────┤
│     Utils       │ ← Utility functions
│    (src/)       │
├─────────────────┤
│   Constants     │ ← Game configuration
│    (src/)       │
└─────────────────┘
```

## Directory Structure

### `/src/components/`
React components for rendering the game UI. Components are organized by feature:

- `GameArea.tsx` - Main game container that switches between draft and play modes
- `Board.tsx` / `BoardCell.tsx` - Game board display and cell interactions
- `DraftBoard.tsx` - Draft mode board with special placement rules
- `Rack.tsx` / `RackCell.tsx` - Player's tile rack
- `DiscardSlot.tsx` - Discard area for removing tiles
- `Tile.tsx` - Individual tile rendering
- `Sticker.tsx` - Bonus sticker visual indicators
- `LetterSelectionPopup.tsx` - Blank tile letter selection
- `DebugMenu.tsx` - Development debugging interface

### `/src/hooks/`
Custom React hooks that encapsulate game logic and user interactions:

- `useGameController.ts` - **Main orchestrator** - coordinates all game logic
- `useGameSetters.ts` - Convenient state update functions
- `useDragAndDrop.ts` - Drag and drop interactions
- `useDragEndWithDiscard.ts` - Discard operations with animation
- `useKeyboardSelector.ts` - Keyboard navigation system
- `useKeyboardTileActions.ts` - Keyboard-based tile placement
- `useBlankTilePlacement.ts` - Blank tile letter selection flow
- `useSeedBagFromDraft.ts` - Draft to bag seeding logic
- `useDraftSuggestionsReroll.ts` - Draft suggestion regeneration
- `useCellSize.ts` - Responsive cell sizing

### `/src/engine/`
Pure functions that implement core game mechanics. These are stateless and testable:

- `TileOperations.ts` - Tile movement between rack, board, and positions
- `TileSupply.ts` - Bag management, drawing, and tile distribution
- `PlayResolution.ts` - Play validation, scoring, and resolution
- `DiscardOperations.ts` - Discard operations and placement history cleanup

### `/src/state/`
Global state management using React Context and useReducer:

- `GameContext.tsx` - Context provider and hooks
- `gameReducer.ts` - State update logic
- `gameTypes.ts` - State interfaces and action types
- `selectors.ts` - Derived state computations

### `/src/types/`
TypeScript type definitions:

- `board.ts` - Board state, cells, positions, placement history
- `rack.ts` - Rack state and cell interfaces
- `tile.ts` - Tile data structure
- `sticker.ts` - Bonus sticker types
- `bag.ts` - Tile bag type

### `/src/utils/`
Utility functions for specific domains:

- `domain/board/Board.ts` - Board analysis, word finding, placement validation
- `domain/rack/Rack.ts` - Rack operations like shuffling
- `draftBoardUtils.ts` - Draft board initialization and tile placement
- `stickerUtils.ts` - Sticker management and consumption
- `tileDefinitions.ts` - Tile letter definitions and scoring
- `dictionaryUtils.ts` - Word validation using French dictionary
- `transformUtils.ts` - Coordinate transformations and board utilities

### `/src/constants/`
Configuration constants:

- `board.ts` - Board dimensions and layout constants

## Component Hierarchy

The main component hierarchy flows from the app down to individual cells:

```
App (page.tsx)
├── GameProvider (GameContext.tsx)
│   └── GameArea
│       ├── Board/DraftBoard
│       │   └── BoardCell (11x11 grid)
│       │       └── Tile + Sticker
│       ├── Rack
│       │   └── RackCell (7 slots)
│       │       └── Tile
│       ├── DiscardSlot
│       │   └── Tile (animated)
│       └── LetterSelectionPopup (modal)
│           └── Tile selection grid
```

## Data Flow Patterns

### State Flow
```
GameProvider → useGame() hook → Components receive state slices
                    ↓
useGameController → Orchestrates all game logic
                    ↓
Engine Functions → Pure computations
                    ↓
dispatch() → Reducer → State updates
```

### User Interaction Flow
```
User Event → Component handler → Hook logic → Engine function → State update
```

### Key Principles

1. **Separation of Concerns**: UI, logic, and state are clearly separated
2. **Pure Functions**: Engine layer contains only pure, testable functions
3. **Single Source of Truth**: All state flows through the reducer
4. **Composition over Inheritance**: Hooks compose functionality
5. **Immutability**: State updates create new objects, never mutate existing ones

## Main Entry Points

### Application Entry
- `app/page.tsx` - Next.js page component
- `src/components/GameArea.tsx` - Main game UI component

### Logic Entry
- `src/hooks/useGameController.ts` - Central game logic coordinator
- `src/state/GameContext.tsx` - State management setup

## Dependencies and Interactions

### External Dependencies
- React for UI framework
- @dnd-kit for drag and drop functionality
- Lucide React for icons

### Internal Dependencies
- Engine functions are independent of React/hooks
- Hooks depend on engine functions and state
- Components depend on hooks for logic
- State is framework-agnostic (could be used with other UI libraries)

## Development Patterns

### Testing
- Engine functions can be unit tested independently
- Hooks can be tested with React Testing Library
- Components can be tested with visual regression tools

### Debugging
- `DebugMenu` component provides development controls
- Console logging in engine functions for debugging
- State inspection through React DevTools

## Refactoring Opportunities

1. **Hook Composition**: `useGameController` is very large and could be split into smaller, focused hooks
2. **Engine Organization**: Some engine functions could be further modularized
3. **State Structure**: Some state slices could be normalized or denormalized for better performance
4. **Component Coupling**: Some components receive many props that could be consolidated
5. **Type Organization**: Some types could be moved closer to where they're used

This overview provides the foundation for understanding how all the pieces fit together. Refer to specific mechanic and architecture documents for detailed explanations of each subsystem.
