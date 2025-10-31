import { useGameStore } from "./store";
import { Rules } from "../engine/Rules";
import * as Rack from "../domain/rack/Rack";

/**
 * Zustand-derived selector for checking if all current words are valid
 */
export function useAreAllCurrentWordsValid(): boolean {
    const board = useGameStore((state) => state.board);
    const stickers = useGameStore((state) => state.stickers);
    const isDictionaryLoaded = useGameStore((state) => state.isDictionaryLoaded);

    return Rules.areAllCurrentWordsValid(board, stickers, isDictionaryLoaded).isValid;
}

/**
 * Zustand-derived selector for checking if play is allowed
 */
export function useCanPlay(): boolean {
    return useAreAllCurrentWordsValid();
}

/**
 * Zustand-derived selector for checking if shuffle is allowed
 */
export function useCanShuffle(): boolean {
    const rack = useGameStore((state) => state.rack);
    return rack.filter(t => !!t).length > 1;
}

/**
 * Zustand-derived selector for getting rack tile count
 */
export function useRackTileCount(): number {
    const rack = useGameStore((state) => state.rack);
    return Rack.count(rack);
}

/**
 * Zustand-derived selector for checking if rack is full
 */
export function useIsRackFull(): boolean {
    const rack = useGameStore((state) => state.rack);
    return Rack.isFull(rack);
}

/**
 * Zustand-derived selector for checking if rack has empty slots
 */
export function useHasEmptySlot(): boolean {
    const rack = useGameStore((state) => state.rack);
    return Rack.firstEmpty(rack) !== null;
}

// Legacy function selectors (deprecated - use hooks above)
export function areAllCurrentWordsValidSelector(
    board: any,
    stickers: any,
    isDictionaryLoaded: boolean
): boolean {
    // This function is deprecated - use useAreAllCurrentWordsValid hook instead
    throw new Error("Use useAreAllCurrentWordsValid hook instead of areAllCurrentWordsValidSelector function");
}

export function canPlaySelector(args: {
    board: any;
    stickers: any;
    isDictionaryLoaded: boolean;
}): boolean {
    // This function is deprecated - use useCanPlay hook instead
    throw new Error("Use useCanPlay hook instead of canPlaySelector function");
}

export function canShuffleSelector(rack: any): boolean {
    // This function is deprecated - use useCanShuffle hook instead
    throw new Error("Use useCanShuffle hook instead of canShuffleSelector function");
}

export function rackTileCountSelector(rack: any): number {
    // This function is deprecated - use useRackTileCount hook instead
    throw new Error("Use useRackTileCount hook instead of rackTileCountSelector function");
}

export function isRackFullSelector(rack: any): boolean {
    // This function is deprecated - use useIsRackFull hook instead
    throw new Error("Use useIsRackFull hook instead of isRackFullSelector function");
}

export function hasEmptySlotSelector(rack: any): boolean {
    // This function is deprecated - use useHasEmptySlot hook instead
    throw new Error("Use useHasEmptySlot hook instead of hasEmptySlotSelector function");
}
