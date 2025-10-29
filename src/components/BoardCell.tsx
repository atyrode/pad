import React, { useRef, useState } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import Tile from './Tile';
import StickerOverlay from './Sticker';
import { BoardCellProps } from '../types/board';
import { useCellSize } from '../hooks/useCellSize';
import { getGridConstrainedTransform, getTileTransformOverRack } from '../utils/transformUtils';
import { MIN_CELL_SIZE } from '../constants/board';

// Add shake animation keyframes
const shakeKeyframes = `
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
  20%, 40%, 60%, 80% { transform: translateX(2px); }
}
`;

export default function BoardCell({ tile, locked, row, col, overRackIndex, rackRef, gameAreaRef, onRightClick, sticker }: BoardCellProps) {
    const cellRef = useRef<HTMLDivElement>(null);
    const cellSize = useCellSize(cellRef as React.RefObject<HTMLDivElement | null>);
    const [isShaking, setIsShaking] = useState(false);
    
    const { attributes, listeners, setNodeRef: setDraggableRef, transform } = useDraggable({
        id: tile ? tile.id : `empty-${row}-${col}`,
        disabled: !tile || locked, // Only unlocked tiles can be dragged, not empty slots
    });

    const { setNodeRef: setDroppableRef } = useDroppable({
        id: tile ? tile.id : `empty-${row}-${col}`,
    });

    const setNodeRef = (node: HTMLElement | null) => {
        setDraggableRef(node);
        setDroppableRef(node);
        cellRef.current = node as HTMLDivElement | null;
    };

    const handleRightClick = (e: React.MouseEvent) => {
        e.preventDefault(); // Prevent default context menu
        if (tile && !locked && onRightClick) {
            const success = onRightClick(tile, { row, col });
            if (!success) {
                // Trigger shake animation if rack is full
                setIsShaking(true);
                setTimeout(() => setIsShaking(false), 500); // Animation duration
            }
        }
    };

    // Prioritize rack snapping when dragging over a rack cell
    // Otherwise, use board grid snapping (existing behavior)
    let tileStyle;
    if (transform && overRackIndex !== null) {
        // Use rack snapping when hovering over a rack cell
        tileStyle = getTileTransformOverRack(transform, overRackIndex, cellRef, rackRef, null, gameAreaRef);
    } else {
        // Fall back to board grid snapping
        tileStyle = getGridConstrainedTransform(transform, row, col, cellSize, cellRef, gameAreaRef);
    }


    return (
        <>
            <style>{shakeKeyframes}</style>
            <div
                id="board-cell"
                ref={setNodeRef}
                className={`aspect-square border border-zinc-100/70 rounded-sm flex items-center justify-center relative ${tile && !locked
                        ? 'cursor-grab active:cursor-grabbing select-none'
                        : ''
                    }`}
                style={{ 
                    userSelect: 'none',
                    minWidth: `${MIN_CELL_SIZE}px`,
                    minHeight: `${MIN_CELL_SIZE}px`,
                    animation: isShaking ? 'shake 0.5s ease-in-out' : undefined
                }}
                onContextMenu={handleRightClick}
                {...(tile && !locked ? listeners : {})}
                {...(tile && !locked ? attributes : {})}
            >
                {/* Sticker layer - positioned absolutely to not interfere with drag/drop */}
                <StickerOverlay sticker={sticker || null} />
                
                {tile && (
                    <div 
                        className="w-full h-full rounded-sm relative z-10"
                        style={{
                            ...tileStyle,
                            // Ensure tile is visible during drag by maintaining opacity
                            opacity: transform ? 1 : 1,
                            // Add a subtle shadow when dragging to show it's being moved
                            boxShadow: transform ? '0px 0px 25px rgba(0, 0, 0, 0.49)' : 'none',
                            zIndex: transform ? 10 : 'auto',
                            transition: transform ? 'none' : 'all 0.1s linear'
                        }}
                    >
                        <Tile value={tile.value} score={tile.score} locked={locked} />
                    </div>
                )}
            </div>
        </>
    );
}
