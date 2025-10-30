import { GameAction, GameState } from "./gameTypes";

export function gameReducer(state: GameState, action: GameAction): GameState {
    switch (action.type) {
        case "initDictionaryLoaded": {
            return { ...state, isDictionaryLoaded: action.payload.loaded };
        }
        case "setBoard": {
            return { ...state, board: action.payload.board };
        }
        case "setRack": {
            return { ...state, rack: action.payload.rack };
        }
        case "setBag": {
            return { ...state, bag: action.payload.bag };
        }
        case "setDiscard": {
            return { ...state, discard: action.payload.discard };
        }
        case "setStickers": {
            return { ...state, stickers: action.payload.stickers };
        }
        case "setTotalScore": {
            return { ...state, totalScore: action.payload.totalScore };
        }
        case "setDraftFlags": {
            return {
                ...state,
                isDraftMode: action.payload.isDraftMode ?? state.isDraftMode,
                draftEnded: action.payload.draftEnded ?? state.draftEnded,
                hasSeededFromDraft: action.payload.hasSeededFromDraft ?? state.hasSeededFromDraft,
            };
        }
        case "setDraftBoard": {
            return { ...state, draftBoard: action.payload.draftBoard };
        }
        case "setDraftRerollCount": {
            return { ...state, draftRerollCount: action.payload.draftRerollCount };
        }
        case "bumpDraftReroll": {
            return { ...state, draftRerollCount: state.draftRerollCount + 1 };
        }
        case "recordPlacement": {
            return { ...state, placementHistory: [...state.placementHistory, action.payload] };
        }
        case "setPlacementHistory": {
            return { ...state, placementHistory: action.payload.placementHistory };
        }
        case "setVisuals": {
            return {
                ...state,
                tileOpacity: action.payload.tileOpacity ?? state.tileOpacity,
                showCoordinates: action.payload.showCoordinates ?? state.showCoordinates,
            };
        }
        case "batchUpdate": {
            return { ...state, ...action.payload };
        }
        default: {
            return state;
        }
    }
}


