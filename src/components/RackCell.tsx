import React from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import Tile from './Tile';
import { RackCellProps } from '../types/board';
import { getRackTileTransformOverBoard } from '../utils/transformUtils';

export default function RackCell({ tile, index, boardCellSize, overBoardPos }: RackCellProps) {
    const { attributes, listeners, setNodeRef: setDraggableRef, transform } = useDraggable({
        id: tile ? tile.id : `rack-${index}`,
        disabled: !tile, // Only tiles can be dragged, not empty slots
    });

    const { setNodeRef: setDroppableRef } = useDroppable({
        id: tile ? tile.id : `rack-${index}`,
    });

    const setNodeRef = (node: HTMLElement | null) => {
        setDraggableRef(node);
        setDroppableRef(node);
    };

    // Calculate transform with grid snapping when over board
    const tileStyle = getRackTileTransformOverBoard(transform, boardCellSize, overBoardPos);

    return (
        <div
            id="rack-cell"
            ref={setNodeRef}
            className={`aspect-square border border-zinc-100/70 rounded-sm flex items-center justify-center min-w-[40px] min-h-[40px] bg-zinc-700 ${tile
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
                        opacity: transform ? 1 : 1,
                        boxShadow: transform ? '0px 0px 25px rgba(0, 0, 0, 0.49)' : 'none',
                        zIndex: transform ? 10 : 'auto',
                        transition: transform ? 'none' : 'all 0.1s linear'
                    }}
                >
                    <Tile value={tile.value} score={tile.score} />
                </div>
            )}
        </div>
    );
}

