import { useState, useEffect, useRef } from "react";
import { BOARD_CONSTANTS, calculateOptimalCellSize } from "../constants/board";

export function useBoardInitialization(
  boardWidth: number,
  boardHeight: number
) {
  const [cellSize, setCellSize] = useState<number>(BOARD_CONSTANTS.DEFAULT_CELL_SIZE);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const boardRef = useRef<HTMLDivElement>(null);

  const calculateCellSize = () => {
    if (!boardRef.current) return;

    const containerRect = boardRef.current.getBoundingClientRect();
    const newCellSize = calculateOptimalCellSize(
      containerRect.width,
      containerRect.height,
      boardWidth,
      boardHeight
    );

    setCellSize(newCellSize);
  };

  // Calculate correct size before browser paint to prevent flash
  useEffect(() => {
    if (!boardRef.current) return;

    // Use requestAnimationFrame to ensure layout has stabilized
    requestAnimationFrame(() => {
      if (!boardRef.current) return;

      calculateCellSize();
      setIsInitialized(true);
    });
  }, [boardWidth, boardHeight]);

  // Set up resize observers for dynamic updates
  useEffect(() => {
    const resizeObserver = new ResizeObserver(calculateCellSize);
    if (boardRef.current) {
      resizeObserver.observe(boardRef.current);
    }
    
    window.addEventListener('resize', calculateCellSize);
    
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', calculateCellSize);
    };
  }, [boardWidth, boardHeight]);

  return {
    boardRef,
    cellSize,
    isInitialized,
  };
}
