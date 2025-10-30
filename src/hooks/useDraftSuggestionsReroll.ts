"use client";

import { useEffect } from "react";
import { BoardState, Position } from "../types/board";
import { createBlankTile, generateUniqueTiles } from "../utils/draftBoardUtils";

type Occupancy = [boolean, boolean, boolean];

export function useDraftSuggestionsReroll(args: {
    isDraftMode: boolean;
    draftBoard: BoardState;
    draftEnded: boolean;
    draftRerollCount: number;
    setDraftBoard: (updater: BoardState | ((prev: BoardState) => BoardState)) => void;
    setDraftRerollCount: (updater: number | ((prev: number) => number)) => void;
    setDraftEnded: (updater: boolean | ((prev: boolean) => boolean)) => void;
    suggestedOccupancyRef: React.MutableRefObject<Occupancy | null>;
}) {
    const {
        isDraftMode,
        draftBoard,
        draftEnded,
        draftRerollCount,
        setDraftBoard,
        setDraftRerollCount,
        setDraftEnded,
        suggestedOccupancyRef,
    } = args;

    useEffect(() => {
        if (!isDraftMode || draftEnded) return;

        const occupancy: Occupancy = [
            !!draftBoard[4][2].tile,
            !!draftBoard[4][5].tile,
            !!draftBoard[4][8].tile,
        ];

        if (suggestedOccupancyRef.current === null) {
            suggestedOccupancyRef.current = occupancy;
            return;
        }

        const prev = suggestedOccupancyRef.current;
        const becameTaken = (prev[0] && !occupancy[0]) || (prev[1] && !occupancy[1]) || (prev[2] && !occupancy[2]);

        if (becameTaken) {
            const draftSequence: Array<'V' | 'C' | '*'> = ['V','C','C','V','C','C','V','C','C','V','C','C','V','*'];
            const nextIndex = Math.min(draftRerollCount + 1, draftSequence.length - 1);
            const nextType = draftSequence[nextIndex];

            setDraftBoard(prevBoard => {
                const newBoard = prevBoard.map(row => [...row]);
                if (nextType === '*') {
                    newBoard[4][2] = { ...newBoard[4][2], tile: null, canPlace: false, canTake: true };
                    newBoard[4][5] = { ...newBoard[4][5], tile: createBlankTile('final'), canPlace: false, canTake: true };
                    newBoard[4][8] = { ...newBoard[4][8], tile: null, canPlace: false, canTake: true };
                    setDraftEnded(true);
                    suggestedOccupancyRef.current = [false, true, false];
                } else if (nextType === 'V') {
                    const vowels = generateUniqueTiles(2, 'vowel');
                    newBoard[4][2] = { ...newBoard[4][2], tile: vowels[0], canPlace: false, canTake: true };
                    newBoard[4][5] = { ...newBoard[4][5], tile: null, canPlace: false, canTake: true };
                    newBoard[4][8] = { ...newBoard[4][8], tile: vowels[1], canPlace: false, canTake: true };
                    suggestedOccupancyRef.current = [true, false, true];
                } else {
                    const consonants = generateUniqueTiles(3, 'consonant');
                    newBoard[4][2] = { ...newBoard[4][2], tile: consonants[0], canPlace: false, canTake: true };
                    newBoard[4][5] = { ...newBoard[4][5], tile: consonants[1], canPlace: false, canTake: true };
                    newBoard[4][8] = { ...newBoard[4][8], tile: consonants[2], canPlace: false, canTake: true };
                    suggestedOccupancyRef.current = [true, true, true];
                }
                return newBoard;
            });
            setDraftRerollCount(c => c + 1);
        } else {
            suggestedOccupancyRef.current = occupancy;
        }
    }, [isDraftMode, draftBoard, draftRerollCount, draftEnded]);
}


