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
import { createInitialBoard } from '../src/utils/boardUtils';
import { createInitialRack, findTileInRack } from '../src/utils/rackUtils';
import { createTileBag } from '../src/utils/bagUtils';
import { useDragAndDrop } from '../src/hooks/useDragAndDrop';

export default function Home() {
    // Track client-side mount to prevent hydration mismatch
    const [mounted, setMounted] = useState(false);

    // Initialize board with sample tiles
    const [board, setBoard] = useState<BoardState>(createInitialBoard);

    // Initialize rack
    const [rack, setRack] = useState<RackState>(createInitialRack);

    // Initialize tile bag
    const [bag, setBag] = useState<Bag>(createTileBag);

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
                    <DebugMenu bag={bag} rack={rack} setRack={setRack} setBag={setBag} />
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
                        />
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
                    </div>
                </DndContext>
            ) : (
                <>
                    <DebugMenu bag={bag} rack={rack} setRack={setRack} setBag={setBag} />
                    <div id="game-area" className="grow bg-zinc-500 flex flex-col items-center justify-center gap-4" />
                </>
            )}
        </div>
    );
}
