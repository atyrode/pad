"use client";
import type { BoardCell } from "../game/store";

export default function TileView({
  cell,
}: {
  cell: BoardCell;
}) {
  const tile = cell.tile;
  if (!tile) return null;
  return (
    <div className="flex flex-col items-center pointer-events-none">
      <div className="font-medium">{tile.letter}</div>
      <div className="text-[0.6rem] opacity-60">{tile.score}</div>
    </div>
  );
}