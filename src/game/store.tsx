"use client";
import React, { createContext, useContext, useReducer } from "react";
import { BOARD_CONSTANTS } from "../constants/board";
import { Tile } from "./mechanics/tile";
import { TileBag } from "./mechanics/bag";
import { createTileDistribution } from "../constants/tiles";

export type TileModel = Tile;

export type BoardCell = {
  index: number;
  tile?: TileModel | null;
};

export type GameState = {
  boardWidth: number;
  boardHeight: number;
  board: BoardCell[];
  rack: (TileModel | null)[];
  bag: TileBag;
};

type Action =
  | { type: "INIT"; payload?: Partial<GameState> }
  | { type: "RESET" }
  | { type: "SET_BOARD_DIMS"; width: number; height: number }
  | { type: "INIT_BAG" }
  | { type: "DRAW_TILES"; quantity: number }
  | { type: "CLEAR_RACK" }
  | { type: "SHUFFLE_BAG" }
  | { type: "RETURN_TILES"; tiles: Tile[] };


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
  bag: new TileBag(),
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
    case "INIT_BAG": {
      const tiles = createTileDistribution();
      const newBag = new TileBag(tiles);
      newBag.shuffle();
      return { ...state, bag: newBag };
    }
    case "DRAW_TILES": {
      const quantity = Math.max(1, Math.min(10, action.quantity));
      // Create a new bag instance to avoid mutation
      const newBag = new TileBag([...state.bag.peek()]);
      const drawnTiles = newBag.draw(quantity);
      return { ...state, bag: newBag, rack: [...state.rack, ...drawnTiles] };
    }
    case "CLEAR_RACK": {
      return { ...state, rack: [] };
    }
    case "SHUFFLE_BAG": {
      const newBag = new TileBag([...state.bag.peek()]);
      newBag.shuffle();
      return { ...state, bag: newBag };
    }
    case "RETURN_TILES": {
      const newBag = new TileBag([...state.bag.peek()]);
      newBag.return(action.tiles);
      return { ...state, bag: newBag };
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