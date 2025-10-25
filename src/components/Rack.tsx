"use client";
import { useGame } from "../game/store";
import RackCell from "./RackCell";
import { getGapCSS } from "../constants/board";
import { useCellSize } from "../contexts/CellSizeContext";
import { getRackPaddingCSS } from "../constants/rack";

export default function Rack() {
  const { state } = useGame();
  const { cellSize } = useCellSize();

  const gridStyle: React.CSSProperties = {
    gridTemplateColumns: `repeat(${state.rack.length}, ${cellSize}px)`,
    gap: getGapCSS(),
    transition: 'grid-template-columns 0.3s ease-in-out, gap 0.3s ease-in-out',
  };

  return (
    <div 
      className="w-full mt-2 overflow-x-auto flex-none bg-green-900"
      style={{ padding: getRackPaddingCSS() }}
    >
      <div 
        className="grid transition-opacity duration-300 opacity-100 bg-green-700"
        style={gridStyle}
      >
        {state.rack.map((tile, i) => (
          <RackCell key={i} tile={tile} cellSize={cellSize} />
        ))}
      </div>
    </div>
  );
}