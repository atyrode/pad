"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { closestCenter, DndContextProps } from "@dnd-kit/core";
import { useGameStore } from "../state/store";
import { useBlankTilePlacement } from "./useBlankTilePlacement";
import { useDraftSuggestionsReroll } from "./useDraftSuggestionsReroll";
import { useSeedBagFromDraft } from "./useSeedBagFromDraft";
import { useDragAndDrop } from "./useDragAndDrop";
import { useDragEndWithDiscard } from "./useDragEndWithDiscard";
import { useKeyboardSelector } from "./useKeyboardSelector";
import { useKeyboardTileActions } from "./useKeyboardTileActions";
import { BoardState, PlacementHistoryEntry, Position } from "../types/board";
import { RackState } from "../types/rack";
import { TileData } from "../types/tile";
import * as Rack from "../domain/rack/Rack";
import GameService from "../engine/GameService";
import { getAllAvailableLetters } from "../utils/tileDefinitions";
import { useCanPlay, useCanShuffle } from "../state/selectors";

export function useGameController() {
  // Mounted flag to avoid hydration mismatch
  const [mounted, setMounted] = useState(false);

  // Global state from Zustand store
  const state = useGameStore();

  // Store actions - using individual selectors to avoid infinite loops
  const setBoard = useGameStore((state) => state.setBoard);
  const setRack = useGameStore((state) => state.setRack);
  const setBag = useGameStore((state) => state.setBag);
  const setDiscard = useGameStore((state) => state.setDiscard);
  const setStickers = useGameStore((state) => state.setStickers);
  const setTotalScore = useGameStore((state) => state.setTotalScore);
  const setTileOpacity = useGameStore((state) => state.setTileOpacity);
  const setShowCoordinates = useGameStore((state) => state.setShowCoordinates);
  const setExitingDraft = useGameStore((state) => state.setExitingDraft);
  const setIsDraftMode = useGameStore((state) => state.setIsDraftMode);
  const setDraftBoard = useGameStore((state) => state.setDraftBoard);
  const setDraftRerollCount = useGameStore((state) => state.setDraftRerollCount);
  const setDraftEnded = useGameStore((state) => state.setDraftEnded);
  const setHasSeededFromDraft = useGameStore((state) => state.setHasSeededFromDraft);
  const setPlacementHistory = useGameStore((state) => state.setPlacementHistory);
  const addPlacement = useGameStore((state) => state.addPlacement);
  const batchUpdate = useGameStore((state) => state.batchUpdate);

  // Derived state
  const canPlay = useCanPlay();
  const canShuffle = useCanShuffle();

  // Blank tile letter selection popup
  const {
    blankTilePopup,
    openBlankTilePopup,
    handleLetterSelection,
    handlePopupCancel,
  } = useBlankTilePlacement({
    board: state.board,
    setBoard,
    rack: state.rack,
    setRack,
    setPlacementHistory,
  });

  // UI state and refs
  const [boardCellSize, setBoardCellSize] = useState(44);
  const boardRef = useRef<HTMLDivElement>(null);
  const rackRef = useRef<HTMLDivElement>(null);
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const discardRef = useRef<HTMLDivElement>(null);

  // Placement history appends for DnD path
  const handleDragAndDropPlacement = (tileId: string, position: Position, wasBlank: boolean) => {
    setPlacementHistory((prev) => [...prev, { tileId, position, wasBlank }]);
  };

  // DnD wiring (note: draft uses draftBoard)
  const {
    sensors,
    handleDragStart,
    handleDragOver,
    handleDragEnd: originalHandleDragEnd,
    overBoardPos,
    overRackIndex,
    activeId,
  } = useDragAndDrop({
    board: state.isDraftMode ? state.draftBoard : state.board,
    setBoard: state.isDraftMode ? setDraftBoard : setBoard,
    rack: state.rack,
    setRack,
    gameAreaRef,
    onTilePlaced: handleDragAndDropPlacement,
  });

  // Discard animation and drag-end
  const { handleDragEnd, discardAnim, isDiscarding } = useDragEndWithDiscard({
    board: state.board,
    setBoard,
    rack: state.rack,
    setRack,
    bag: state.bag,
    setBag,
    discard: state.discard,
    setDiscard,
    placementHistory: state.placementHistory,
    setPlacementHistory,
    openBlankTilePopup,
    originalHandleDragEnd,
  });

  // Keyboard tile placement/removal actions
  const {
    handleKeyboardTilePlacement: rawHandleKeyboardTilePlacement,
    handleKeyboardTileRemoval,
  } = useKeyboardTileActions({
    board: state.board,
    rack: state.rack,
    placementHistory: state.placementHistory,
    setBoard,
    setRack,
    setPlacementHistory,
  });

  // Selector
  const { selectedCell, selectorDirection, advanceSelector } = useKeyboardSelector({
    onLetterInput: rawHandleKeyboardTilePlacement,
    onBackspace: handleKeyboardTileRemoval,
    onShuffle: () => setRack((prev: RackState) => Rack.shuffle(prev)),
    onPlay: () => {
      if (canPlay) {
        handlePlay();
      }
    },
    board: state.board,
  });

  // Right-click handlers
  const handleRightClick = (tile: TileData, position: Position): boolean => {
    if (state.isDraftMode) return false;
    const emptySlotIndex = Rack.firstEmpty(state.rack);
    if (emptySlotIndex === null) return false;

    const result = GameService.removeToRack(
      state.board,
      position,
      state.rack,
      state.placementHistory
    );

    if (result) {
      batchUpdate({
        board: result.board,
        rack: result.rack,
        placementHistory: result.placementHistory,
      });
      return true;
    }
    return false;
  };

  const handleDraftSuggestionRightClick = (tile: TileData, position: Position): boolean => {
    if (!state.isDraftMode) return false;
    const suggestedPositions = [
      { row: 4, col: 2 },
      { row: 4, col: 5 },
      { row: 4, col: 8 },
    ];
    const isFromSuggested = suggestedPositions.some((pos) => pos.row === position.row && pos.col === position.col);
    if (!isFromSuggested) return false;
    const centerCount = 7;
    const centerStart = Math.floor((11 - centerCount) / 2);
    const centerEnd = centerStart + centerCount - 1;
    const placementCells: Position[] = [];
    [7, 8].forEach((r) => {
      for (let c = centerStart; c <= centerEnd; c++) placementCells.push({ row: r, col: c });
    });
    const target = placementCells.find((pos) => !state.draftBoard[pos.row][pos.col].tile);
    if (!target) return false;
    setDraftBoard((prevBoard: BoardState) => {
      const newBoard = prevBoard.map((row) => row.map((cell) => ({ ...cell })));
      newBoard[position.row][position.col] = { ...newBoard[position.row][position.col], tile: null };
      newBoard[target.row][target.col] = { ...newBoard[target.row][target.col], tile };
      return newBoard;
    });
    if (tile.value === "*") {
      setDraftBoard((prevBoard: BoardState) => {
        const newBoard = prevBoard.map((row) => [...row]);
        newBoard[4][2] = { ...newBoard[4][2], tile: null };
        newBoard[4][5] = { ...newBoard[4][5], tile: null };
        newBoard[4][8] = { ...newBoard[4][8], tile: null };
        return newBoard;
      });
    }
    return true;
  };

  const handleRackRightClick = (tile: TileData, rackIndex: number): boolean => {
    if (!selectedCell) return false;
    const targetCell = state.board[selectedCell.row][selectedCell.col];
    if (!targetCell.canPlace) return false;

    const result = GameService.placeFromRack(
      state.rack,
      rackIndex,
      state.board,
      selectedCell,
      state.placementHistory
    );

    if (result) {
      batchUpdate({
        rack: result.rack,
        board: result.board,
        placementHistory: result.placementHistory,
      });
      advanceSelector();
      return true;
    }
    return false;
  };

  // Actions
  const handleShuffle = () => setRack((prevRack: RackState) => Rack.shuffle(prevRack));
  
  const handlePlay = () => {
    const gameState: GameService.GameStateSnapshot = {
      board: state.board,
      rack: state.rack,
      bag: state.bag,
      discard: state.discard,
      stickers: state.stickers,
      totalScore: state.totalScore,
      placementHistory: state.placementHistory,
    };

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
  };

  const fillRackAfterPlay = () => {
    if (state.isDraftMode) return;

    const gameState: GameService.GameStateSnapshot = {
      board: state.board,
      rack: state.rack,
      bag: state.bag,
      discard: state.discard,
      stickers: state.stickers,
      totalScore: state.totalScore,
      placementHistory: state.placementHistory,
    };

    const result = GameService.drawToFill(gameState);

    batchUpdate({
      rack: result.rack,
      bag: result.bag,
      discard: result.discard,
    });
  };

  // Derived flags are now at the top level

  // Draft suggestion reroll and seeding
  const suggestedOccupancyRef = useRef<[boolean, boolean, boolean] | null>(null);
  const { rerollSuggestions } = useDraftSuggestionsReroll({
    isDraftMode: state.isDraftMode,
    draftBoard: state.draftBoard,
    draftEnded: state.draftEnded,
    draftRerollCount: state.draftRerollCount,
    setDraftBoard,
    setDraftRerollCount,
    setDraftEnded,
    suggestedOccupancyRef,
  });

  useSeedBagFromDraft({
    isDraftMode: state.isDraftMode,
    draftBoard: state.draftBoard,
    draftEnded: state.draftEnded,
    hasSeededFromDraft: state.hasSeededFromDraft,
    setBag,
    setHasSeededFromDraft,
  });

  // Mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Debug menu callbacks consolidated
  const debugActions = useMemo(() => ({
    onDraw: () => {
      const result = TileSupply.drawOne({
        rack: state.rack,
        bag: state.bag,
        discard: state.discard,
      });
      if (!result) return;
      setDiscard(result.discard);
      setBag(result.bag);
      setRack(result.rack);
    },
    onDrawAll: () => {
      const gameState: GameService.GameStateSnapshot = {
        board: state.board,
        rack: state.rack,
        bag: state.bag,
        discard: state.discard,
        stickers: state.stickers,
        totalScore: state.totalScore,
        placementHistory: state.placementHistory,
      };
      const result = GameService.drawToFill(gameState);
      batchUpdate({
        rack: result.rack,
        bag: result.bag,
        discard: result.discard,
      });
    },
    onRedraw: () => {
      const result = TileSupply.redraw({
        rack: state.rack,
        bag: state.bag,
        discard: state.discard,
      });
      setDiscard(result.discard);
      setBag(result.bag);
      setRack(result.rack);
    },
    onClearRack: () => {
      const emptyRack: RackState = Array(state.rack.length).fill(null);
      setRack(emptyRack);
    },
    onResetBoard: () => {
      setBoard(Board.createEmpty());
    },
    onResetScore: () => {
      setTotalScore(0);
    },
    onResetStickers: () => {
      let stickers = Stickers.createInitialStickers();
      for (let row = 0; row < state.board.length; row++) {
        for (let col = 0; col < state.board[row].length; col++) {
          const cell = state.board[row][col];
          if (cell.tile && !cell.canTake) {
            stickers = Stickers.consumeSticker(stickers, { row, col });
          }
        }
      }
      setStickers(stickers);
    },
    onResetBag: () => {
      const centerCount = 7;
      const centerStart = Math.floor((11 - centerCount) / 2);
      const positions = [7, 8].flatMap(r => Array.from({ length: centerCount }, (_, i) => ({ row: r, col: centerStart + i })));
      const draftedTiles = positions
        .map(p => state.draftBoard[p.row][p.col].tile)
        .filter(Boolean) as TileData[];
      setBag(Bag.shuffle([...draftedTiles]));
    },
    onResetGame: () => {
      // Capture current board before resetting for sticker calculation
      const currentBoard = state.board;
      setBoard(Board.createEmpty());
      const emptyRack: RackState = Array(state.rack.length).fill(null);
      setRack(emptyRack);
      setTotalScore(0);
      let stickers = Stickers.createInitialStickers();
      for (let row = 0; row < currentBoard.length; row++) {
        for (let col = 0; col < currentBoard[row].length; col++) {
          const cell = currentBoard[row][col];
          if (cell.tile && !cell.canTake) {
            stickers = Stickers.consumeSticker(stickers, { row, col });
          }
        }
      }
      setStickers(stickers);
      const centerCount = 7;
      const centerStart = Math.floor((11 - centerCount) / 2);
      const positions = [7, 8].flatMap(r => Array.from({ length: centerCount }, (_, i) => ({ row: r, col: centerStart + i })));
      const draftedTiles = positions
        .map(p => state.draftBoard[p.row][p.col].tile)
        .filter(Boolean) as TileData[];
      setBag(Bag.shuffle([...draftedTiles]));
    },
    onShuffleBag: () => {
      setBag(Bag.shuffle(state.bag));
    },
    onResetDraft: () => {
      setDraftBoard(Draft.createInitialDraftBoard());
      setDraftRerollCount(0);
      setDraftEnded(false);
      setHasSeededFromDraft(false);
      suggestedOccupancyRef.current = null;
    },
    onRerollSuggestions: () => rerollSuggestions(),
  }), [rerollSuggestions, setDraftBoard, setDraftEnded, setDraftRerollCount, setHasSeededFromDraft, setBag, setBoard, setDiscard, setRack, setStickers, setTotalScore, state.bag, state.board, state.draftBoard, state.rack, state.discard]);

  return {
    // rendering/context
    mounted,
    state,
    // simple setters for DebugMenu props compatibility
    setBoard,
    setRack,
    setBag,
    setDiscard,
    setStickers,
    setTotalScore,
    setTileOpacity,
    setShowCoordinates,
    setIsDraftMode,
    setDraftBoard,
    setDraftRerollCount,
    setDraftEnded,
    setHasSeededFromDraft,

    // UI state
    boardCellSize,
    setBoardCellSize,
    boardRef,
    rackRef,
    gameAreaRef,
    discardRef,

    // DnD
    sensors,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    overBoardPos,
    overRackIndex,
    activeId,
    collisionDetection: closestCenter as DndContextProps["collisionDetection"],

    // Keyboard
    selectedCell,
    selectorDirection,
    advanceSelector,

    // Actions/buttons
    handleRightClick,
    handleDraftSuggestionRightClick,
    handleRackRightClick,
    handleShuffle,
    handlePlay,
    fillRackAfterPlay,
    canPlay,
    canShuffle,

    // Blank tile popup
    blankTilePopup,
    handleLetterSelection,
    handlePopupCancel,

    // Debug menu consolidated actions
    debugActions,

    // Discard animation
    discardAnim,
    isDiscarding,

    // utilities
    getAllAvailableLetters,
  };
}


