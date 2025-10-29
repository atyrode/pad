"use client";

import { useState } from 'react';
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
    // Initialize board with sample tiles
    const [board, setBoard] = useState<BoardState>(createInitialBoard);

    // Initialize rack
    const [rack, setRack] = useState<RackState>(createInitialRack);

    const [boardCellSize, setBoardCellSize] = useState(44);

    const {
        sensors,
        handleDragStart,
        handleDragOver,
        handleDragEnd,
        overBoardPos,
        activeId,
    } = useDragAndDrop({ board, setBoard, rack, setRack });

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
            <div id="main" className="h-screen w-screen bg-zinc-500 flex">
                <DebugMenu />
                <div id="game-area" className="grow bg-zinc-500 flex flex-col items-center justify-center gap-4">
                    <Board 
                        board={board}
                        boardCellSize={boardCellSize}
                        overBoardPos={overBoardPos}
                        onCellSizeChange={setBoardCellSize}
                    />
                    <Rack 
                        rack={rack} 
                        setRack={setRack}
                        boardCellSize={boardCellSize}
                        overBoardPos={activeId && findTileInRack(rack, activeId) !== null ? overBoardPos : null}
                    />
                </div>
            </div>
        </DndContext>
    );
}
