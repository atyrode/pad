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
import { parseEmptySlotId } from '../utils/boardUtils';
import { parseRackSlotId, isRackSlotId, findTileInRack, swapRackTiles } from '../utils/rackUtils';
import * as TileOperations from '../engine/TileOperations';

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
        const boardPos = TileOperations.findTilePosition(board, overId);
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
        const activeBoardPos = TileOperations.findTilePosition(board, activeId);
        const activeRackIndex = findTileInRack(rack, activeId);

        // Determine if over target is board or rack
        const overBoardPos = TileOperations.findTilePosition(board, overId);
        const overRackIndex = parseRackSlotId(overId);
        const overRackTileIndex = findTileInRack(rack, overId);

        // Case 1: Board → Board (existing functionality)
        if (activeBoardPos && (overBoardPos || parseEmptySlotId(overId))) {
            const targetPos = overBoardPos || parseEmptySlotId(overId);
            if (targetPos) {
                const result = TileOperations.moveTileBetweenBoardPositions(
                    board,
                    activeBoardPos,
                    targetPos
                );
                if (result) {
                    setBoard(result.board);
                }
            }
        }
        // Case 2: Board → Rack
        else if (activeBoardPos && overRackIndex !== null) {
            const result = TileOperations.removeTileFromBoardToRack(
                board,
                activeBoardPos,
                rack,
                overRackIndex
            );
            if (result) {
                setBoard(result.board);
                setRack(result.rack);
            }
        }
        // Case 3: Rack → Board
        else if (activeRackIndex !== null && (overBoardPos || parseEmptySlotId(overId))) {
            const targetPos = overBoardPos || parseEmptySlotId(overId);
            if (targetPos) {
                const result = TileOperations.placeTileOnBoardFromRack(
                    rack,
                    activeRackIndex,
                    board,
                    targetPos,
                    true // track history
                );
                if (result) {
                    setBoard(result.board);
                    setRack(result.rack);
                    
                    // Track the placement in history
                    if (onTilePlaced && result.placementHistoryEntry) {
                        onTilePlaced(
                            result.placementHistoryEntry.tileId,
                            result.placementHistoryEntry.position,
                            result.placementHistoryEntry.wasBlank ?? false
                        );
                    }
                }
            }
        }
        // Case 4: Rack → Rack (reordering)
        else if (activeRackIndex !== null && (overRackIndex !== null || overRackTileIndex !== null)) {
            const targetIndex = overRackIndex !== null ? overRackIndex : overRackTileIndex;
            if (targetIndex !== null && targetIndex !== activeRackIndex) {
                const newRack = swapRackTiles(rack, activeRackIndex, targetIndex);
                setRack(newRack);
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

