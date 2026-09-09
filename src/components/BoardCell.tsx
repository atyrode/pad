import React, { useRef, useState } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { ArrowBigRightDash, ArrowBigDownDash } from 'lucide-react';
import Tile from './Tile';
import StickerOverlay from './Sticker';
import type { Direction } from '../types/board';
import type { Position, TileData, Sticker } from '../game/generated';
import { useDragGeometry } from '../hooks/useCellSize';
import { getGridConstrainedTransform, getCellSnappedTransform } from '../utils/transformUtils';
import { MIN_CELL_SIZE } from '../constants/board';

interface BoardCellProps {
    tile: TileData | null;
    canTake: boolean;
    row: number;
    col: number;
    cellSize: number;
    overRackIndex: number | null;
    rackRef?: React.RefObject<HTMLDivElement | null>;
    gameAreaRef?: React.RefObject<HTMLDivElement | null>;
    onRightClick?: (tile: TileData, position: Position) => boolean;
    sticker?: Sticker | null;
    tileOpacity?: number;
    hideTile?: boolean;
    showCoordinates?: boolean;
    isSelected?: boolean;
    selectorDirection?: Direction | null;
}

export default function BoardCell({ tile, canTake, row, col, cellSize, overRackIndex, rackRef, gameAreaRef, onRightClick, sticker, tileOpacity, hideTile, showCoordinates, isSelected, selectorDirection }: BoardCellProps) {
    const cellRef = useRef<HTMLDivElement>(null);
    const geometry = useDragGeometry(tile?.id ?? `empty-${row}-${col}`, cellRef, undefined, rackRef, gameAreaRef);
    const [isShaking, setIsShaking] = useState(false);
    
    const { attributes, listeners, setNodeRef: setDraggableRef, transform } = useDraggable({
        id: tile ? tile.id : `empty-${row}-${col}`,
        disabled: !tile || !canTake, // Only tiles that can be taken are draggable
        attributes: { tabIndex: -1 },
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
        if (tile && canTake && onRightClick) {
            const success = onRightClick(tile, { row, col });
            if (!success) {
                // Trigger shake animation if rack is full
                setIsShaking(true);
            }
        }
    };

    const tileStyle = overRackIndex !== null
        ? getCellSnappedTransform(transform, geometry, geometry?.rack[overRackIndex])
        : getGridConstrainedTransform(transform, row, col, cellSize, geometry);

    return (
            <div
                data-board-cell=""
                data-row={row}
                data-col={col}
                data-tile-id={tile?.id}
                ref={setNodeRef}
                className={`aspect-square border border-zinc-100/70 rounded-sm flex items-center justify-center relative ${tile && canTake
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
                onAnimationEnd={() => setIsShaking(false)}
                {...(tile && canTake ? listeners : {})}
                {...(tile && canTake ? attributes : {})}
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
                            visibility: hideTile && !transform ? 'hidden' : undefined,
                            // Apply tile opacity (default to 100% if not provided)
                            opacity: transform ? 1 : (tileOpacity !== undefined ? tileOpacity / 100 : 1),
                            // Add a subtle shadow when dragging to show it's being moved
                            boxShadow: transform ? '0px 0px 25px rgba(0, 0, 0, 0.49)' : 'none',
                            zIndex: transform ? 10 : 'auto',
                            transition: transform || hideTile ? 'none' : 'transform 0.1s linear, opacity 0.1s linear, box-shadow 0.1s linear'
                        }}
                    >
                        <Tile value={tile.value} score={tile.score} locked={!canTake} originalValue={tile.originalValue} displayValue={tile.displayValue} />
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
    );
}
