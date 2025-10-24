"use client";
import React, { createContext, useContext, useReducer } from "react";

export type TileModel = {
  id: string;
  letter?: string;
  score?: number;
  modifiers?: string[]; // effect ids
};

export type BoardCell = {
  index: number;
  tile?: TileModel | null;
  modifiers?: string[]; // per-cell modifiers (double-word etc or roguelike effects)
};

export type GameState = {
  boardWidth: number;
  boardHeight: number;
  board: BoardCell[];
  rack: (TileModel | null)[];
};

type Action =
  | { type: "INIT"; payload?: Partial<GameState> }
  | { type: "SET_BOARD_TILE"; index: number; tile: TileModel | null }
  | { type: "SET_RACK_TILE"; slot: number; tile: TileModel | null }
  | { type: "RESET" }
  | { type: "SET_BOARD_DIMS"; width: number; height: number }
  | { type: "SET_RACK_SIZE"; size: number };

const DEFAULT_WIDTH = 11;
const DEFAULT_HEIGHT = 11;
const DEFAULT_RACK = 7;

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
  boardWidth: DEFAULT_WIDTH,
  boardHeight: DEFAULT_HEIGHT,
  board: makeBoard(DEFAULT_WIDTH, DEFAULT_HEIGHT),
  rack: Array.from({ length: DEFAULT_RACK }).map(() => null),
};

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "INIT":
      return {
        ...state,
        ...action.payload,
      };
    case "SET_BOARD_TILE": {
      const board = state.board.slice();
      if (action.index >= 0 && action.index < board.length) {
        board[action.index] = { ...board[action.index], tile: action.tile };
      }
      return { ...state, board };
    }
    case "SET_RACK_TILE": {
      const rack = state.rack.slice();
      if (action.slot >= 0 && action.slot < rack.length) {
        rack[action.slot] = action.tile;
      }
      return { ...state, rack };
    }
    case "SET_BOARD_DIMS": {
      const { width, height } = action;
      const board = makeBoard(width, height, state.board);
      return { ...state, boardWidth: width, boardHeight: height, board };
    }
    case "SET_RACK_SIZE": {
      const size = Math.max(0, action.size | 0);
      const old = state.rack;
      const rack = Array.from({ length: size }).map((_, i) =>
        i < old.length ? old[i] : null
      );
      return { ...state, rack };
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