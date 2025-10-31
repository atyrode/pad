"use client";

import { useCallback } from "react";
import { BoardState, PlacementHistoryEntry, Position } from "../types/board";
import { RackState } from "../types/rack";
import { TileData } from "../types/tile";
import * as Rack from "../domain/rack/Rack";
import * as TileOperations from "../engine/TileOperations";

interface UseKeyboardTileActionsProps {
  board: BoardState;
  rack: RackState;
  placementHistory: PlacementHistoryEntry[];
  setBoard: React.Dispatch<React.SetStateAction<BoardState>>;
  setRack: React.Dispatch<React.SetStateAction<RackState>>;
  setPlacementHistory: (updater: PlacementHistoryEntry[] | ((prev: PlacementHistoryEntry[]) => PlacementHistoryEntry[])) => void;
}

export function useKeyboardTileActions({
  board,
  rack,
  placementHistory,
  setBoard,
  setRack,
  setPlacementHistory,
}: UseKeyboardTileActionsProps) {
  const handleKeyboardTilePlacement = useCallback((letter: string, selectedCell: Position | null): boolean => {
    if (!selectedCell) return false;

    let rackIndex = rack.findIndex(
      t => t && t.value.toUpperCase() === letter.toUpperCase()
    );

    let tile = rack[rackIndex];
    let wasBlank = false;
    if (rackIndex === -1) {
      rackIndex = rack.findIndex(t => t && t.value === '*');
      if (rackIndex !== -1) {
        const blankTile = rack[rackIndex]!;
        tile = {
          ...blankTile,
          value: letter.toUpperCase(),
          originalValue: '*',
          displayValue: letter.toUpperCase(),
        } as TileData;
        wasBlank = true;
      }
    }
    if (rackIndex === -1 || !tile) return false;

    const targetCell = board[selectedCell.row][selectedCell.col];
    if (!targetCell.canPlace) return false;

    // Handle blank tile transformation before placement
    if (wasBlank) {
      // Transform blank tile for placement
      const transformedTile: TileData = {
        ...tile,
        value: letter.toUpperCase(),
        originalValue: '*',
        displayValue: letter.toUpperCase(),
      } as TileData;

      // Update rack with transformed tile temporarily
      const tempRack = [...rack];
      tempRack[rackIndex] = transformedTile;

      // Use TileOperations to place the transformed tile
      const result = TileOperations.placeTileOnBoardFromRack(
        tempRack,
        rackIndex,
        board,
        selectedCell,
        true // track history
      );

      if (result && result.placementHistoryEntry) {
        setRack(result.rack);
        setBoard(result.board);
        setPlacementHistory((prev) => [...prev, result.placementHistoryEntry!]);
        return true;
      }
      return false;
    }

    // Place regular tile using TileOperations
    const result = TileOperations.placeTileOnBoardFromRack(
      rack,
      rackIndex,
      board,
      selectedCell,
      true // track history
    );

    if (result && result.placementHistoryEntry) {
      setRack(result.rack);
      setBoard(result.board);
      setPlacementHistory((prev) => [...prev, result.placementHistoryEntry!]);
      return true;
    }

    return false;
  }, [board, rack, setBoard, setRack, setPlacementHistory]);

  const handleKeyboardTileRemoval = useCallback((): { success: boolean; position?: Position } => {
    if (placementHistory.length === 0) return { success: false };

    const emptySlotIndex = Rack.firstEmpty(rack);
    if (emptySlotIndex === null) return { success: false };

    let newHistory = [...placementHistory];
    let removedPosition: Position | null = null;

    while (newHistory.length > 0) {
      const lastPlacement = newHistory[newHistory.length - 1];
      const { tileId, position, wasBlank } = lastPlacement;
      const cell = board[position.row][position.col];
      if (!cell.tile || cell.tile.id !== tileId || !cell.canTake) {
        newHistory = newHistory.slice(0, -1);
        continue;
      }

      // Use TileOperations which handles blank tile reversion automatically
      const result = TileOperations.removeTileFromBoardToRack(
        board,
        position,
        rack,
        emptySlotIndex
      );

      if (result) {
        setBoard(result.board);
        setRack(result.rack);

        newHistory = newHistory.slice(0, -1);
        removedPosition = position;
        break;
      } else {
        // If removal failed, skip this history entry
        newHistory = newHistory.slice(0, -1);
        continue;
      }
    }

    setPlacementHistory(newHistory);
    if (removedPosition) return { success: true, position: removedPosition };
    return { success: false };
  }, [placementHistory, board, rack, setBoard, setRack, setPlacementHistory]);

  return {
    handleKeyboardTilePlacement,
    handleKeyboardTileRemoval,
  };
}
