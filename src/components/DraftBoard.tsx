"use client";

import React, { useEffect, useRef } from 'react';
import BoardCell from './BoardCell';
import { BoardState, BoardCellState, Position, Direction } from '../types/board';
import { TileData } from '../types/tile';
import { DraftSlotState } from '../types/draft';
import { BOARD_SIZE, CELL_GAP, BOARD_WIDTH, BOARD_MAX_WIDTH } from '../constants/board';
import DraftSlot from './DraftSlot';
import { createDraftSlotPositions } from '../utils/draftBoardUtils';

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
    draftSlots: DraftSlotState;
    suggestedTiles: TileData[];
    selectedSlotIndex?: number | null;
}

export default function DraftBoard({ board, boardCellSize, overBoardPos, onCellSizeChange, overRackIndex, boardRef: externalBoardRef, rackRef, gameAreaRef, onRightClick, tileOpacity, showCoordinates, selectedCell, selectorDirection, draftSlots, suggestedTiles, selectedSlotIndex }: DraftBoardProps) {
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

    // Get draft slot positions
    const draftSlotPositions = createDraftSlotPositions();
    
    // Create a modified board that includes suggested tiles and draft slots
    const createDisplayBoard = (): BoardState => {
        const displayBoard = board.map(row => [...row]);
        
        // Add suggested tiles at positions (4,2), (4,5), (4,8)
        const suggestedPositions = [
            { row: 4, col: 2 },
            { row: 4, col: 5 },
            { row: 4, col: 8 }
        ];
        
        suggestedTiles.forEach((tile, index) => {
            if (tile && index < suggestedPositions.length) {
                const pos = suggestedPositions[index];
                displayBoard[pos.row][pos.col] = {
                    tile,
                    locked: false
                };
            }
        });
        
        return displayBoard;
    };

    const displayBoard = createDisplayBoard();

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
            {displayBoard.map((row: BoardCellState[], rowIndex: number) =>
                row.map((cell: BoardCellState, colIndex: number) => {
                    // Check if this position is a draft slot
                    const draftSlotIndex = draftSlotPositions.findIndex(pos => pos.row === rowIndex && pos.col === colIndex);
                    const isDraftSlot = draftSlotIndex !== -1;
                    const draftSlotTile = isDraftSlot ? draftSlots[draftSlotIndex] : null;
                    const isSlotSelected = selectedSlotIndex === draftSlotIndex;
                    
                    return (
                        <div key={`${rowIndex}-${colIndex}`} className="relative">
                            <BoardCell
                                tile={cell.tile}
                                locked={cell.locked}
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
                            {/* Render draft slot overlay if this is a draft slot position */}
                            {isDraftSlot && (
                                <DraftSlot
                                    slotIndex={draftSlotIndex}
                                    tile={draftSlotTile}
                                    isSelected={isSlotSelected}
                                />
                            )}
                        </div>
                    );
                })
            )}
        </div>
    );
}
