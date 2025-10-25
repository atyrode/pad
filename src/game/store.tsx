"use client";
import React, { createContext, useContext, useReducer } from "react";
import { BOARD_CONSTANTS } from "../constants/board";
import { RACK_CONSTANTS } from "../constants/rack";

export type TileModel = {
  id: string;
  letter?: string;
  score?: number;
};

export type BoardCell = {
  index: number;
  tile?: TileModel | null;
};

export type GameState = {
  boardWidth: number;
  boardHeight: number;
  board: BoardCell[];
  rack: (TileModel | null)[];
};

type Action =
  | { type: "INIT"; payload?: Partial<GameState> }
  | { type: "RESET" }
  | { type: "SET_BOARD_DIMS"; width: number; height: number }
  | { type: "DRAW_TILES"; quantity: number };


function makeBoard(
  width: number,
  height: number,
  oldBoard?: BoardCell[]
): BoardCell[] {
  const len = width * height;
  const newBoard: BoardCell[] = new Array(len).fill(null).map((_, i) => {
    const old = oldBoard && i < oldBoard.length ? oldBoard[i] : undefined;
    return { index: i, tile: old ? old.tile : null };
  });
  return newBoard;
}

const initialState: GameState = {
  boardWidth: BOARD_CONSTANTS.DEFAULT_WIDTH,
  boardHeight: BOARD_CONSTANTS.DEFAULT_HEIGHT,
  board: makeBoard(BOARD_CONSTANTS.DEFAULT_WIDTH, BOARD_CONSTANTS.DEFAULT_HEIGHT),
  rack: [],
};

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "INIT":
      return {
        ...state,
        ...action.payload,
      };
    case "SET_BOARD_DIMS": {
      const { width, height } = action;
      const board = makeBoard(width, height, state.board);
      return { ...state, boardWidth: width, boardHeight: height, board };
    }
    case "DRAW_TILES": {
      const quantity = Math.max(1, Math.min(10, action.quantity));
      const newTiles: TileModel[] = Array.from({ length: quantity }, () => ({
        id: crypto.randomUUID(),
        letter: 'A',
        score: 1
      }));
      return { ...state, rack: [...state.rack, ...newTiles] };
    }
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

const GameContext = createContext<
  { state: GameState; dispatch: React.Dispatch<Action> } | undefined
>(undefined);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <GameContext.Provider value={{ state, dispatch }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used inside GameProvider");
  return ctx;
}