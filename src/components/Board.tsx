"use client";

import { useGame } from "../game/store";
import Cell from "./Cell";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { BOARD_CONSTANTS, getGapCSS, getPaddingCSS, getMarginCSS, calculateOptimalCellSize } from "../constants/board";

export default function Board() {
  const { state } = useGame();
  const boardRef = useRef<HTMLDivElement>(null);
  
  const [cellSize, setCellSize] = useState<number>(BOARD_CONSTANTS.DEFAULT_CELL_SIZE);

  // Calculate correct size before browser paint to prevent flash
  useLayoutEffect(() => {
    if (!boardRef.current) return;

    const containerRect = boardRef.current.getBoundingClientRect();
    const newCellSize = calculateOptimalCellSize(
      containerRect.width,
      containerRect.height,
      state.boardWidth,
      state.boardHeight
    );

    setCellSize(newCellSize);
  }, [state.boardWidth, state.boardHeight]);

  // Set up resize observers for dynamic updates
  useEffect(() => {
    const calculateCellSize = () => {
      if (!boardRef.current) return;

      const containerRect = boardRef.current.getBoundingClientRect();
      const newCellSize = calculateOptimalCellSize(
        containerRect.width,
        containerRect.height,
        state.boardWidth,
        state.boardHeight
      );

      setCellSize(newCellSize);
    };
    
    const resizeObserver = new ResizeObserver(calculateCellSize);
    if (boardRef.current) {
      resizeObserver.observe(boardRef.current);
    }
    
    window.addEventListener('resize', calculateCellSize);
    
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', calculateCellSize);
    };
  }, [state.boardWidth, state.boardHeight]);

  const gridStyle: React.CSSProperties = {
    gridTemplateColumns: `repeat(${state.boardWidth}, ${cellSize}px)`,
    gridTemplateRows: `repeat(${state.boardHeight}, ${cellSize}px)`,
    gap: getGapCSS(),
    padding: getPaddingCSS(),
    margin: getMarginCSS(),
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
          className="grid bg-blue-500 border-10" 
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