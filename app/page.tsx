"use client";

import Board from "../src/components/Board";
import { GameProvider } from "../src/game/store";
import Debug from "../src/components/Debug";
import Rack from "../src/components/Rack";
import { CellSizeProvider } from "../src/contexts/CellSizeContext";

export default function Home() {
  return (
    <div id="main" className="h-screen w-screen flex items-center justify-center bg-zinc-50 dark:bg-black">
        <div id="game-area" className="w-[95%] h-[95%] flex items-center justify-center bg-red-800">
            <GameProvider>
                <CellSizeProvider>
                    <div id="board-and-rack" className="flex flex-col items-center justify-center gap-2 w-full h-full min-w-0 flex-shrink">
                      <Board />
                      <Rack />
                    </div>
                    <Debug />
                </CellSizeProvider>
            </GameProvider>
        </div>
    </div>
  );
}
