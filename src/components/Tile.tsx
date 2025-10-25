"use client";
import type { BoardCell } from "../game/store";
import { getTileDisplay, isBlankTile } from "../game/mechanics/tile";

export default function TileView({
  cell,
}: {
  cell: BoardCell;
}) {
  const tile = cell.tile;
  if (!tile) return null;
  
  const displayLetter = getTileDisplay(tile);
  const isBlank = isBlankTile(tile);
  
  return (
    <div className="flex flex-col items-center pointer-events-none">
      <div className={`font-medium ${isBlank ? 'text-gray-500 italic' : ''}`}>
        {displayLetter}
      </div>
      <div className="text-[0.6rem] opacity-60">
        {tile.score}
      </div>
      {tile.effect && (
        <div className="text-[0.5rem] opacity-40">
          {tile.effect}
        </div>
      )}
    </div>
  );
}