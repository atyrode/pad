"use client";

import React, { useState } from 'react';
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
  const { attributes, listeners, setNodeRef: setDraggableRef, transform, isDragging } = useDraggable({
    id: tile ? tile.id : `empty-${row}-${col}`,
    disabled: !tile, // Only tiles can be dragged, not empty slots
  });

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: tile ? tile.id : `empty-${row}-${col}`,
  });

  const setNodeRef = (node: HTMLElement | null) => {
    setDraggableRef(node);
    setDroppableRef(node);
  };

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`aspect-square border rounded-sm flex items-center justify-center min-w-[40px] min-h-[40px] ${
        tile 
          ? 'opacity-100 cursor-grab active:cursor-grabbing' 
          : ''
      }`}
      {...(tile ? listeners : {})}
      {...(tile ? attributes : {})}
    >
      {tile && (
        <Tile value={tile.value} score={tile.score} />
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
      <div className="grow max-w-3/4 grid grid-cols-11 gap-1 p-4 bg-green-800 rounded-lg">
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
      
      <DragOverlay>
        {activeId ? (
            <Tile 
              value={getActiveTile()?.value || ''} 
              score={getActiveTile()?.score || 0} 
            />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
