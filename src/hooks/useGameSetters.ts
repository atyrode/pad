"use client";

import { useCallback } from "react";
import { useGame, useGameDispatch } from "../state/GameContext";
import { BoardState, PlacementHistoryEntry } from "../types/board";
import { RackState } from "../types/rack";
import { Bag } from "../types/bag";
import { StickerState } from "../types/sticker";

export function useGameSetters() {
    const state = useGame();
    const dispatch = useGameDispatch();

    const setBoard = useCallback((updater: BoardState | ((prev: BoardState) => BoardState)) => {
        const next = typeof updater === "function" ? (updater as (p: BoardState) => BoardState)(state.board) : updater;
        dispatch({ type: "setBoard", payload: { board: next } });
    }, [state.board, dispatch]);

    const setRack = useCallback((updater: RackState | ((prev: RackState) => RackState)) => {
        const next = typeof updater === "function" ? (updater as (p: RackState) => RackState)(state.rack) : updater;
        dispatch({ type: "setRack", payload: { rack: next } });
    }, [state.rack, dispatch]);

    const setBag = useCallback((updater: Bag | ((prev: Bag) => Bag)) => {
        const next = typeof updater === "function" ? (updater as (p: Bag) => Bag)(state.bag) : updater;
        dispatch({ type: "setBag", payload: { bag: next } });
    }, [state.bag, dispatch]);

    const setDiscard = useCallback((updater: Array<any> | ((prev: Array<any>) => Array<any>)) => {
        const next = typeof updater === "function" ? (updater as (p: Array<any>) => Array<any>)(state.discard) : updater;
        dispatch({ type: "setDiscard", payload: { discard: next } });
    }, [state.discard, dispatch]);

    const setStickers = useCallback((updater: StickerState | ((prev: StickerState) => StickerState)) => {
        const next = typeof updater === "function" ? (updater as (p: StickerState) => StickerState)(state.stickers) : updater;
        dispatch({ type: "setStickers", payload: { stickers: next } });
    }, [state.stickers, dispatch]);

    const setIsDictionaryLoaded = useCallback((loaded: boolean) => {
        dispatch({ type: "initDictionaryLoaded", payload: { loaded } });
    }, [dispatch]);

    const setTotalScore = useCallback((updater: number | ((prev: number) => number)) => {
        const next = typeof updater === "function" ? (updater as (p: number) => number)(state.totalScore) : updater;
        dispatch({ type: "setTotalScore", payload: { totalScore: next } });
    }, [state.totalScore, dispatch]);

    const setTileOpacity = useCallback((updater: number | ((prev: number) => number)) => {
        const next = typeof updater === "function" ? (updater as (p: number) => number)(state.tileOpacity) : updater;
        dispatch({ type: "setVisuals", payload: { tileOpacity: next } });
    }, [state.tileOpacity, dispatch]);

    const setShowCoordinates = useCallback((updater: boolean | ((prev: boolean) => boolean)) => {
        const next = typeof updater === "function" ? (updater as (p: boolean) => boolean)(state.showCoordinates) : updater;
        dispatch({ type: "setVisuals", payload: { showCoordinates: next } });
    }, [state.showCoordinates, dispatch]);

    const setIsDraftMode = useCallback((updater: boolean | ((prev: boolean) => boolean)) => {
        const next = typeof updater === "function" ? (updater as (p: boolean) => boolean)(state.isDraftMode) : updater;
        dispatch({ type: "setDraftFlags", payload: { isDraftMode: next } });
    }, [state.isDraftMode, dispatch]);

    const setDraftBoard = useCallback((updater: BoardState | ((prev: BoardState) => BoardState)) => {
        const next = typeof updater === "function" ? (updater as (p: BoardState) => BoardState)(state.draftBoard) : updater;
        dispatch({ type: "setDraftBoard", payload: { draftBoard: next } });
    }, [state.draftBoard, dispatch]);

    const setDraftRerollCount = useCallback((updater: number | ((prev: number) => number)) => {
        const next = typeof updater === "function" ? (updater as (p: number) => number)(state.draftRerollCount) : updater;
        dispatch({ type: "setDraftRerollCount", payload: { draftRerollCount: next } });
    }, [state.draftRerollCount, dispatch]);

    const setDraftEnded = useCallback((updater: boolean | ((prev: boolean) => boolean)) => {
        const next = typeof updater === "function" ? (updater as (p: boolean) => boolean)(state.draftEnded) : updater;
        dispatch({ type: "setDraftFlags", payload: { draftEnded: next } });
    }, [state.draftEnded, dispatch]);

    const setHasSeededFromDraft = useCallback((updater: boolean | ((prev: boolean) => boolean)) => {
        const next = typeof updater === "function" ? (updater as (p: boolean) => boolean)(state.hasSeededFromDraft) : updater;
        dispatch({ type: "setDraftFlags", payload: { hasSeededFromDraft: next } });
    }, [state.hasSeededFromDraft, dispatch]);

    const setPlacementHistory = useCallback((updater: PlacementHistoryEntry[] | ((prev: PlacementHistoryEntry[]) => PlacementHistoryEntry[])) => {
        const next = typeof updater === "function" ? (updater as (p: PlacementHistoryEntry[]) => PlacementHistoryEntry[])(state.placementHistory) : updater;
        dispatch({ type: "setPlacementHistory", payload: { placementHistory: next } });
    }, [state.placementHistory, dispatch]);

    return {
        setBoard,
        setRack,
        setBag,
        setDiscard,
        setStickers,
        setIsDictionaryLoaded,
        setTotalScore,
        setTileOpacity,
        setShowCoordinates,
        setIsDraftMode,
        setDraftBoard,
        setDraftRerollCount,
        setDraftEnded,
        setHasSeededFromDraft,
        setPlacementHistory,
    };
}


