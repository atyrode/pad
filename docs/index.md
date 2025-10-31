# Manifold Game Documentation

This documentation provides a comprehensive guide to how the Scrabble-like game codebase is structured and how all components work together.

## Overview

Manifold is a Scrabble-like word game built with React, TypeScript, and a custom game engine. The codebase is organized into several layers:

- **Components** - React components for UI rendering
- **Hooks** - Custom React hooks for game logic and interactions
- **Engine** - High-level game operations and business rules
- **Domain** - Pure functional modules for core game mechanics
- **State** - Global state management using Zustand
- **Types** - TypeScript type definitions
- **Utils** - Utility functions and constants

## Documentation Structure

### Architecture Documents

These documents explain the high-level system design and patterns:

- **[System Overview](architecture/overview.md)** - High-level architecture and component hierarchy
- **[State Management](architecture/state-management.md)** - Zustand store and state management
- **[Components](architecture/components.md)** - Component structure and responsibilities
- **[Custom Hooks](architecture/hooks.md)** - Hook architecture and composition patterns
- **[Engine Layer](architecture/engine.md)** - GameService and Rules engine design
- **[Domain Layer](architecture/domain.md)** - Pure functional modules and core mechanics
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
- `src/state/store.ts` - Zustand store with typed slices
- `src/state/selectors.ts` - Zustand-derived selectors and hooks
- `src/hooks/useGameController.ts` - Main game logic orchestrator

#### Core Engine
- `src/engine/GameService.ts` - High-level game operations orchestrator
- `src/engine/Rules.ts` - Game rules and validation engine
- `src/engine/TileOperations.ts` - Tile movement operations
- `src/engine/TileSupply.ts` - Bag and drawing logic
- `src/engine/PlayResolution.ts` - Play validation and scoring
- `src/engine/DiscardOperations.ts` - Discard operations

#### Domain Layer
- `src/domain/board/Board.ts` - Board state management and word finding
- `src/domain/rack/Rack.ts` - Rack operations and management
- `src/domain/bag/Bag.ts` - Tile bag creation and shuffling
- `src/domain/stickers/Stickers.ts` - Bonus system management
- `src/domain/dictionary/Dictionary.ts` - Word validation
- `src/domain/draft/Draft.ts` - Draft mode logic

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

#### State Management
- Global state managed through Zustand store in `src/state/store.ts`
- Components use store hooks directly: `useGameStore()`, `useCanPlay()`, etc.
- Complex operations use `batchUpdate()` for atomic state changes

#### Component Props Flow
- Components read from store hooks instead of receiving props
- Event handlers are passed down from `useGameController`
- Refs are used for DOM manipulation (drag-drop, sizing)

#### Engine Layer
- `GameService` provides high-level operations (place, remove, resolve play)
- `Rules` engine handles validation and business logic
- Domain modules provide pure functional operations
- All functions return immutable state updates

#### Data Flow
1. User interaction → `useGameController` hook
2. Controller calls `GameService` methods
3. GameService orchestrates domain/engine operations
4. Results batched back to Zustand store
5. Components re-render from store subscriptions

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
| `src/state/store.ts` | [State Management](architecture/state-management.md) |
| `src/state/selectors.ts` | [State Management](architecture/state-management.md) |
| `src/hooks/useGameController.ts` | [Custom Hooks](architecture/hooks.md), [Data Flow](architecture/data-flow.md) |
| `src/engine/GameService.ts` | [Engine Layer](architecture/engine.md) |
| `src/engine/Rules.ts` | [Engine Layer](architecture/engine.md) |
| `src/engine/TileOperations.ts` | [Placement](mechanics/placement.md), [Blank Tiles](mechanics/blank-tiles.md) |
| `src/engine/TileSupply.ts` | [Bag](mechanics/bag.md), [Drawing](mechanics/drawing.md) |
| `src/engine/PlayResolution.ts` | [Play Resolution](mechanics/play-resolution.md), [Scoring](mechanics/scoring.md) |
| `src/domain/board/Board.ts` | [Board](mechanics/board.md), [Domain Layer](architecture/domain.md) |
| `src/domain/rack/Rack.ts` | [Rack](mechanics/rack.md), [Domain Layer](architecture/domain.md) |
| `src/domain/bag/Bag.ts` | [Bag](mechanics/bag.md), [Domain Layer](architecture/domain.md) |
| `src/domain/stickers/Stickers.ts` | [Stickers](mechanics/stickers.md), [Domain Layer](architecture/domain.md) |
| `src/domain/dictionary/Dictionary.ts` | [Dictionary](mechanics/dictionary.md), [Domain Layer](architecture/domain.md) |
| `src/domain/draft/Draft.ts` | [Draft Mode](mechanics/draft.md), [Domain Layer](architecture/domain.md) |
| `src/components/GameArea.tsx` | [Components](architecture/components.md) |
| `src/components/Board.tsx` | [Board](mechanics/board.md), [Components](architecture/components.md) |
| `src/components/DraftBoard.tsx` | [Draft Mode](mechanics/draft.md), [Components](architecture/components.md) |

*This mapping is not exhaustive. Check document cross-references for complete coverage.*
