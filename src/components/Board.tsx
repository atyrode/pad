"use client";

import React, { useState, useEffect } from 'react';
import {
    DndContext,
    DragEndEvent,
    DragStartEvent,
    PointerSensor,
    useSensor,
    useSensors,
    closestCenter,
} from '@dnd-kit/core';
import BoardCell from './BoardCell';
import { BoardState, TileData } from '../types/board';
import { BOARD_SIZE, DRAG_ACTIVATION_DISTANCE } from '../constants/board';
import { findTilePosition, parseEmptySlotId, swapBoardTiles, createInitialBoard } from '../utils/boardUtils';


export default function Board() {
    const [isClient, setIsClient] = useState(false);

    // Initialize board with sample tiles
    const [board, setBoard] = useState<BoardState>(createInitialBoard);

    // Ensure we're on the client side before rendering drag and drop
    useEffect(() => {
        setIsClient(true);
    }, []);

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
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (!over) {
            setActiveId(null);
            return;
        }

        const activeId = active.id as string;
        const overId = over.id as string;

        // Find positions of active and over tiles
        const activePos = findTilePosition(board, activeId);
        let overPos = findTilePosition(board, overId);

        // If dragging to an empty slot, parse the empty slot position
        if (!overPos) {
            overPos = parseEmptySlotId(overId);
        }

        if (activePos && overPos) {
            setBoard((prevBoard: BoardState) => swapBoardTiles(prevBoard, activePos, overPos));
        }

        setActiveId(null);
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
            onDragEnd={handleDragEnd}
        >
            <div className="grow max-w-4/5 grid grid-cols-11 gap-1 p-1 bg-green-800 border border-10 border-green-900 rounded-lg">
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

        </DndContext>
    );
}
