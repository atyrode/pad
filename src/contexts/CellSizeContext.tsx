"use client";
import React, { createContext, useContext, useState } from "react";

type CellSizeContextType = {
  cellSize: number;
  setCellSize: (size: number) => void;
  boardGridWidth: number;
  setBoardGridWidth: (width: number) => void;
};

const CellSizeContext = createContext<CellSizeContextType | undefined>(undefined);

export function CellSizeProvider({ children }: { children: React.ReactNode }) {
  const [cellSize, setCellSize] = useState<number>(60); // Default fallback size
  const [boardGridWidth, setBoardGridWidth] = useState<number>(0);

  return (
    <CellSizeContext.Provider value={{ cellSize, setCellSize, boardGridWidth, setBoardGridWidth }}>
      {children}
    </CellSizeContext.Provider>
  );
}

export function useCellSize() {
  const context = useContext(CellSizeContext);
  if (!context) {
    throw new Error("useCellSize must be used within a CellSizeProvider");
  }
  return context;
}
