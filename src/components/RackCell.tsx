import React, { useRef } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import Tile from './Tile';
import type { TileData } from '../types/tile';
import type { Position } from '../types/board';
import { getCellSnappedTransform } from '../utils/transformUtils';
import { useDragGeometry } from '../hooks/useCellSize';
import { BOARD_SIZE, CELL_GAP } from '../constants/board';

interface RackCellProps {
    tile: TileData | null;
    index: number;
    boardCellSize: number;
    overBoardPos: Position | null;
    overRackIndex: number | null;
    boardRef?: React.RefObject<HTMLDivElement | null>;
    rackRef?: React.RefObject<HTMLDivElement | null>;
    gameAreaRef?: React.RefObject<HTMLDivElement | null>;
    selectedCell?: Position | null;
    onRackRightClick?: (tile: TileData, rackIndex: number) => boolean;
}

export default function RackCell({ tile, index, boardCellSize, overBoardPos, overRackIndex, boardRef, rackRef, gameAreaRef, selectedCell, onRackRightClick }: RackCellProps) {
    const rackCellRef = useRef<HTMLDivElement>(null);
    const geometry = useDragGeometry(tile?.id ?? `rack-${index}`, rackCellRef, boardRef, rackRef, gameAreaRef);
    const { attributes, listeners, setNodeRef: setDraggableRef, transform } = useDraggable({
        id: tile ? tile.id : `rack-${index}`,
        disabled: !tile, // Only tiles can be dragged, not empty slots
        attributes: { tabIndex: -1 },
    });

    const { setNodeRef: setDroppableRef } = useDroppable({
        id: tile ? tile.id : `rack-${index}`,
    });

    const setNodeRef = (node: HTMLElement | null) => {
        setDraggableRef(node);
        setDroppableRef(node);
        rackCellRef.current = node as HTMLDivElement | null;
    };

    const handleRightClick = (e: React.MouseEvent) => {
        e.preventDefault(); // Prevent default context menu
        if (tile && selectedCell && onRackRightClick) {
            onRackRightClick(tile, index);
        }
    };

    const target = overRackIndex !== null
        ? geometry?.rack[overRackIndex]
        : overBoardPos
            ? geometry?.board[overBoardPos.row * BOARD_SIZE + overBoardPos.col]
            : undefined;
    const tileStyle = getCellSnappedTransform(transform, geometry, target);

    // Match BoardCell size: boardCellSize includes gap, so subtract it to get actual cell size
    const cellSize = boardCellSize - CELL_GAP;

    return (
        <div
            data-rack-cell=""
            data-index={index}
            data-tile-id={tile?.id}
            ref={setNodeRef}
            className={`aspect-square border border-zinc-100/70 rounded-sm flex items-center justify-center bg-zinc-700 ${tile
                    ? 'cursor-grab active:cursor-grabbing select-none'
                    : ''
                }`}
            style={{ 
                userSelect: 'none',
                width: `${cellSize}px`,
                height: `${cellSize}px`
            }}
            onContextMenu={handleRightClick}
            {...(tile ? listeners : {})}
            {...(tile ? attributes : {})}
        >
            {tile && (
                <div 
                    className="w-full h-full bg-white rounded-sm" 
                    style={{
                        ...tileStyle,
                        boxShadow: transform ? '0px 0px 25px rgba(0, 0, 0, 0.49)' : 'none',
                        zIndex: transform ? 10 : 'auto',
                        transition: transform ? 'none' : 'all 0.1s linear'
                    }}
                >
                    <Tile value={tile.value} score={tile.score} originalValue={tile.originalValue} displayValue={tile.displayValue} />
                </div>
            )}
        </div>
    );
}

