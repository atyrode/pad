import React, { useRef } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import Tile from './Tile';
import { BoardCellProps } from '../types/board';
import { useCellSize } from '../hooks/useCellSize';
import { getGridConstrainedTransform } from '../utils/transformUtils';

export default function BoardCell({ tile, row, col }: BoardCellProps) {
    const cellRef = useRef<HTMLDivElement>(null);
    const cellSize = useCellSize(cellRef as React.RefObject<HTMLDivElement | null>);
    
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

    const tileStyle = getGridConstrainedTransform(transform, row, col, cellSize);

    return (
        <div
            id="board-cell"
            ref={setNodeRef}
            className={`aspect-square border border-zinc-100/70 rounded-sm flex items-center justify-center min-w-[40px] min-h-[40px] ${tile
                    ? 'cursor-grab active:cursor-grabbing select-none'
                    : ''
                }`}
            style={{ userSelect: 'none' }}
            {...(tile ? listeners : {})}
            {...(tile ? attributes : {})}
        >
            {tile && (
                <div 
                    className="w-full h-full bg-white rounded-sm" 
                    style={{
                        ...tileStyle,
                        // Ensure tile is visible during drag by maintaining opacity
                        opacity: transform ? 1 : 1,
                        // Add a subtle shadow when dragging to show it's being moved
                        boxShadow: transform ? '0px 0px 25px rgba(0, 0, 0, 0.49)' : 'none',
                        zIndex: transform ? 10 : 'auto',
                        transition: 'all 0.1s linear'
                    }}
                >
                    <Tile value={tile.value} score={tile.score} />
                </div>
            )}
        </div>
    );
}
