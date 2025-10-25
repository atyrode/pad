"use client";

import { useGame } from "../game/store";
import Cell from "./Cell";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { BOARD_CONSTANTS, getGapCSS, getPaddingCSS, getMarginCSS, calculateOptimalCellSize } from "../constants/board";
import { LAYOUT_CONSTANTS } from "../constants/layout";

export default function Board() {
  const { state } = useGame();
  const boardRef = useRef<HTMLDivElement>(null);
  
  const [cellSize, setCellSize] = useState<number>(BOARD_CONSTANTS.DEFAULT_CELL_SIZE);

  // Calculate correct size before browser paint to prevent flash
  useLayoutEffect(() => {
    const gameArea = document.getElementById('gameArea');
    if (!gameArea) return;

    const containerRect = gameArea.getBoundingClientRect();
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
      const gameArea = document.getElementById('gameArea');
      if (!gameArea) return;

      const containerRect = gameArea.getBoundingClientRect();
      const newCellSize = calculateOptimalCellSize(
        containerRect.width,
        containerRect.height,
        state.boardWidth,
        state.boardHeight
      );

      setCellSize(newCellSize);
    };
    
    const resizeObserver = new ResizeObserver(calculateCellSize);
    const gameArea = document.getElementById('gameArea');
    if (gameArea) {
      resizeObserver.observe(gameArea);
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
    <div id="board" className="bg-blue-900 flex items-center justify-center overflow-hidden">
        <div 
          ref={boardRef}
          id="boardGrid" 
          className="grid bg-blue-500" 
          style={gridStyle}
        >
        {state.board.map((cell) => (
            <Cell key={cell.index} cell={cell} />
        ))}
        </div>
    </div>
  );
}