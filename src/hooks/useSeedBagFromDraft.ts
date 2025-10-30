"use client";

import { useEffect } from "react";
import { BoardState, Position } from "../types/board";
import { TileData } from "../types/tile";
import { Bag } from "../types/bag";
import { shuffleBag } from "../utils/bagUtils";

export function useSeedBagFromDraft(args: {
    isDraftMode: boolean;
    draftBoard: BoardState;
    draftEnded: boolean;
    hasSeededFromDraft: boolean;
    setBag: (updater: Bag | ((prev: Bag) => Bag)) => void;
    setHasSeededFromDraft: (updater: boolean | ((prev: boolean) => boolean)) => void;
}) {
    const { isDraftMode, draftBoard, draftEnded, hasSeededFromDraft, setBag, setHasSeededFromDraft } = args;

    useEffect(() => {
        if (!isDraftMode || !draftEnded || hasSeededFromDraft) return;

        const centerCount = 7;
        const centerStart = Math.floor((11 - centerCount) / 2);
        const positions: Position[] = [];
        [7, 8].forEach(r => {
            for (let c = centerStart; c < centerStart + centerCount; c++) {
                positions.push({ row: r, col: c });
            }
        });

        const drafted = positions
            .map(p => draftBoard[p.row][p.col].tile)
            .filter(Boolean) as TileData[];

        if (drafted.length !== 14) return;

        const newBag = shuffleBag([...drafted]);
        setBag(newBag);
        setHasSeededFromDraft(true);
    }, [isDraftMode, draftBoard, draftEnded, hasSeededFromDraft]);
}


