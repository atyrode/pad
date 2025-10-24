"use client";

import Board from "../src/components/Board";
import Debug from "../src/components/Debug";
import Rack from "../src/components/Rack";
import { GameProvider, useGame } from "../src/game/store";

export default function Home() {
  return (
    <div className="h-screen flex items-center justify-center bg-zinc-50 dark:bg-black">
      <GameProvider>
        <InnerApp />
      </GameProvider>
    </div>
  );
}

function InnerApp() {
  const { state } = useGame();

  const cols = Math.max(1, Math.min(50, Math.floor(state.boardWidth)));
  const rows = Math.max(1, Math.min(50, Math.floor(state.boardHeight)));

  const style = {
    // game area is constrained to 90% of viewport width and height
    ["--game-w" as any]: "90vw",
    ["--game-h" as any]: "90vh",
    // expose cols/rows to CSS so --tile can use var(--cols) / var(--rows)
    ["--cols" as any]: String(cols),
    ["--rows" as any]: String(rows),
    // tile size is the max size that fits in both axes of the game area
    ["--tile" as any]:
      "min(calc(var(--game-w) / var(--cols)), calc(var(--game-h) / var(--rows)))",
    // explicitly constrain the wrapper element so it never exceeds the viewport
    width: "90vw",
    height: "90vh",
  } as React.CSSProperties;

  return (
    // this wrapper is the "game area" — everything inside should size against --tile
    <div className="flex flex-col items-center" style={style}>
      <div className="flex gap-4">
        {/* Board and Debug side-by-side */}
        <Board />
        <Debug />
      </div>
      <Rack />
    </div>
  );
}
