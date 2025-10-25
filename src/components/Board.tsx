"use client";
import React from "react";

import { useGame } from "../game/store";
import BoardCell from "./BoardCell";
import { getGapCSS, getPaddingCSS, getMarginCSS, BOARD_CONSTANTS } from "../constants/board";
import { useBoardInitialization } from "../hooks/useBoardInitialization";
import { useCellSize } from "../contexts/CellSizeContext";

export default function Board() {
  const { state } = useGame();
  const { boardRef, cellSize } = useBoardInitialization(
    state.boardWidth,
    state.boardHeight
  );
  const { setCellSize, setBoardGridWidth } = useCellSize();

  // Update context with the calculated cell size and board grid width
  React.useEffect(() => {
    setCellSize(cellSize);
    
    // Calculate board grid width: (cellSize × boardWidth) + (gap × (boardWidth - 1)) + (border × 2)
    const gap = BOARD_CONSTANTS.GAP;
    const border = BOARD_CONSTANTS.BORDER_WIDTH;
    const padding = BOARD_CONSTANTS.BOARD_PADDING;
    const boardGridWidth = (cellSize * state.boardWidth) + (gap * (state.boardWidth - 1)) + (border * 2) + (padding * 2);
    setBoardGridWidth(boardGridWidth);
  }, [cellSize, setCellSize, setBoardGridWidth, state.boardWidth]);

  const gridStyle: React.CSSProperties = {
    gridTemplateColumns: `repeat(${state.boardWidth}, ${cellSize}px)`,
    gridTemplateRows: `repeat(${state.boardHeight}, ${cellSize}px)`,
    gap: getGapCSS(),
    padding: getPaddingCSS(),
    margin: getMarginCSS(),
    transition: 'grid-template-columns 0.3s ease-in-out, grid-template-rows 0.3s ease-in-out, gap 0.3s ease-in-out',
    border: `${BOARD_CONSTANTS.BORDER_WIDTH}px solid white`,
  };

  return (
    <div 
      ref={boardRef}
      id="board" 
      className="flex-1 min-w-0 min-h-0 w-full h-full"
    >
      <div className="w-full h-full flex items-center justify-center bg-blue-900 overflow-hidden">
        <div 
          id="board-grid"
          className="grid bg-blue-500 duration-300"
          style={gridStyle}
        >
          {state.board.map((cell) => (
              <BoardCell 
                key={cell.index} 
                cell={cell} 
                boardWidth={state.boardWidth}
                boardHeight={state.boardHeight}
              />
          ))}
        </div>
      </div>
    </div>
  );
}