"use client";

import React, { useState, useRef, useEffect } from 'react';
import {
    DndContext,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
    PointerSensor,
    useSensor,
    useSensors,
    closestCenter,
    useDraggable,
    useDroppable,
} from '@dnd-kit/core';
import Tile from './Tile';

interface TileData {
    id: string;
    value: string;
    score: number;
}

type BoardState = (TileData | null)[][];

interface BoardCellProps {
    tile: TileData | null;
    row: number;
    col: number;
}

function BoardCell({ tile, row, col }: BoardCellProps) {
    const cellRef = useRef<HTMLDivElement>(null);
    const [cellSize, setCellSize] = useState(44); // Default fallback
    
    const { attributes, listeners, setNodeRef: setDraggableRef, transform } = useDraggable({
        id: tile ? tile.id : `empty-${row}-${col}`,
        disabled: !tile, // Only tiles can be dragged, not empty slots
    });

    const { setNodeRef: setDroppableRef } = useDroppable({
        id: tile ? tile.id : `empty-${row}-${col}`,
    });

    const setNodeRef = (node: HTMLElement | null) => {
        setDraggableRef(node);
        setDroppableRef(node);
        cellRef.current = node as HTMLDivElement | null;
    };

    // Measure actual cell size on mount and resize
    useEffect(() => {
        const measureCellSize = () => {
            if (cellRef.current) {
                // offsetWidth gives us the cell width, but we need cell + gap for snapping
                const cellWidth = cellRef.current.offsetWidth;
                const gap = 4; // gap-1 = 4px from CSS
                setCellSize(cellWidth + gap);
            }
        };

        measureCellSize();
        
        // Re-measure on window resize
        window.addEventListener('resize', measureCellSize);
        return () => window.removeEventListener('resize', measureCellSize);
    }, []);

    // Calculate grid-constrained transform
    const getGridConstrainedTransform = () => {
        if (!transform) return undefined;
        
        // Use dynamically measured cell size
        const totalCellSize = cellSize;
        
        // Calculate which grid cell the cursor is closest to relative to current position
        const targetCol = Math.round(transform.x / totalCellSize);
        const targetRow = Math.round(transform.y / totalCellSize);
        
        // Constrain to valid grid positions relative to current cell
        const constrainedCol = Math.max(-col, Math.min(10 - col, targetCol));
        const constrainedRow = Math.max(-row, Math.min(10 - row, targetRow));
        
        // Calculate the snapped position relative to original position
        const snappedX = constrainedCol * totalCellSize;
        const snappedY = constrainedRow * totalCellSize;
        
        return {
            transform: `translate3d(${snappedX}px, ${snappedY}px, 0)`,
        };
    };

    const tileStyle = getGridConstrainedTransform();

    return (
        <div
            id="board-cell"
            ref={setNodeRef}
            className={`aspect-square border rounded-sm flex items-center justify-center min-w-[40px] min-h-[40px] ${tile
                    ? 'cursor-grab active:cursor-grabbing select-none'
                    : ''
                }`}
            style={{ userSelect: 'none' }}
            {...(tile ? listeners : {})}
            {...(tile ? attributes : {})}
        >
            {tile && (
                <div className="w-full h-full bg-white" style={tileStyle}>
                    <Tile value={tile.value} score={tile.score} />
                </div>
            )}
        </div>
    );
}

export default function Board() {
    // Initialize 11x11 board with some sample tiles
    const [board, setBoard] = useState<BoardState>(() => {
        const initialBoard: BoardState = Array(11).fill(null).map(() => Array(11).fill(null));

        // Add some sample tiles for testing
        initialBoard[5][5] = { id: 'tile-1', value: 'A', score: 1 };
        initialBoard[5][6] = { id: 'tile-2', value: 'B', score: 3 };
        initialBoard[6][5] = { id: 'tile-3', value: 'C', score: 3 };
        initialBoard[6][6] = { id: 'tile-4', value: 'D', score: 2 };
        initialBoard[4][5] = { id: 'tile-5', value: 'E', score: 1 };

        return initialBoard;
    });

    const [activeId, setActiveId] = useState<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
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
        let activePos: { row: number; col: number } | null = null;
        let overPos: { row: number; col: number } | null = null;

        for (let row = 0; row < 11; row++) {
            for (let col = 0; col < 11; col++) {
                if (board[row][col]?.id === activeId) {
                    activePos = { row, col };
                }
                if (board[row][col]?.id === overId) {
                    overPos = { row, col };
                }
            }
        }

        // If dragging to an empty slot, find the empty slot position
        if (!overPos && overId.startsWith('empty-')) {
            const [, rowStr, colStr] = overId.split('-');
            overPos = { row: parseInt(rowStr), col: parseInt(colStr) };
        }

        if (activePos && overPos) {
            setBoard((prevBoard) => {
                const newBoard = prevBoard.map(row => [...row]);

                // Swap tiles
                const activeTile = newBoard[activePos.row][activePos.col];
                const overTile = newBoard[overPos.row][overPos.col];

                newBoard[activePos.row][activePos.col] = overTile;
                newBoard[overPos.row][overPos.col] = activeTile;

                return newBoard;
            });
        }

        setActiveId(null);
    };

    const getActiveTile = (): TileData | null => {
        if (!activeId) return null;

        for (let row = 0; row < 11; row++) {
            for (let col = 0; col < 11; col++) {
                if (board[row][col]?.id === activeId) {
                    return board[row][col];
                }
            }
        }
        return null;
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="grow max-w-4/5 grid grid-cols-11 gap-1 p-1 bg-green-800 border border-10 border-green-900 rounded-lg">
                {board.map((row, rowIndex) =>
                    row.map((tile, colIndex) => (
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
