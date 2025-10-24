"use client";

import { useGame } from "../game/store";
import Cell from "./Cell";

export default function Board() {
  const { state } = useGame();

  const gridStyle: React.CSSProperties = {
    gridTemplateColumns: `repeat(${state.boardWidth}, minmax(0, 1fr))`,
    // make rows stretch evenly to fill the container
    gridTemplateRows: `repeat(${state.boardHeight}, 1fr)`,
    width: "100%",
    height: "100%",
    minHeight: 0, // allows flex parents with constrained height to size correctly
  };

  return (
    // ensure the board itself stretches to fill the parent
    <div id="board" className="grid gap-1 sm:gap-2 p-2 w-full h-full" style={gridStyle}>
      {state.board.map((cell) => (
        <Cell key={cell.index} cell={cell} />
      ))}
    </div>
  );
}