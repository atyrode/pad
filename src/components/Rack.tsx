"use client";
import { useGame } from "../game/store";
import RackCell from "./RackCell";
import { getGapCSS } from "../constants/board";
import { useCellSize } from "../contexts/CellSizeContext";
import { getRackPaddingCSS } from "../constants/rack";

export default function Rack() {
  const { state } = useGame();
  const { cellSize, boardGridWidth } = useCellSize();

  const gridStyle: React.CSSProperties = {
    gridTemplateColumns: `repeat(${state.rack.length}, ${cellSize}px)`,
    gap: getGapCSS(),
    transition: 'grid-template-columns 0.3s ease-in-out, gap 0.3s ease-in-out',
  };

  return (
    <div 
      id="rack"
      className="mt-2 flex-none bg-green-900 flex justify-center"
      style={{ 
        padding: getRackPaddingCSS(),
        width: boardGridWidth > 0 ? `${boardGridWidth}px` : 'auto'
      }}
    >
      <div 
        id="rackGrid"
        className="grid w-full transition-opacity duration-300 opacity-100 bg-green-700 overflow-x-scroll justify-evenly"
        style={gridStyle}
      >
        {state.rack.map((tile, i) => (
          <RackCell key={i} tile={tile} cellSize={cellSize} />
        ))}
      </div>
    </div>
  );
}