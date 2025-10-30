"use client";

import { useEffect } from "react";
import { BoardState, Position } from "../types/board";
import { createBlankTile, generateUniqueTiles, applyDraftTiles } from "../utils/draftBoardUtils";

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
                if (nextType === '*') {
                    const tiles = [null, createBlankTile('final'), null];
                    const board = applyDraftTiles(prevBoard, tiles, [false, true, false]);
                    setDraftEnded(true);
                    suggestedOccupancyRef.current = [false, true, false];
                    return board;
                } else if (nextType === 'V') {
                    const vowels = generateUniqueTiles(2, 'vowel');
                    const tiles = [vowels[0], null, vowels[1]] as any;
                    const board = applyDraftTiles(prevBoard, tiles, [true, false, true]);
                    suggestedOccupancyRef.current = [true, false, true];
                    return board;
                } else {
                    const consonants = generateUniqueTiles(3, 'consonant');
                    const tiles = [consonants[0], consonants[1], consonants[2]];
                    const board = applyDraftTiles(prevBoard, tiles, [true, true, true]);
                    suggestedOccupancyRef.current = [true, true, true];
                    return board;
                }
            });
            setDraftRerollCount(c => c + 1);
        } else {
            suggestedOccupancyRef.current = occupancy;
        }
    }, [isDraftMode, draftBoard, draftRerollCount, draftEnded]);

    function rerollSuggestions() {
        if (!isDraftMode || draftEnded) return;
        const draftSequence: Array<'V' | 'C' | '*'> = ['V','C','C','V','C','C','V','C','C','V','C','C','V','*'];
        const currentIndex = Math.min(draftRerollCount, draftSequence.length - 1);
        const type = draftSequence[currentIndex];
        setDraftBoard(prevBoard => {
            if (type === '*') {
                return prevBoard;
            } else if (type === 'V') {
                const vowels = generateUniqueTiles(2, 'vowel');
                const tiles = [vowels[0], null, vowels[1]] as any;
                const board = applyDraftTiles(prevBoard, tiles, [true, false, true]);
                suggestedOccupancyRef.current = [true, false, true];
                return board;
            } else {
                const consonants = generateUniqueTiles(3, 'consonant');
                const tiles = [consonants[0], consonants[1], consonants[2]];
                const board = applyDraftTiles(prevBoard, tiles, [true, true, true]);
                suggestedOccupancyRef.current = [true, true, true];
                return board;
            }
        });
    }

    return { rerollSuggestions };
}


