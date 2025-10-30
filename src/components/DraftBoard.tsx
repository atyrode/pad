"use client";

import React, { useEffect, useRef } from 'react';
import BoardCell from './BoardCell';
import { BoardState, BoardCellState, Position, Direction } from '../types/board';
import { TileData } from '../types/tile';
import { BOARD_SIZE, CELL_GAP, BOARD_WIDTH, BOARD_MAX_WIDTH } from '../constants/board';

interface DraftBoardProps {
    board: BoardState;
    boardCellSize: number;
    overBoardPos: Position | null;
    onCellSizeChange: (size: number) => void;
    overRackIndex: number | null;
    boardRef?: React.RefObject<HTMLDivElement | null>;
    rackRef?: React.RefObject<HTMLDivElement | null>;
    gameAreaRef?: React.RefObject<HTMLDivElement | null>;
    onRightClick?: (tile: TileData, position: Position) => boolean;
    tileOpacity?: number;
    showCoordinates?: boolean;
    selectedCell?: Position | null;
    selectorDirection?: Direction | null;
}

export default function DraftBoard({ board, boardCellSize, overBoardPos, onCellSizeChange, overRackIndex, boardRef: externalBoardRef, rackRef, gameAreaRef, onRightClick, tileOpacity, showCoordinates, selectedCell, selectorDirection }: DraftBoardProps) {
    const internalBoardRef = useRef<HTMLDivElement>(null);
    const boardRef = externalBoardRef || internalBoardRef;

    // Measure board cell size and notify parent
    useEffect(() => {
        const measureCellSize = () => {
            if (boardRef.current) {
                const cell = boardRef.current.querySelector('[id="board-cell"]') as HTMLElement;
                if (cell) {
                    const cellWidth = cell.offsetWidth;
                    onCellSizeChange(cellWidth + CELL_GAP);
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
            className="grid gap-1 p-1 bg-blue-800 border border-10 border-blue-900 rounded-lg aspect-square"
            style={{
                width: `${BOARD_WIDTH}px`,
                maxWidth: BOARD_MAX_WIDTH,
                gridTemplateColumns: `repeat(${BOARD_SIZE}, minmax(0, 1fr))`
            }}
        >
            {board.map((row: BoardCellState[], rowIndex: number) =>
                row.map((cell: BoardCellState, colIndex: number) => (
                    <BoardCell
                        key={`${rowIndex}-${colIndex}`}
                        tile={cell.tile}
                        canPlace={cell.canPlace}
                        canTake={cell.canTake}
                        row={rowIndex}
                        col={colIndex}
                        overRackIndex={overRackIndex}
                        rackRef={rackRef}
                        gameAreaRef={gameAreaRef}
                        onRightClick={onRightClick}
                        sticker={null}
                        tileOpacity={tileOpacity}
                        showCoordinates={showCoordinates}
                        isSelected={selectedCell?.row === rowIndex && selectedCell?.col === colIndex}
                        selectorDirection={selectorDirection}
                    />
                ))
            )}
        </div>
    );
}
