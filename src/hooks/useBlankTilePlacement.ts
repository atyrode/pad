import { useState } from 'react';
import { BoardState, Position, PlacementHistoryEntry } from '../types/board';
import { RackState } from '../types/rack';
import { TileData } from '../types/tile';
import * as TileOperations from '../engine/TileOperations';

type SetBoard = React.Dispatch<React.SetStateAction<BoardState>>;
type SetRack = React.Dispatch<React.SetStateAction<RackState>>;
type SetPlacementHistory = (value: PlacementHistoryEntry[] | ((prev: PlacementHistoryEntry[]) => PlacementHistoryEntry[])) => void;

interface UseBlankTilePlacementParams {
    board: BoardState;
    setBoard: SetBoard;
    rack: RackState;
    setRack: SetRack;
    setPlacementHistory: SetPlacementHistory;
}

interface BlankTilePopupState {
    show: boolean;
    blankTile: TileData | null;
    targetPosition: Position | null;
    sourceRackIndex: number | null;
}

export function useBlankTilePlacement({ board, setBoard, rack, setRack, setPlacementHistory }: UseBlankTilePlacementParams) {
    const [blankTilePopup, setBlankTilePopup] = useState<BlankTilePopupState | null>(null);

    const openBlankTilePopup = (params: { blankTile: TileData; targetPosition: Position; sourceRackIndex: number }) => {
        setBlankTilePopup({
            show: true,
            blankTile: params.blankTile,
            targetPosition: params.targetPosition,
            sourceRackIndex: params.sourceRackIndex,
        });
    };

    const handleLetterSelection = (letter: string) => {
        if (!blankTilePopup) return;

        const { blankTile, targetPosition, sourceRackIndex } = blankTilePopup;
        if (!blankTile || !targetPosition || sourceRackIndex === null) return;

        const transformedTile: TileData = {
            ...blankTile,
            value: letter.toUpperCase(),
            originalValue: '*',
            displayValue: letter.toUpperCase(),
        };

        const targetCell = board[targetPosition.row][targetPosition.col];
        if (!targetCell.canPlace) {
            setBlankTilePopup(null);
            return;
        }

        // Update rack with transformed tile temporarily
        const tempRack = [...rack];
        tempRack[sourceRackIndex] = transformedTile;
        
        // Use TileOperations to place the transformed blank tile
        const result = TileOperations.placeTileOnBoardFromRack(
            tempRack,
            sourceRackIndex,
            board,
            targetPosition,
            true // track history
        );
        
        if (result && result.placementHistoryEntry) {
            setRack(result.rack);
            setBoard(result.board);
            setPlacementHistory(prev => [...prev, result.placementHistoryEntry!]);
        }

        setBlankTilePopup(null);
    };

    const handlePopupCancel = () => {
        setBlankTilePopup(null);
    };

    return {
        blankTilePopup,
        openBlankTilePopup,
        handleLetterSelection,
        handlePopupCancel,
    };
}

export type UseBlankTilePlacementReturn = ReturnType<typeof useBlankTilePlacement>;


