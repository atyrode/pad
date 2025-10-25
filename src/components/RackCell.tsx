"use client";
import type { TileModel } from "../game/store";
import TileView from "./Tile";

export default function RackCell({
  tile,
  cellSize,
}: {
  tile: TileModel | null;
  cellSize: number;
}) {
  const cellStyle: React.CSSProperties = {
    width: `${cellSize}px`,
    height: `${cellSize}px`,
  };

  return (
    <div
      id="rack-cell"
      className="select-none caret-transparent flex items-center justify-center text-xs sm:text-sm outline-none"
      style={cellStyle}
    >
      {tile ? (
        <TileView cell={{ index: 0, tile }} />
      ) : (
        <div className="text-zinc-400">+</div>
      )}
    </div>
  );
}
