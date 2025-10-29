"use client";

import React, { useState, useEffect, useRef } from 'react';
import {
    DndContext,
    DragEndEvent,
    DragStartEvent,
    DragOverEvent,
    PointerSensor,
    useSensor,
    useSensors,
    closestCenter,
} from '@dnd-kit/core';
import BoardCell from './BoardCell';
import Rack from './Rack';
import { BoardState, TileData, RackState, Position } from '../types/board';
import { BOARD_SIZE, DRAG_ACTIVATION_DISTANCE } from '../constants/board';
import { findTilePosition, parseEmptySlotId, swapBoardTiles, createInitialBoard, removeTileFromBoard, placeTileOnBoard } from '../utils/boardUtils';
import { createInitialRack, findTileInRack, parseRackSlotId, moveTileToRack, removeTileFromRack, swapRackTiles, isRackSlotId } from '../utils/rackUtils';

export default function Board() {
    const [isClient, setIsClient] = useState(false);
    const boardRef = useRef<HTMLDivElement>(null);
    const [boardCellSize, setBoardCellSize] = useState(44);

    // Initialize board with sample tiles
    const [board, setBoard] = useState<BoardState>(createInitialBoard);

    // Initialize rack
    const [rack, setRack] = useState<RackState>(createInitialRack);

    // Track what's being dragged over
    const [overBoardPos, setOverBoardPos] = useState<Position | null>(null);
    const [activeId, setActiveId] = useState<string | null>(null);

    // Ensure we're on the client side before rendering drag and drop
    useEffect(() => {
        setIsClient(true);
    }, []);

    // Measure board cell size
    useEffect(() => {
        const measureCellSize = () => {
            if (boardRef.current) {
                const cell = boardRef.current.querySelector('[id="board-cell"]') as HTMLElement;
                if (cell) {
                    const cellWidth = cell.offsetWidth;
                    setBoardCellSize(cellWidth + 4); // gap-1 = 4px
                }
            }
        };

        if (isClient) {
            measureCellSize();
            window.addEventListener('resize', measureCellSize);
            return () => window.removeEventListener('resize', measureCellSize);
        }
    }, [isClient]);

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
    };

    const handleDragOver = (event: DragOverEvent) => {
        const { over } = event;
        if (!over) {
            setOverBoardPos(null);
            return;
        }

        const overId = over.id as string;
        
        // Explicitly check if we're over a rack cell - if so, clear overBoardPos
        if (isRackSlotId(overId) || findTileInRack(rack, overId) !== null) {
            setOverBoardPos(null);
            return;
        }
        
        // Check if we're over a board cell or empty board slot
        const boardPos = findTilePosition(board, overId);
        const emptyPos = parseEmptySlotId(overId);
        
        if (boardPos || emptyPos) {
            setOverBoardPos(boardPos || emptyPos);
        } else {
            setOverBoardPos(null);
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (!over) {
            setActiveId(null);
            setOverBoardPos(null);
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
                setBoard((prevBoard: BoardState) => swapBoardTiles(prevBoard, activeBoardPos, targetPos));
            }
        }
        // Case 2: Board → Rack
        else if (activeBoardPos && overRackIndex !== null) {
            const tile = board[activeBoardPos.row][activeBoardPos.col];
            if (tile) {
                setBoard((prevBoard: BoardState) => removeTileFromBoard(prevBoard, activeBoardPos));
                setRack((prevRack: RackState) => moveTileToRack(prevRack, tile, overRackIndex));
            }
        }
        // Case 3: Rack → Board
        else if (activeRackIndex !== null && (overBoardPos || parseEmptySlotId(overId))) {
            const tile = rack[activeRackIndex];
            const targetPos = overBoardPos || parseEmptySlotId(overId);
            if (tile && targetPos) {
                const existingTile = board[targetPos.row][targetPos.col];
                setRack((prevRack: RackState) => {
                    const newRack = removeTileFromRack(prevRack, activeRackIndex);
                    // If there's an existing tile on board, swap it to rack
                    if (existingTile) {
                        return moveTileToRack(newRack, existingTile, activeRackIndex);
                    }
                    return newRack;
                });
                setBoard((prevBoard: BoardState) => placeTileOnBoard(prevBoard, tile, targetPos));
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
    };

    // Show loading state during SSR
    if (!isClient) {
        return (
            <div>Loading board...</div>
        );
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
            <div className="flex flex-col items-center gap-4">
                <div 
                    ref={boardRef}
                    className="w-fit max-w-[80vh] grid grid-cols-11 gap-1 p-1 bg-green-800 border border-10 border-green-900 rounded-lg aspect-square"
                >
                    {board.map((row: (TileData | null)[], rowIndex: number) =>
                        row.map((tile: TileData | null, colIndex: number) => (
                            <BoardCell
                                key={`${rowIndex}-${colIndex}`}
                                tile={tile}
                                row={rowIndex}
                                col={colIndex}
                            />
                        ))
                    )}
                </div>
                <Rack 
                    rack={rack} 
                    setRack={setRack}
                    boardCellSize={boardCellSize}
                    overBoardPos={activeId && findTileInRack(rack, activeId) !== null ? overBoardPos : null}
                />
            </div>
        </DndContext>
    );
}
