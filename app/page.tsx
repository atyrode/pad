"use client";

import Board from "../src/components/Board";
import { GameProvider } from "../src/game/store";

export default function Home() {
  return (
    <div id="main" className="h-screen w-screen flex items-center justify-center bg-zinc-50 dark:bg-black">
        <div id="gameArea" className="w-[95%] h-[95%] flex items-center justify-center bg-red-800">
            <GameProvider>
                <Board />
            </GameProvider>
        </div>
    </div>
  );
}
