"use client";

import { useGame } from "../game/store";
import Cell from "./Cell";
import { useEffect, useRef, useState } from "react";

export default function Board() {
  const { state } = useGame();
  const boardRef = useRef<HTMLDivElement>(null);
  const [cellSize, setCellSize] = useState(60); // Default cell size

  useEffect(() => {
    const calculateCellSize = () => {
      if (!boardRef.current) return;
      
      const container = boardRef.current.parentElement;
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const padding = 32; // Account for board padding (16px) and margins (16px)
      const gap = 8; // Account for grid gaps
      
      const availableWidth = containerRect.width - padding;
      const availableHeight = containerRect.height - padding;
      
      // Calculate maximum cell size that fits both dimensions
      const maxCellWidth = (availableWidth - (gap * (state.boardWidth - 1))) / state.boardWidth;
      const maxCellHeight = (availableHeight - (gap * (state.boardHeight - 1))) / state.boardHeight;
      
      // Use the smaller dimension to ensure board always fits
      const newCellSize = Math.floor(Math.min(maxCellWidth, maxCellHeight));
      
      // Set a reasonable minimum and maximum
      setCellSize(Math.max(Math.min(newCellSize, 120), 20)); // Min 20px, Max 120px
    };

    calculateCellSize();
    
    const resizeObserver = new ResizeObserver(calculateCellSize);
    if (boardRef.current?.parentElement) {
      resizeObserver.observe(boardRef.current.parentElement);
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
    gap: '8px',
  };

  return (
    <div id="board" className="bg-blue-900 w-full h-full flex items-center justify-center overflow-hidden">
        <div 
          ref={boardRef}
          id="boardGrid" 
          className="grid p-2 m-2 bg-blue-500" 
          style={gridStyle}
        >
        {state.board.map((cell) => (
            <Cell key={cell.index} cell={cell} />
        ))}
        </div>
    </div>
  );
}