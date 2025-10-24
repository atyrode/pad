"use client";

import { useGame } from "../game/store";
import Cell from "./Cell";

export default function Board() {
  const { state } = useGame();

  const gridStyle: React.CSSProperties = {
    gridTemplateColumns: `repeat(${state.boardWidth}, minmax(0, 1fr))`,
    gridTemplateRows: `repeat(${state.boardHeight}, 1fr)`,
  };

  return (
    <div id="board" className="grid gap-1 sm:gap-2 p-2 w-full h-full" style={gridStyle}>
      {state.board.map((cell) => (
        <Cell key={cell.index} cell={cell} />
      ))}
    </div>
  );
}