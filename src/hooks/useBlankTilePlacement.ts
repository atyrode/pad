import { useState } from 'react';
import { BoardState, Position, PlacementHistoryEntry } from '../types/board';
import { RackState } from '../types/rack';
import { TileData } from '../types/tile';

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

        if (targetCell.tile && targetCell.canTake) {
            setRack((prevRack: RackState) => {
                const newRack = [...prevRack];
                newRack[sourceRackIndex] = targetCell.tile;
                return newRack;
            });
        } else {
            setRack((prevRack: RackState) => {
                const newRack = [...prevRack];
                newRack[sourceRackIndex] = null;
                return newRack;
            });
        }

        setBoard((prevBoard: BoardState) => {
            const newBoard = prevBoard.map(row => [...row]);
            newBoard[targetPosition.row][targetPosition.col] = { tile: transformedTile, canPlace: true, canTake: true };
            return newBoard;
        });

        setPlacementHistory(prev => [...prev, { tileId: transformedTile.id, position: targetPosition, wasBlank: true }]);

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


