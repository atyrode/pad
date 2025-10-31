import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { BoardState, PlacementHistoryEntry } from '../types/board';
import { RackState } from '../types/rack';
import { Bag } from '../types/bag';
import { StickerState } from '../types/sticker';
import { TileData } from '../types/tile';
import * as Board from '../domain/board/Board';
import * as Rack from '../domain/rack/Rack';
import * as Draft from '../domain/draft/Draft';
import * as Stickers from '../domain/stickers/Stickers';

// UI slice
interface UiSlice {
  tileOpacity: number;
  showCoordinates: boolean;
  exitingDraft: boolean;
  setTileOpacity: (opacity: number) => void;
  setShowCoordinates: (show: boolean) => void;
  setExitingDraft: (exiting: boolean) => void;
}

// Dictionary slice
interface DictionarySlice {
  isDictionaryLoaded: boolean;
  setDictionaryLoaded: (loaded: boolean) => void;
}

// Game state slices
interface BoardSlice {
  board: BoardState;
  placementHistory: PlacementHistoryEntry[];
  setBoard: (board: BoardState) => void;
  setPlacementHistory: (history: PlacementHistoryEntry[]) => void;
  addPlacement: (entry: PlacementHistoryEntry) => void;
}

interface RackSlice {
  rack: RackState;
  setRack: (rack: RackState) => void;
}

interface BagSlice {
  bag: Bag;
  setBag: (bag: Bag) => void;
}

interface DiscardSlice {
  discard: TileData[];
  setDiscard: (discard: TileData[]) => void;
}

interface StickersSlice {
  stickers: StickerState;
  setStickers: (stickers: StickerState) => void;
}

interface ScoreSlice {
  totalScore: number;
  setTotalScore: (score: number) => void;
}

interface DraftSlice {
  isDraftMode: boolean;
  draftBoard: BoardState;
  draftRerollCount: number;
  draftEnded: boolean;
  hasSeededFromDraft: boolean;
  setIsDraftMode: (mode: boolean) => void;
  setDraftBoard: (board: BoardState) => void;
  setDraftRerollCount: (count: number) => void;
  incrementDraftReroll: () => void;
  setDraftEnded: (ended: boolean) => void;
  setHasSeededFromDraft: (seeded: boolean) => void;
}

// Combined store type
interface GameStore extends
  BoardSlice,
  RackSlice,
  BagSlice,
  DiscardSlice,
  StickersSlice,
  ScoreSlice,
  DraftSlice,
  UiSlice,
  DictionarySlice {

  // Batch update for complex operations
  batchUpdate: (updates: Partial<
    Pick<GameStore,
      'board' | 'rack' | 'bag' | 'discard' | 'stickers' | 'totalScore' |
      'placementHistory' | 'isDraftMode' | 'draftBoard' | 'draftRerollCount' |
      'draftEnded' | 'hasSeededFromDraft' | 'tileOpacity' | 'showCoordinates' |
      'isDictionaryLoaded'
    >
  >) => void;

  // Reset functions
  resetGame: () => void;
}

// Initial states
const initialBoard = Board.createEmpty();
const initialRack = Rack.createEmpty();
const initialStickers = Stickers.createInitialStickers();
const initialDraftBoard = Draft.createInitialDraftBoard();

export const useGameStore = create<GameStore>()(
  devtools(
    (set, get) => ({
      // Board slice
      board: initialBoard,
      placementHistory: [],
      setBoard: (board) => set({ board }),
      setPlacementHistory: (placementHistory) => set({ placementHistory }),
      addPlacement: (entry) => set((state) => ({
        placementHistory: [...state.placementHistory, entry]
      })),

      // Rack slice
      rack: initialRack,
      setRack: (rack) => set({ rack }),

      // Bag slice
      bag: [],
      setBag: (bag) => set({ bag }),

      // Discard slice
      discard: [],
      setDiscard: (discard) => set({ discard }),

      // Stickers slice
      stickers: initialStickers,
      setStickers: (stickers) => set({ stickers }),

      // Score slice
      totalScore: 0,
      setTotalScore: (totalScore) => set({ totalScore }),

      // Draft slice
      isDraftMode: false,
      draftBoard: initialDraftBoard,
      draftRerollCount: 0,
      draftEnded: false,
      hasSeededFromDraft: false,
      setIsDraftMode: (isDraftMode) => set({ isDraftMode }),
      setDraftBoard: (draftBoard) => set({ draftBoard }),
      setDraftRerollCount: (draftRerollCount) => set({ draftRerollCount }),
      incrementDraftReroll: () => set((state) => ({
        draftRerollCount: state.draftRerollCount + 1
      })),
      setDraftEnded: (draftEnded) => set({ draftEnded }),
      setHasSeededFromDraft: (hasSeededFromDraft) => set({ hasSeededFromDraft }),

      // UI slice
      tileOpacity: 100,
      showCoordinates: false,
      exitingDraft: false,
      setTileOpacity: (tileOpacity) => set({ tileOpacity }),
      setShowCoordinates: (showCoordinates) => set({ showCoordinates }),
      setExitingDraft: (exitingDraft) => set({ exitingDraft }),

      // Dictionary slice
      isDictionaryLoaded: false,
      setDictionaryLoaded: (isDictionaryLoaded) => set({ isDictionaryLoaded }),

      // Batch update
      batchUpdate: (updates) => set(updates),

      // Reset game
      resetGame: () => set({
        board: initialBoard,
        rack: initialRack,
        bag: [],
        discard: [],
        stickers: initialStickers,
        totalScore: 0,
        isDraftMode: false,
        draftBoard: initialDraftBoard,
        draftRerollCount: 0,
        draftEnded: false,
        hasSeededFromDraft: false,
        placementHistory: [],
        tileOpacity: 100,
        showCoordinates: false,
        exitingDraft: false,
        isDictionaryLoaded: false,
      }),
    }),
    {
      name: 'manifold-game-store',
      enabled: process.env.NODE_ENV === 'development',
    }
  )
);

// Selectors for derived state
export const useBoardState = () => useGameStore((state) => state.board);
export const useRackState = () => useGameStore((state) => state.rack);
export const useBagState = () => useGameStore((state) => state.bag);
export const useDiscardState = () => useGameStore((state) => state.discard);
export const useStickersState = () => useGameStore((state) => state.stickers);
export const useScoreState = () => useGameStore((state) => state.totalScore);
export const usePlacementHistory = () => useGameStore((state) => state.placementHistory);
export const useDraftState = () => useGameStore((state) => ({
  isDraftMode: state.isDraftMode,
  draftBoard: state.draftBoard,
  draftRerollCount: state.draftRerollCount,
  draftEnded: state.draftEnded,
  hasSeededFromDraft: state.hasSeededFromDraft,
}));
export const useUiState = () => useGameStore((state) => ({
  tileOpacity: state.tileOpacity,
  showCoordinates: state.showCoordinates,
  exitingDraft: state.exitingDraft,
}));
export const useDictionaryLoaded = () => useGameStore((state) => state.isDictionaryLoaded);

// Action selectors
export const useBoardActions = () => useGameStore((state) => ({
  setBoard: state.setBoard,
  setPlacementHistory: state.setPlacementHistory,
  addPlacement: state.addPlacement,
}));
export const useRackActions = () => useGameStore((state) => ({ setRack: state.setRack }));
export const useBagActions = () => useGameStore((state) => ({ setBag: state.setBag }));
export const useDiscardActions = () => useGameStore((state) => ({ setDiscard: state.setDiscard }));
export const useStickersActions = () => useGameStore((state) => ({ setStickers: state.setStickers }));
export const useScoreActions = () => useGameStore((state) => ({ setTotalScore: state.setTotalScore }));
export const useDraftActions = () => useGameStore((state) => ({
  setIsDraftMode: state.setIsDraftMode,
  setDraftBoard: state.setDraftBoard,
  setDraftRerollCount: state.setDraftRerollCount,
  incrementDraftReroll: state.incrementDraftReroll,
  setDraftEnded: state.setDraftEnded,
  setHasSeededFromDraft: state.setHasSeededFromDraft,
}));
export const useUiActions = () => useGameStore((state) => ({
  setTileOpacity: state.setTileOpacity,
  setShowCoordinates: state.setShowCoordinates,
  setExitingDraft: state.setExitingDraft,
}));
export const useBatchUpdate = () => useGameStore((state) => state.batchUpdate);
export const useResetGame = () => useGameStore((state) => state.resetGame);
