import { BoardState, PlacementHistoryEntry } from "../types/board";
import { RackState } from "../types/rack";
import { Bag } from "../types/bag";
import { StickerState } from "../types/sticker";
import { TileData } from "../types/tile";

export interface GameState {
    board: BoardState;
    rack: RackState;
    bag: Bag;
    discard: TileData[];

    stickers: StickerState;
    totalScore: number;

    isDraftMode: boolean;
    draftBoard: BoardState;
    draftRerollCount: number;
    draftEnded: boolean;
    hasSeededFromDraft: boolean;

    placementHistory: PlacementHistoryEntry[];

    isDictionaryLoaded: boolean;

    tileOpacity: number;
    showCoordinates: boolean;
}

// Actions
export type GameAction =
    | { type: "initDictionaryLoaded"; payload: { loaded: boolean } }
    | { type: "setBoard"; payload: { board: BoardState } }
    | { type: "setRack"; payload: { rack: RackState } }
    | { type: "setBag"; payload: { bag: Bag } }
    | { type: "setDiscard"; payload: { discard: TileData[] } }
    | { type: "setStickers"; payload: { stickers: StickerState } }
    | { type: "setTotalScore"; payload: { totalScore: number } }
    | { type: "setDraftFlags"; payload: { isDraftMode?: boolean; draftEnded?: boolean; hasSeededFromDraft?: boolean } }
    | { type: "setDraftRerollCount"; payload: { draftRerollCount: number } }
    | { type: "setDraftBoard"; payload: { draftBoard: BoardState } }
    | { type: "bumpDraftReroll" }
    | { type: "recordPlacement"; payload: PlacementHistoryEntry }
    | { type: "setPlacementHistory"; payload: { placementHistory: PlacementHistoryEntry[] } }
    | { type: "setVisuals"; payload: { tileOpacity?: number; showCoordinates?: boolean } }
    | { type: "batchUpdate"; payload: Partial<GameState> };


