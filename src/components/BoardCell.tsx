import React, { useRef, useState } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { ArrowBigRightDash, ArrowBigDownDash } from 'lucide-react';
import Tile from './Tile';
import StickerOverlay from './Sticker';
import { BoardCellProps, Direction } from '../types/board';
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

export default function BoardCell({ tile, locked, row, col, overRackIndex, rackRef, gameAreaRef, onRightClick, sticker, tileOpacity, showCoordinates, isSelected, selectorDirection }: BoardCellProps) {
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
                
                {/* Keyboard selector overlay */}
                {isSelected && (
                    <div 
                        className="absolute inset-0 pointer-events-none"
                        style={{ zIndex: 5 }}
                    >
                        {/* Highlighted border */}
                        <div 
                            className="absolute inset-0 border-4 border-black rounded-sm"
                            style={{ 
                                boxShadow: '0 0 8px rgba(0, 0, 0, 0.6)',
                            }}
                        />
                        
                        {/* Directional arrow */}
                        {selectorDirection && (
                            <div 
                                className="absolute inset-0 flex items-center justify-center"
                                style={{ 
                                    color: 'rgb(0, 0, 0)',
                                    filter: 'drop-shadow(0 0 4px rgba(0, 0, 0, 0.8))',
                                }}
                            >
                                {selectorDirection === 'right' && <ArrowBigRightDash size={32} />}
                                {selectorDirection === 'down' && <ArrowBigDownDash size={32} />}
                            </div>
                        )}
                    </div>
                )}
                
                {tile && (
                    <div 
                        className="w-full h-full rounded-sm relative z-10"
                        style={{
                            ...tileStyle,
                            // Apply tile opacity (default to 100% if not provided)
                            opacity: transform ? 1 : (tileOpacity !== undefined ? tileOpacity / 100 : 1),
                            // Add a subtle shadow when dragging to show it's being moved
                            boxShadow: transform ? '0px 0px 25px rgba(0, 0, 0, 0.49)' : 'none',
                            zIndex: transform ? 10 : 'auto',
                            transition: transform ? 'none' : 'all 0.1s linear'
                        }}
                    >
                        <Tile value={tile.value} score={tile.score} locked={locked} />
                    </div>
                )}

                {/* Coordinate display - positioned below stickers */}
                {showCoordinates && (
                    <div 
                        className="absolute inset-0 flex items-center justify-center pointer-events-none bg-white"
                        style={{ zIndex: 1 }}
                    >
                        <span className="text-zinc-900 text-xs font-mono">
                            ({row},{col})
                        </span>
                    </div>
                )}
            </div>
        </>
    );
}
