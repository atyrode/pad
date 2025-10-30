"use client";

import { createContext, useContext, useMemo, useReducer, ReactNode } from "react";
import { GameState, GameAction } from "./gameTypes";
import { gameReducer } from "./gameReducer";
import { createInitialBoard } from "../utils/boardUtils";
import { createInitialRack } from "../utils/rackUtils";
import { createInitialDraftBoard } from "../utils/draftBoardUtils";
import { createInitialStickers } from "../utils/stickerUtils";

const GameStateContext = createContext<GameState | undefined>(undefined);
const GameDispatchContext = createContext<React.Dispatch<GameAction> | undefined>(undefined);

function getInitialState(): GameState {
    return {
        board: createInitialBoard(),
        rack: createInitialRack(),
        bag: [],
        discard: [],

        stickers: createInitialStickers(),
        totalScore: 0,

        isDraftMode: false,
        draftBoard: createInitialDraftBoard(),
        draftRerollCount: 0,
        draftEnded: false,
        hasSeededFromDraft: false,

        placementHistory: [],

        isDictionaryLoaded: false,

        tileOpacity: 100,
        showCoordinates: false,
    };
}

export function GameProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(gameReducer, undefined, getInitialState);

    const stateValue = useMemo(() => state, [state]);
    const dispatchValue = useMemo(() => dispatch, [dispatch]);

    return (
        <GameStateContext.Provider value={stateValue}>
            <GameDispatchContext.Provider value={dispatchValue}>
                {children}
            </GameDispatchContext.Provider>
        </GameStateContext.Provider>
    );
}

export function useGame(): GameState {
    const ctx = useContext(GameStateContext);
    if (ctx === undefined) {
        throw new Error("useGame must be used within a GameProvider");
    }
    return ctx;
}

export function useGameDispatch(): React.Dispatch<GameAction> {
    const ctx = useContext(GameDispatchContext);
    if (ctx === undefined) {
        throw new Error("useGameDispatch must be used within a GameProvider");
    }
    return ctx;
}


