"use client";

import React, { useRef } from 'react';
import BoardCell from './BoardCell';
import type { BoardState, Position, Direction } from '../types/board';
import type { TileData } from '../types/tile';
import type { Sticker, StickerState } from '../types/sticker';
import { BOARD_SIZE, BOARD_WIDTH, BOARD_MAX_WIDTH } from '../constants/board';
import { useCellSize } from '../hooks/useCellSize';

interface BoardProps {
    board: BoardState;
    variant?: 'game' | 'draft';
    onCellSizeChange: (size: number) => void;
    overRackIndex: number | null;
    boardRef?: React.RefObject<HTMLDivElement | null>;
    rackRef?: React.RefObject<HTMLDivElement | null>;
    gameAreaRef?: React.RefObject<HTMLDivElement | null>;
    onRightClick?: (tile: TileData, position: Position) => boolean;
    stickers?: StickerState;
    tileOpacity?: number;
    showCoordinates?: boolean;
    selectedCell?: Position | null;
    selectorDirection?: Direction | null;
}

const draftStar: Sticker = { type: 'start', value: 0, consumed: false };
const shakeKeyframes = `
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
  20%, 40%, 60%, 80% { transform: translateX(2px); }
}
`;

export default function Board({ board, variant = 'game', onCellSizeChange, overRackIndex, boardRef: externalBoardRef, rackRef, gameAreaRef, onRightClick, stickers, tileOpacity, showCoordinates, selectedCell, selectorDirection }: BoardProps) {
    const internalBoardRef = useRef<HTMLDivElement>(null);
    const boardRef = externalBoardRef || internalBoardRef;
    const cellSize = useCellSize(boardRef, onCellSizeChange);
    const isDraft = variant === 'draft';

    return (
        <>
            <style>{shakeKeyframes}</style>
            <div
                ref={boardRef}
                data-board-variant={variant}
                className={`grid gap-1 p-1 border border-10 rounded-lg aspect-square ${isDraft ? 'bg-blue-800 border-blue-900' : 'bg-green-800 border-green-900'}`}
                style={{
                    width: `${BOARD_WIDTH}px`,
                    maxWidth: BOARD_MAX_WIDTH,
                    gridTemplateColumns: `repeat(${BOARD_SIZE}, minmax(0, 1fr))`
                }}
            >
                {board.map((row, rowIndex) =>
                    row.map((cell, colIndex) => {
                        const isDraftOffer = rowIndex === 4 && (colIndex === 2 || colIndex === 5 || colIndex === 8);
                        const isDraftPlacement = (rowIndex === 7 || rowIndex === 8) && colIndex >= 2 && colIndex <= 8;
                        const sticker = isDraft
                            ? (isDraftOffer || isDraftPlacement ? draftStar : null)
                            : stickers?.[rowIndex]?.[colIndex] ?? null;
                        return (
                            <BoardCell
                                key={`${rowIndex}-${colIndex}`}
                                tile={cell.tile}
                                canTake={cell.canTake}
                                row={rowIndex}
                                col={colIndex}
                                cellSize={cellSize}
                                overRackIndex={overRackIndex}
                                rackRef={rackRef}
                                gameAreaRef={gameAreaRef}
                                onRightClick={onRightClick}
                                sticker={sticker}
                                tileOpacity={tileOpacity}
                                showCoordinates={showCoordinates}
                                isSelected={selectedCell?.row === rowIndex && selectedCell?.col === colIndex}
                                selectorDirection={selectorDirection}
                            />
                        );
                    })
                )}
            </div>
        </>
    );
}
