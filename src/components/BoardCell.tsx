"use client";
import type { BoardCell } from "../game/store";
import TileView from "./Tile";
import { TILE_STYLING } from "../constants/tiles";

export default function BoardCell({
    cell,
    boardWidth,
    boardHeight,
}: {
  cell: BoardCell;
  boardWidth: number;
  boardHeight: number;
}) {
  // Calculate if this is the center cell
  const centerX = Math.floor(boardWidth / 2);
  const centerY = Math.floor(boardHeight / 2);
  const cellX = cell.index % boardWidth;
  const cellY = Math.floor(cell.index / boardWidth);
  const isCenter = cellX === centerX && cellY === centerY;

  return (
    <div
      tabIndex={-1}
      onPointerDown={(e) => e.preventDefault()}
      onFocus={(e) => (e.currentTarget as HTMLElement).blur()}
      onDragStart={(e) => e.preventDefault()}
      className={`select-none caret-transparent outline-none aspect-square flex items-center justify-center ${TILE_STYLING.BORDER_RADIUS} ${
        isCenter 
          ? "bg-gray-300 dark:bg-gray-600" 
          : "bg-white/90 dark:bg-zinc-900"
      }`}
    >
      {cell.tile ? <TileView cell={cell} /> : null}
    </div>
  );
}