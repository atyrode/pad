"use client";

import React from 'react';
import RackCell from './RackCell';
import { RackState } from '../types/rack';
import { Position } from '../types/board';
import { TileData } from '../types/tile';

interface RackProps {
    rack: RackState;
    setRack: React.Dispatch<React.SetStateAction<RackState>>;
    boardCellSize: number;
    overBoardPos: Position | null;
    overRackIndex: number | null;
    boardRef?: React.RefObject<HTMLDivElement | null>;
    rackRef?: React.RefObject<HTMLDivElement | null>;
    gameAreaRef?: React.RefObject<HTMLDivElement | null>;
    selectedCell?: Position | null;
    onRackRightClick?: (tile: TileData, rackIndex: number) => boolean;
}

export default function Rack({ rack, setRack, boardCellSize, overBoardPos, overRackIndex, boardRef, rackRef, gameAreaRef, selectedCell, onRackRightClick }: RackProps) {
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
                />
            ))}
        </div>
    );
}

