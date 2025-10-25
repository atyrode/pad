"use client";
import type { BoardCell } from "../game/store";
import TileView from "./Tile";

export default function BoardCell({
    cell,
}: {
  cell: BoardCell;
}) {
  return (
    <div
      tabIndex={-1}
      onPointerDown={(e) => e.preventDefault()}
      onFocus={(e) => (e.currentTarget as HTMLElement).blur()}
      onDragStart={(e) => e.preventDefault()}
      className="select-none caret-transparent bg-white/90 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-sm outline-none aspect-square flex items-center justify-center"
    >
      {cell.tile ? <TileView cell={cell} /> : null}
    </div>
  );
}