"use client";

import { useGame } from "../game/store";
import Cell from "./Cell";
import { getGapCSS, getPaddingCSS, getMarginCSS } from "../constants/board";
import { useBoardInitialization } from "../hooks/useBoardInitialization";

export default function Board() {
  const { state } = useGame();
  const { boardRef, cellSize, isInitialized } = useBoardInitialization(
    state.boardWidth,
    state.boardHeight
  );

  const gridStyle: React.CSSProperties = {
    gridTemplateColumns: `repeat(${state.boardWidth}, ${cellSize}px)`,
    gridTemplateRows: `repeat(${state.boardHeight}, ${cellSize}px)`,
    gap: getGapCSS(),
    padding: getPaddingCSS(),
    margin: getMarginCSS(),
    transition: 'grid-template-columns 0.3s ease-in-out, grid-template-rows 0.3s ease-in-out, gap 0.3s ease-in-out',
  };

  return (
    <div 
      ref={boardRef}
      id="board" 
      className="flex-1 min-w-0 min-h-0 w-full h-full"
    >
      <div className="w-full h-full flex items-center justify-center bg-blue-900 overflow-hidden">
        <div 
          id="boardGrid"
          className={`grid bg-blue-500 border-10 transition-opacity duration-300 ${
            isInitialized ? 'opacity-100' : 'opacity-0'
          }`}
          style={gridStyle}
        >
          {state.board.map((cell) => (
              <Cell key={cell.index} cell={cell} />
          ))}
        </div>
      </div>
    </div>
  );
}