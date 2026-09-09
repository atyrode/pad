"use client";

import React from 'react';
import RackCell from './RackCell';
import type { RackState, Position, TileData } from '../game/generated';

interface RackProps {
    rack: RackState;
    boardCellSize: number;
    overBoardPos: Position | null;
    overRackIndex: number | null;
    boardRef?: React.RefObject<HTMLDivElement | null>;
    rackRef?: React.RefObject<HTMLDivElement | null>;
    gameAreaRef?: React.RefObject<HTMLDivElement | null>;
    selectedCell?: Position | null;
    onRackRightClick?: (tile: TileData, rackIndex: number) => boolean;
    redrawTileIds?: readonly string[];
    onToggleRedraw?: (tileId: string) => void;
}

export default function Rack({ rack, boardCellSize, overBoardPos, overRackIndex, boardRef, rackRef, gameAreaRef, selectedCell, onRackRightClick, redrawTileIds, onToggleRedraw }: RackProps) {
    const internalRackRef = React.useRef<HTMLDivElement>(null);
    const actualRackRef = rackRef || internalRackRef;

    return (
        <div 
            ref={actualRackRef}
            className="flex gap-1 p-1 bg-zinc-700 border border-zinc-600 rounded-lg justify-center"
        >
            {rack.map((tile, index) => (
                <RackCell
                    key={`rack-${index}`}
                    tile={tile}
                    index={index}
                    boardCellSize={boardCellSize}
                    overBoardPos={overBoardPos}
                    overRackIndex={overRackIndex}
                    boardRef={boardRef}
                    rackRef={actualRackRef}
                    gameAreaRef={gameAreaRef}
                    selectedCell={selectedCell}
                    onRackRightClick={onRackRightClick}
                    isRedrawSelected={!!tile && !!redrawTileIds?.includes(tile.id)}
                    onToggleRedraw={onToggleRedraw}
                />
            ))}
        </div>
    );
}

