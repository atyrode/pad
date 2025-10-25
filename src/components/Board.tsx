"use client";

import { useGame } from "../game/store";
import Cell from "./Cell";
import { useEffect, useRef, useState } from "react";
import { BOARD_CONSTANTS, getGapCSS, getTotalPadding, getPaddingCSS, getMarginCSS } from "../constants/board";

export default function Board() {
  const { state } = useGame();
  const boardRef = useRef<HTMLDivElement>(null);
  const [cellSize, setCellSize] = useState<number>(BOARD_CONSTANTS.DEFAULT_CELL_SIZE);

  useEffect(() => {
    const calculateCellSize = () => {
      if (!boardRef.current) return;
      
      // Find the gameArea container directly
      const gameArea = document.getElementById('gameArea');
      if (!gameArea) return;

      const containerRect = gameArea.getBoundingClientRect();
      const padding = getTotalPadding();
      const gap = BOARD_CONSTANTS.GAP;
      
      const availableWidth = containerRect.width - padding;
      const availableHeight = containerRect.height - padding;
      
      // Calculate maximum cell size that fits both dimensions
      const maxCellWidth = (availableWidth - (gap * (state.boardWidth - 1))) / state.boardWidth;
      const maxCellHeight = (availableHeight - (gap * (state.boardHeight - 1))) / state.boardHeight;
      
      // Use the smaller dimension to ensure board always fits
      const newCellSize = Math.floor(Math.min(maxCellWidth, maxCellHeight));

      setCellSize(newCellSize);
    };

    calculateCellSize();
    
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
  }, [state.boardWidth, state.boardHeight, BOARD_CONSTANTS.GAP, BOARD_CONSTANTS.BOARD_PADDING, BOARD_CONSTANTS.BOARD_MARGIN]);

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