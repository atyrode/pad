import React, { useRef } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import Tile from './Tile';
import type { TileData, Position } from '../game/generated';
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
    isRedrawSelected?: boolean;
    onToggleRedraw?: (tileId: string) => void;
}

export default function RackCell({ tile, index, boardCellSize, overBoardPos, overRackIndex, boardRef, rackRef, gameAreaRef, selectedCell, onRackRightClick, isRedrawSelected = false, onToggleRedraw }: RackCellProps) {
    const isSelectingRedraw = onToggleRedraw !== undefined;
    const rackCellRef = useRef<HTMLDivElement>(null);
    const geometry = useDragGeometry(tile?.id ?? `rack-${index}`, rackCellRef, boardRef, rackRef, gameAreaRef);
    const { attributes, listeners, setNodeRef: setDraggableRef, transform } = useDraggable({
        id: tile ? tile.id : `rack-${index}`,
        disabled: !tile || isSelectingRedraw,
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
        if (!isSelectingRedraw && tile && selectedCell && onRackRightClick) {
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
            className={`relative aspect-square border border-zinc-100/70 rounded-sm flex items-center justify-center bg-zinc-700 ${tile && !isSelectingRedraw
                    ? 'cursor-grab active:cursor-grabbing select-none'
                    : ''
                }`}
            style={{ 
                userSelect: 'none',
                width: `${cellSize}px`,
                height: `${cellSize}px`
            }}
            onContextMenu={handleRightClick}
            {...(tile && !isSelectingRedraw ? listeners : {})}
            {...(tile && !isSelectingRedraw ? attributes : {})}
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
            {tile && onToggleRedraw && (
                <button
                    type="button"
                    data-redraw-toggle=""
                    aria-pressed={isRedrawSelected}
                    aria-label={`Rack slot ${index + 1}: ${tile.value === '*' || tile.originalValue === '*'
                        ? 'Blank, zero points'
                        : `${tile.displayValue || tile.value}, ${tile.score} ${tile.score === 1 ? 'point' : 'points'}`}. Select for redraw`}
                    onClick={() => onToggleRedraw(tile.id)}
                    className={`absolute inset-0 z-10 cursor-pointer rounded-sm ring-inset focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${isRedrawSelected
                        ? 'bg-zinc-900/15 ring-2 ring-zinc-800'
                        : 'hover:bg-zinc-900/5'}`}
                >
                    <span
                        aria-hidden="true"
                        className={`absolute top-0.5 left-0.5 rounded-sm px-0.5 text-[10px] leading-none ${isRedrawSelected
                            ? 'bg-zinc-800 text-white'
                            : 'bg-zinc-100 text-zinc-600'}`}
                    >
                        {index + 1}
                    </span>
                </button>
            )}
        </div>
    );
}

