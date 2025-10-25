"use client";
import type { BoardCell } from "../game/store";
import { getTileDisplay, isBlankTile } from "../game/mechanics/tile";
import { TILE_STYLING } from "../constants/tiles";

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
    <div id="tile" className={`relative w-full h-full flex items-center justify-center pointer-events-none bg-white/90 dark:bg-zinc-300 border border-zinc-200 dark:border-zinc-700 ${TILE_STYLING.BORDER_RADIUS}`}>
      <div id="tile-letter" className={`text-4xl font-bold ${isBlank ? 'text-gray-500 italic' : 'text-black'}`}>
        {displayLetter}
      </div>
      <div id="tile-score" className="absolute bottom-1 right-1 text-[0.6rem] font-medium text-gray-600">
        {tile.score}
      </div>
    </div>
  );
}