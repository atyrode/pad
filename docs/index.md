# Manifold Game Documentation

This documentation provides a comprehensive guide to how the Scrabble-like game codebase is structured and how all components work together.

## Overview

Manifold is a Scrabble-like word game built with React, TypeScript, and a custom game engine. The codebase is organized into several layers:

- **Components** - React components for UI rendering
- **Hooks** - Custom React hooks for game logic and interactions
- **Engine** - Pure functions for game mechanics (tile operations, scoring, etc.)
- **State** - Global state management using React Context and useReducer
- **Types** - TypeScript type definitions
- **Utils** - Utility functions for board logic, stickers, etc.

## Documentation Structure

### Architecture Documents

These documents explain the high-level system design and patterns:

- **[System Overview](architecture/overview.md)** - High-level architecture and component hierarchy
- **[State Management](architecture/state-management.md)** - How game state is managed and updated
- **[Components](architecture/components.md)** - Component structure and responsibilities
- **[Custom Hooks](architecture/hooks.md)** - Hook architecture and composition patterns
- **[Engine Layer](architecture/engine.md)** - Pure function design and engine responsibilities
- **[Data Flow](architecture/data-flow.md)** - How data flows through the system
- **[Interactions](architecture/interactions.md)** - User interaction systems (drag-drop, keyboard, etc.)

### Game Mechanics Documents

These documents explain specific game features and how they work:

- **[Draft Mode](mechanics/draft.md)** - Draft board mechanics and bag seeding
- **[Board](mechanics/board.md)** - Board state, word finding, and placement rules
- **[Rack](mechanics/rack.md)** - Rack management and tile organization
- **[Bag](mechanics/bag.md)** - Tile bag creation and distribution
- **[Drawing](mechanics/drawing.md)** - Drawing tiles from bag to rack
- **[Discarding](mechanics/discarding.md)** - Discarding tiles and replacement logic
- **[Blank Tiles](mechanics/blank-tiles.md)** - Blank tile handling and letter selection
- **[Placement](mechanics/placement.md)** - Tile placement operations between rack and board
- **[Play Resolution](mechanics/play-resolution.md)** - Play validation, scoring, and tile locking
- **[Stickers](mechanics/stickers.md)** - Sticker system (multipliers, points, start position)
- **[Scoring](mechanics/scoring.md)** - Word scoring with bonuses and bingo rules
- **[Dictionary](mechanics/dictionary.md)** - Word validation using French dictionary

## Quick Reference

### Key Files by Category

#### Entry Points
- `app/page.tsx` - Main app component
- `src/components/GameArea.tsx` - Main game UI component

#### State Management
- `src/state/GameContext.tsx` - Global state context
- `src/state/gameReducer.ts` - State reducer
- `src/state/gameTypes.ts` - State types and actions
- `src/hooks/useGameController.ts` - Main game logic orchestrator

#### Core Engine
- `src/engine/TileOperations.ts` - Tile movement operations
- `src/engine/TileSupply.ts` - Bag and drawing logic
- `src/engine/PlayResolution.ts` - Play validation and scoring
- `src/engine/DiscardOperations.ts` - Discard operations

#### UI Components
- `src/components/Board.tsx` / `BoardCell.tsx` - Board display
- `src/components/Rack.tsx` / `RackCell.tsx` - Rack display
- `src/components/DraftBoard.tsx` - Draft mode board
- `src/components/DiscardSlot.tsx` - Discard area

#### Interaction Hooks
- `src/hooks/useDragAndDrop.ts` - Drag and drop functionality
- `src/hooks/useKeyboardSelector.ts` - Keyboard navigation
- `src/hooks/useBlankTilePlacement.ts` - Blank tile popup handling

### Common Patterns

#### State Updates
- All state updates go through the reducer via `dispatch()`
- Setter hooks like `useGameSetters` provide convenient update functions
- Engine functions are pure and return new state objects

#### Component Props Flow
- Components receive state slices and setter functions
- Event handlers are passed down from `useGameController`
- Refs are used for DOM manipulation (drag-drop, sizing)

#### Engine Function Signatures
- Pure functions that take current state and return new state
- Often return objects with multiple updated state slices
- Handle both success and failure cases (return `null` for failures)

## Getting Started

1. Start with the [System Overview](architecture/overview.md) to understand the big picture
2. Read about [State Management](architecture/state-management.md) to understand data flow
3. Dive into specific mechanics as needed for your task

## Contributing to Documentation

When making changes to the codebase:

1. Update relevant mechanic documents if you change game logic
2. Update architecture documents if you change system structure
3. Add new documents for new features following the existing format
4. Keep the index.md updated with new documents

## File-to-Document Mapping

| File Path | Document |
|-----------|----------|
| `src/state/GameContext.tsx` | [State Management](architecture/state-management.md) |
| `src/hooks/useGameController.ts` | [Custom Hooks](architecture/hooks.md), [Data Flow](architecture/data-flow.md) |
| `src/engine/TileOperations.ts` | [Placement](mechanics/placement.md), [Blank Tiles](mechanics/blank-tiles.md) |
| `src/engine/TileSupply.ts` | [Bag](mechanics/bag.md), [Drawing](mechanics/drawing.md) |
| `src/engine/PlayResolution.ts` | [Play Resolution](mechanics/play-resolution.md), [Scoring](mechanics/scoring.md) |
| `src/components/Board.tsx` | [Board](mechanics/board.md), [Components](architecture/components.md) |
| `src/components/DraftBoard.tsx` | [Draft Mode](mechanics/draft.md), [Components](architecture/components.md) |

*This mapping is not exhaustive. Check document cross-references for complete coverage.*
