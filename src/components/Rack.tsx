"use client";

import React from 'react';
import RackCell from './RackCell';
import { RackState, BoardState, Position } from '../types/board';

interface RackProps {
    rack: RackState;
    setRack: React.Dispatch<React.SetStateAction<RackState>>;
    boardCellSize: number;
    overBoardPos: Position | null;
    boardRef?: React.RefObject<HTMLDivElement | null>;
    gameAreaRef?: React.RefObject<HTMLDivElement | null>;
}

export default function Rack({ rack, setRack, boardCellSize, overBoardPos, boardRef, gameAreaRef }: RackProps) {
    return (
        <div className="flex gap-1 p-1 bg-zinc-700 border border-zinc-600 rounded-lg justify-center">
            {rack.map((tile, index) => (
                <RackCell
                    key={`rack-${index}`}
                    tile={tile}
                    index={index}
                    boardCellSize={boardCellSize}
                    overBoardPos={overBoardPos}
                    boardRef={boardRef}
                    gameAreaRef={gameAreaRef}
                />
            ))}
        </div>
    );
}

