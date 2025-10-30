import { useState } from 'react';
import {
    DragEndEvent,
    DragStartEvent,
    DragOverEvent,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import { BoardState, Position } from '../types/board';
import { RackState } from '../types/rack';
import { DRAG_ACTIVATION_DISTANCE } from '../constants/board';
import { findTilePosition, parseEmptySlotId, swapBoardTiles, removeTileFromBoard, placeTileOnBoard } from '../utils/boardUtils';
import { findTileInRack, parseRackSlotId, moveTileToRack, removeTileFromRack, swapRackTiles, isRackSlotId } from '../utils/rackUtils';

interface UseDragAndDropProps {
    board: BoardState;
    setBoard: React.Dispatch<React.SetStateAction<BoardState>>;
    rack: RackState;
    setRack: React.Dispatch<React.SetStateAction<RackState>>;
    gameAreaRef?: React.RefObject<HTMLDivElement | null>;
    onTilePlaced?: (tileId: string, position: Position, wasBlank: boolean) => void;
}

export function useDragAndDrop({ board, setBoard, rack, setRack, gameAreaRef, onTilePlaced }: UseDragAndDropProps) {
    // Track what's being dragged over
    const [overBoardPos, setOverBoardPos] = useState<Position | null>(null);
    const [overRackIndex, setOverRackIndex] = useState<number | null>(null);
    const [activeId, setActiveId] = useState<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: DRAG_ACTIVATION_DISTANCE,
            },
        })
    );

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
        setOverBoardPos(null);
        setOverRackIndex(null);
    };

    const handleDragOver = (event: DragOverEvent) => {
        const { over } = event;
        if (!over) {
            setOverBoardPos(null);
            setOverRackIndex(null);
            return;
        }

        const overId = over.id as string;
        
        // Check if we're over a rack cell or rack tile
        const rackIndex = parseRackSlotId(overId);
        const rackTileIndex = findTileInRack(rack, overId);
        
        if (rackIndex !== null || rackTileIndex !== null) {
            // We're over a rack cell
            setOverBoardPos(null);
            setOverRackIndex(rackIndex !== null ? rackIndex : rackTileIndex);
            return;
        }
        
        // Check if we're over a board cell or empty board slot
        const boardPos = findTilePosition(board, overId);
        const emptyPos = parseEmptySlotId(overId);
        
        if (boardPos || emptyPos) {
            setOverBoardPos(boardPos || emptyPos);
            setOverRackIndex(null);
        } else {
            setOverBoardPos(null);
            setOverRackIndex(null);
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (!over) {
            setActiveId(null);
            setOverBoardPos(null);
            setOverRackIndex(null);
            return;
        }

        const activeId = active.id as string;
        const overId = over.id as string;

        // Determine if active tile is from board or rack
        const activeBoardPos = findTilePosition(board, activeId);
        const activeRackIndex = findTileInRack(rack, activeId);

        // Determine if over target is board or rack
        const overBoardPos = findTilePosition(board, overId);
        const overRackIndex = parseRackSlotId(overId);
        const overRackTileIndex = findTileInRack(rack, overId);

        // Case 1: Board → Board (existing functionality)
        if (activeBoardPos && (overBoardPos || parseEmptySlotId(overId))) {
            const targetPos = overBoardPos || parseEmptySlotId(overId);
            if (targetPos) {
                // Check if source tile is locked
                const sourceTile = board[activeBoardPos.row][activeBoardPos.col];
                const targetCell = board[targetPos.row][targetPos.col];
                // Only allow swap if source is unlocked AND target is either empty or unlocked
                if (sourceTile && !sourceTile.locked && (!targetCell.tile || !targetCell.locked)) {
                    setBoard((prevBoard: BoardState) => swapBoardTiles(prevBoard, activeBoardPos, targetPos));
                }
            }
        }
        // Case 2: Board → Rack
        else if (activeBoardPos && overRackIndex !== null) {
            const cell = board[activeBoardPos.row][activeBoardPos.col];
            if (cell && cell.tile && !cell.locked) {
                setBoard((prevBoard: BoardState) => removeTileFromBoard(prevBoard, activeBoardPos));
                setRack((prevRack: RackState) => moveTileToRack(prevRack, cell.tile!, overRackIndex));
            }
        }
        // Case 3: Rack → Board
        else if (activeRackIndex !== null && (overBoardPos || parseEmptySlotId(overId))) {
            const tile = rack[activeRackIndex];
            const targetPos = overBoardPos || parseEmptySlotId(overId);
            if (tile && targetPos) {
                const targetCell = board[targetPos.row][targetPos.col];
                // Only allow placement if target is empty or has an unlocked tile
                if (!targetCell.tile || !targetCell.locked) {
                    setRack((prevRack: RackState) => {
                        const newRack = removeTileFromRack(prevRack, activeRackIndex);
                        // If there's an existing unlocked tile on board, swap it to rack
                        if (targetCell.tile && !targetCell.locked) {
                            return moveTileToRack(newRack, targetCell.tile, activeRackIndex);
                        }
                        return newRack;
                    });
                    setBoard((prevBoard: BoardState) => placeTileOnBoard(prevBoard, tile, targetPos));
                    
                    // Track the placement in history
                    if (onTilePlaced) {
                        const wasBlank = tile.originalValue === "*";
                        onTilePlaced(tile.id, targetPos, wasBlank);
                    }
                }
            }
        }
        // Case 4: Rack → Rack (reordering)
        else if (activeRackIndex !== null && (overRackIndex !== null || overRackTileIndex !== null)) {
            const targetIndex = overRackIndex !== null ? overRackIndex : overRackTileIndex;
            if (targetIndex !== null && targetIndex !== activeRackIndex) {
                setRack((prevRack: RackState) => swapRackTiles(prevRack, activeRackIndex, targetIndex));
            }
        }

        setActiveId(null);
        setOverBoardPos(null);
        setOverRackIndex(null);
    };

    return {
        sensors,
        handleDragStart,
        handleDragOver,
        handleDragEnd,
        overBoardPos,
        overRackIndex,
        activeId,
        gameAreaRef,
    };
}

