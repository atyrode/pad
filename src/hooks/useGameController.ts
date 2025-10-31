"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { closestCenter, DndContextProps } from "@dnd-kit/core";
import { useGame, useGameDispatch } from "../state/GameContext";
import { useGameSetters } from "./useGameSetters";
import { useBlankTilePlacement } from "./useBlankTilePlacement";
import { useDraftSuggestionsReroll } from "./useDraftSuggestionsReroll";
import { useSeedBagFromDraft } from "./useSeedBagFromDraft";
import { useDragAndDrop } from "./useDragAndDrop";
import { useDragEndWithDiscard } from "./useDragEndWithDiscard";
import { useKeyboardSelector } from "./useKeyboardSelector";
import { BoardState, PlacementHistoryEntry, Position } from "../types/board";
import { RackState } from "../types/rack";
import { TileData } from "../types/tile";
import { shuffleRack } from "../utils/rackUtils";
import * as TileOperations from "../engine/TileOperations";
import { createInitialDraftBoard } from "../utils/draftBoardUtils";
import { getAllAvailableLetters } from "../utils/tileDefinitions";
import {
  drawAllAction,
  drawOneAction,
  fillRackAfterPlayAction,
  handleKeyboardTilePlacementAction,
  handleKeyboardTileRemovalAction,
  handlePlayAction,
  redrawAction,
  resetBagFromDraftAction,
  resetBoardAction,
  resetRackAction,
  resetScoreAction,
  resetStickersAction,
  shuffleBagAction,
} from "../state/gameActions";
import { canPlaySelector, canShuffleSelector } from "../state/selectors";

export function useGameController() {
  // Mounted flag to avoid hydration mismatch
  const [mounted, setMounted] = useState(false);

  // Global state
  const state = useGame();
  const dispatch = useGameDispatch();

  // Simple setters
  const {
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
    setPlacementHistory,
  } = useGameSetters();

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
  const [exitingDraft, setExitingDraft] = useState(false);

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

  // Keyboard placement/removal
  const handleKeyboardTilePlacement = (letter: string): boolean =>
    handleKeyboardTilePlacementAction(
      {
        letter,
        selectedCell,
        board: state.board,
        rack: state.rack,
        placementHistory: state.placementHistory,
      },
      dispatch
    );

  const handleKeyboardTileRemoval = () =>
    handleKeyboardTileRemovalAction(
      { placementHistory: state.placementHistory, board: state.board, rack: state.rack },
      dispatch
    );

  // Selector
  const { selectedCell, selectorDirection, advanceSelector } = useKeyboardSelector({
    onLetterInput: handleKeyboardTilePlacement,
    onBackspace: handleKeyboardTileRemoval,
    onShuffle: () => setRack((prev: RackState) => shuffleRack(prev)),
    onPlay: () => {
      if (canPlaySelector({ board: state.board, stickers: state.stickers, isDictionaryLoaded: state.isDictionaryLoaded })) {
        handlePlay();
      }
    },
    board: state.board,
  });

  // Right-click handlers
  const handleRightClick = (tile: TileData, position: Position): boolean => {
    if (state.isDraftMode) return false;
    const emptySlotIndex = TileOperations.findFirstEmptySlot(state.rack);
    if (emptySlotIndex === null) return false;
    
    // Use TileOperations which handles blank tile reversion automatically
    const result = TileOperations.removeTileFromBoardToRack(
      state.board,
      position,
      state.rack,
      emptySlotIndex
    );
    
    if (result) {
      setBoard(result.board);
      setRack(result.rack);
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
    
    // Use TileOperations to place tile
    const result = TileOperations.placeTileOnBoardFromRack(
      state.rack,
      rackIndex,
      state.board,
      selectedCell,
      true // track history
    );
    
    if (result && result.placementHistoryEntry) {
      setRack(result.rack);
      setBoard(result.board);
      setPlacementHistory((prev: PlacementHistoryEntry[]) => [
        ...prev,
        result.placementHistoryEntry!,
      ]);
      advanceSelector();
      return true;
    }
    return false;
  };

  // Actions
  const handleShuffle = () => setRack((prevRack: RackState) => shuffleRack(prevRack));
  const handlePlay = () =>
    handlePlayAction(
      {
        board: state.board,
        stickers: state.stickers,
        rack: state.rack,
        bag: state.bag,
        discard: state.discard,
        currentTotalScore: state.totalScore,
      },
      dispatch
    );
  const fillRackAfterPlay = () =>
    fillRackAfterPlayAction(
      { isDraftMode: state.isDraftMode, rack: state.rack, bag: state.bag, discard: state.discard },
      dispatch
    );

  // Derived flags
  const canPlay = canPlaySelector({ board: state.board, stickers: state.stickers, isDictionaryLoaded: state.isDictionaryLoaded });
  const canShuffle = canShuffleSelector(state.rack);

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
    onDraw: () => drawOneAction({ rack: state.rack, bag: state.bag, discard: state.discard }, dispatch),
    onDrawAll: () => drawAllAction({ rack: state.rack, bag: state.bag, discard: state.discard }, dispatch),
    onRedraw: () => redrawAction({ rack: state.rack, bag: state.bag, discard: state.discard }, dispatch),
    onClearRack: () => resetRackAction({ rackSize: state.rack.length }, dispatch),
    onResetBoard: () => resetBoardAction(dispatch),
    onResetScore: () => resetScoreAction(dispatch),
    onResetStickers: () => resetStickersAction({ board: state.board }, dispatch),
    onResetBag: () => resetBagFromDraftAction({ draftBoard: state.draftBoard }, dispatch),
    onResetGame: () => {
      resetBoardAction(dispatch);
      resetRackAction({ rackSize: state.rack.length }, dispatch);
      resetScoreAction(dispatch);
      resetStickersAction({ board: state.board }, dispatch);
      resetBagFromDraftAction({ draftBoard: state.draftBoard }, dispatch);
    },
    onShuffleBag: () => shuffleBagAction({ bag: state.bag }, dispatch),
    onResetDraft: () => {
      setDraftBoard(createInitialDraftBoard());
      setDraftRerollCount(0);
      setDraftEnded(false);
      setHasSeededFromDraft(false);
      suggestedOccupancyRef.current = null;
    },
    onRerollSuggestions: () => rerollSuggestions(),
  }), [dispatch, rerollSuggestions, setDraftBoard, setDraftEnded, setDraftRerollCount, setHasSeededFromDraft, state.bag, state.board, state.draftBoard, state.rack.length, state.discard]);

  return {
    // rendering/context
    mounted,
    state,
    dispatch,
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
    exitingDraft,
    setExitingDraft,

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


