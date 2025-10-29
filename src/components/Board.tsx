"use client";

import React, { useEffect, useRef } from 'react';
import BoardCell from './BoardCell';
import { BoardState, TileData, Position } from '../types/board';

interface BoardProps {
    board: BoardState;
    boardCellSize: number;
    overBoardPos: Position | null;
    onCellSizeChange: (size: number) => void;
}

export default function Board({ board, boardCellSize, overBoardPos, onCellSizeChange }: BoardProps) {
    const boardRef = useRef<HTMLDivElement>(null);

    // Measure board cell size and notify parent
    useEffect(() => {
        const measureCellSize = () => {
            if (boardRef.current) {
                const cell = boardRef.current.querySelector('[id="board-cell"]') as HTMLElement;
                if (cell) {
                    const cellWidth = cell.offsetWidth;
                    onCellSizeChange(cellWidth + 4); // gap-1 = 4px
                }
            }
        };

        measureCellSize();
        window.addEventListener('resize', measureCellSize);
        return () => window.removeEventListener('resize', measureCellSize);
    }, [onCellSizeChange]);

    return (
        <div 
            ref={boardRef}
            className="w-fit max-w-[90vh] grid grid-cols-11 gap-1 p-1 bg-green-800 border border-10 border-green-900 rounded-lg aspect-square"
        >
            {board.map((row: (TileData | null)[], rowIndex: number) =>
                row.map((tile: TileData | null, colIndex: number) => (
                    <BoardCell
                        key={`${rowIndex}-${colIndex}`}
                        tile={tile}
                        row={rowIndex}
                        col={colIndex}
                    />
                ))
            )}
        </div>
    );
}
