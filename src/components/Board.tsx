"use client";

import { useGame } from "../game/store";
import TileView from "./Tile";

export default function Board() {
  const { state } = useGame();

  return (
    <div
      className="grid gap-1 sm:gap-2 p-2"
      style={{
        gridTemplateColumns: `repeat(${state.boardWidth}, var(--tile))`,
      }}
    >
      {state.board.map((cell) => (
        <TileView key={cell.index} cell={cell} />
      ))}
    </div>
  );
}