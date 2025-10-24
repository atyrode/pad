"use client";
import type { BoardCell } from "../game/store";

export default function TileView({
  cell,
  onClick,
}: {
  cell: BoardCell;
  onClick?: (index: number) => void;
}) {
  const tile = cell.tile;
  return (
    <div
      tabIndex={-1}
      onPointerDown={(e) => e.preventDefault()}
      onFocus={(e) => (e.currentTarget as HTMLElement).blur()}
      onDragStart={(e) => e.preventDefault()}
      role="button"
      onClick={() => onClick?.(cell.index)}
      className="select-none caret-transparent bg-white/90 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-sm flex items-center justify-center text-xs sm:text-sm outline-none"
      style={{
        width: "var(--tile)",
        height: "var(--tile)",
      }}
    >
      {tile ? (
        <div className="flex flex-col items-center">
          <div className="font-medium">{tile.letter}</div>
          <div className="text-[0.6rem] opacity-60">{tile.score}</div>
        </div>
      ) : null}
    </div>
  );
}