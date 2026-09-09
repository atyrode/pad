import initialize, {
    ENGINE_BUILD, Lexicon, applyAction as rustApplyAction, createGame as rustCreateGame,
    evaluatePlay as rustEvaluatePlay, getDraftedTiles as rustGetDraftedTiles,
    isDraftPlacement as rustIsDraftPlacement,
    areUnlockedTilesInSingleLine as rustAreUnlockedTilesInSingleLine,
    type InitInput,
} from '../generated/engine/skrabble_engine.js';
import { ENGINE_META, type EncounterConfig, type GameAction, type GameState, type PlayEvaluation,
    type Position, type TileData } from './generated';

export type { EncounterConfig, EncounterState, GameAction, GameState, PlayEvaluation, TileTarget } from './generated';
export { Lexicon };
export const DRAFT_COLUMNS = ENGINE_META.draftColumns;
export const DRAFT_SEQUENCE = ENGINE_META.draftSequence;
export const DEFAULT_ENCOUNTER_CONFIG: Readonly<EncounterConfig> = ENGINE_META.encounter;
export type DictionaryInput = Lexicon | ReadonlySet<string> | null;
export type ActionResult = { ok: true; state: GameState; position?: Position; tile?: TileData }
    | { ok: false; state: GameState; reason: string };

let ready = false;
let inFlight: Promise<void> | null = null;
let unavailableDictionary: Lexicon;
const dictionaries = new WeakMap<ReadonlySet<string>, Lexicon>();

/** Browser initialization is asynchronous; every rule command after it is synchronous. */
export function initializeEngine(source?: InitInput): Promise<void> {
    if (ready) return Promise.resolve();
    if (inFlight) return inFlight;
    inFlight = initialize({ module_or_path: source ?? `/skrabble/engine/${ENGINE_BUILD}.wasm` }).then(() => {
        unavailableDictionary = new Lexicon(null);
        ready = true;
    }).finally(() => { inFlight = null; });
    return inFlight;
}

function assertReady() {
    if (!ready) throw new Error('Load the game engine before issuing commands.');
}

function nativeDictionary(dictionary: DictionaryInput): Lexicon {
    assertReady();
    if (dictionary === null) return unavailableDictionary;
    if (dictionary instanceof Lexicon) return dictionary;
    let native = dictionaries.get(dictionary);
    if (!native) {
        native = new Lexicon(Array.from(dictionary));
        dictionaries.set(dictionary, native);
    }
    return native;
}

export function createGame(seed: number): GameState {
    assertReady();
    return rustCreateGame(seed) as GameState;
}

export function applyAction(state: GameState, action: GameAction, dictionary: DictionaryInput): ActionResult {
    const result = rustApplyAction(state, action, nativeDictionary(dictionary)) as ActionResult;
    // Rejections retain the caller's snapshot and its identity. Rust validates atomically.
    return result.ok ? result : { ...result, state };
}

export function evaluatePlay(state: GameState, dictionary: DictionaryInput): PlayEvaluation {
    return rustEvaluatePlay(state, nativeDictionary(dictionary)) as PlayEvaluation;
}

export function getDraftedTiles(state: GameState): TileData[] {
    assertReady();
    return rustGetDraftedTiles(state) as TileData[];
}

export function isDraftPlacement(position: Position): boolean {
    assertReady();
    return rustIsDraftPlacement(position);
}

export function areUnlockedTilesInSingleLine(board: GameState['board']): boolean {
    assertReady();
    return rustAreUnlockedTilesInSingleLine(board);
}
