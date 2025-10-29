"use client";

import { useState, useRef, useEffect } from 'react';
import {
    DndContext,
    closestCenter,
} from '@dnd-kit/core';
import DebugMenu from "../src/components/DebugMenu";
import Board from "../src/components/Board";
import Rack from "../src/components/Rack";
import { BoardState, RackState } from '../src/types/board';
import { createInitialBoard } from '../src/utils/boardUtils';
import { createInitialRack, findTileInRack } from '../src/utils/rackUtils';
import { useDragAndDrop } from '../src/hooks/useDragAndDrop';

export default function Home() {
    // Track client-side mount to prevent hydration mismatch
    const [mounted, setMounted] = useState(false);

    // Initialize board with sample tiles
    const [board, setBoard] = useState<BoardState>(createInitialBoard);

    // Initialize rack
    const [rack, setRack] = useState<RackState>(createInitialRack);

    const [boardCellSize, setBoardCellSize] = useState(44);
    const boardRef = useRef<HTMLDivElement>(null);
    const gameAreaRef = useRef<HTMLDivElement>(null);

    const {
        sensors,
        handleDragStart,
        handleDragOver,
        handleDragEnd,
        overBoardPos,
        activeId,
    } = useDragAndDrop({ board, setBoard, rack, setRack, gameAreaRef });

    // Set mounted to true after client-side hydration
    useEffect(() => {
        setMounted(true);
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
                    <DebugMenu />
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
                            boardRef={boardRef}
                            gameAreaRef={gameAreaRef}
                        />
                        <Rack 
                            rack={rack} 
                            setRack={setRack}
                            boardCellSize={boardCellSize}
                            overBoardPos={activeId && findTileInRack(rack, activeId) !== null ? overBoardPos : null}
                            boardRef={boardRef}
                            gameAreaRef={gameAreaRef}
                        />
                    </div>
                </DndContext>
            ) : (
                <>
                    <DebugMenu />
                    <div id="game-area" className="grow bg-zinc-500 flex flex-col items-center justify-center gap-4" />
                </>
            )}
        </div>
    );
}
