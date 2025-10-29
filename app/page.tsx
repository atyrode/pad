"use client";

import { useState, useRef, useEffect } from 'react';
import {
    DndContext,
    closestCenter,
} from '@dnd-kit/core';
import DebugMenu from "../src/components/DebugMenu";
import Board from "../src/components/Board";
import Rack from "../src/components/Rack";
import { BoardState } from '../src/types/board';
import { RackState } from '../src/types/rack';
import { Bag } from '../src/types/bag';
import { createInitialBoard, removeTileFromBoard } from '../src/utils/boardUtils';
import { createInitialRack, findTileInRack, findFirstEmptySlot, moveTileToRack, shuffleRack } from '../src/utils/rackUtils';
import { createTileBag } from '../src/utils/bagUtils';
import { useDragAndDrop } from '../src/hooks/useDragAndDrop';
import { TileData } from '../src/types/tile';
import { Position } from '../src/types/board';
import { Shuffle, Play } from 'lucide-react';

export default function Home() {
    // Track client-side mount to prevent hydration mismatch
    const [mounted, setMounted] = useState(false);

    // Initialize board with sample tiles
    const [board, setBoard] = useState<BoardState>(createInitialBoard);

    // Initialize rack
    const [rack, setRack] = useState<RackState>(createInitialRack);

    // Initialize tile bag as empty array initially
    const [bag, setBag] = useState<Bag>([]);

    const [boardCellSize, setBoardCellSize] = useState(44);
    const boardRef = useRef<HTMLDivElement>(null);
    const rackRef = useRef<HTMLDivElement>(null);
    const gameAreaRef = useRef<HTMLDivElement>(null);

    const {
        sensors,
        handleDragStart,
        handleDragOver,
        handleDragEnd,
        overBoardPos,
        overRackIndex,
        activeId,
    } = useDragAndDrop({ board, setBoard, rack, setRack, gameAreaRef });

    const handleRightClick = (tile: TileData, position: Position): boolean => {
        // Find first empty slot in rack
        const emptySlotIndex = findFirstEmptySlot(rack);
        
        if (emptySlotIndex !== null) {
            // Remove tile from board and add to rack
            setBoard((prevBoard: BoardState) => removeTileFromBoard(prevBoard, position));
            setRack((prevRack: RackState) => moveTileToRack(prevRack, tile, emptySlotIndex));
            return true; // Success
        }
        
        return false; // Rack is full
    };

    const handleShuffle = () => {
        setRack((prevRack: RackState) => shuffleRack(prevRack));
    };

    const handlePlay = () => {
        setBoard((prevBoard: BoardState) => 
            prevBoard.map(row => 
                row.map(cell => 
                    cell.tile && !cell.locked 
                        ? { ...cell, locked: true } 
                        : cell
                )
            )
        );
    };

    // Set mounted to true after client-side hydration and initialize bag
    useEffect(() => {
        setMounted(true);
        // Initialize the bag only on the client side
        setBag(createTileBag());
    }, []);

    return (
        <div id="main" className="h-screen w-screen bg-zinc-500 flex">
            {mounted ? (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragEnd={handleDragEnd}
                >
                    <DebugMenu bag={bag} rack={rack} board={board} setRack={setRack} setBag={setBag} setBoard={setBoard} />
                    <div 
                        ref={gameAreaRef}
                        id="game-area" 
                        className="grow bg-zinc-500 flex flex-col items-center justify-center gap-4"
                        style={{ animation: 'fadeIn 0.3s ease-in-out' }}
                    >
                        <Board 
                            board={board}
                            boardCellSize={boardCellSize}
                            overBoardPos={overBoardPos}
                            onCellSizeChange={setBoardCellSize}
                            overRackIndex={overRackIndex}
                            boardRef={boardRef}
                            rackRef={rackRef}
                            gameAreaRef={gameAreaRef}
                            onRightClick={handleRightClick}
                        />
                        <div className="relative">
                            <Rack 
                                rack={rack} 
                                setRack={setRack}
                                boardCellSize={boardCellSize}
                                overBoardPos={activeId && findTileInRack(rack, activeId) !== null ? overBoardPos : null}
                                overRackIndex={overRackIndex}
                                boardRef={boardRef}
                                rackRef={rackRef}
                                gameAreaRef={gameAreaRef}
                            />
                            <button 
                                onClick={handleShuffle}
                                className="absolute left-full ml-2 top-1/2 -translate-y-1/2 p-2 bg-zinc-600 hover:bg-zinc-500 border border-zinc-500 rounded-lg transition-colors duration-200 flex items-center justify-center"
                                title="Shuffle rack"
                            >
                                <Shuffle className="w-5 h-5 text-white" />
                            </button>
                            <button 
                                onClick={handlePlay}
                                className="absolute left-full ml-14 top-1/2 -translate-y-1/2 p-2 bg-green-600 hover:bg-green-500 border border-green-500 rounded-lg transition-colors duration-200 flex items-center justify-center"
                                title="Play - lock placed tiles"
                            >
                                <Play className="w-5 h-5 text-white" />
                            </button>
                        </div>
                    </div>
                </DndContext>
            ) : (
                <>
                    <DebugMenu bag={bag} rack={rack} board={board} setRack={setRack} setBag={setBag} setBoard={setBoard} />
                    <div id="game-area" className="grow bg-zinc-500 flex flex-col items-center justify-center gap-4" />
                </>
            )}
        </div>
    );
}
