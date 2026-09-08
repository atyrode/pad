import type { BoardState, PlacementHistoryEntry, Position } from '../types/board';
import type { RackState } from '../types/rack';
import type { StickerState } from '../types/sticker';
import type { TileData } from '../types/tile';
import { BOARD_SIZE } from '../constants/board';
import { areUnlockedTilesInSingleLine, createInitialBoard, doesCurrentPlayTouchLocked, findAllWords, findTilePosition, type WordInfo } from '../utils/boardUtils';
import { createInitialDraftBoard, generateUniqueTiles } from '../utils/draftBoardUtils';
import { shuffleBag } from '../utils/bagUtils';
import { createInitialRack, findFirstEmptySlot, findTileInRack, RACK_SIZE, shuffleRack } from '../utils/rackUtils';
import { calculateCurrentPlayScore, type PlayScore } from '../utils/scoreUtils';
import { createInitialStickers, doesWordCoverStartSticker, isStartStickerConsumed } from '../utils/stickerUtils';

export const DRAFT_SEQUENCE = ['V', 'C', 'C', 'V', 'C', 'C', 'V', 'C', 'C', 'V', 'C', 'C', 'V', '*'] as const;
export const DRAFT_COLUMNS = [2, 5, 8] as const;

export interface GameState {
    version: 1;
    seed: number;
    rng: number;
    rackRng: number;
    nextTileId: number;
    mode: 'game' | 'draft';
    board: BoardState;
    rack: RackState;
    bag: TileData[];
    discard: TileData[];
    stickers: StickerState;
    totalScore: number;
    placementHistory: PlacementHistoryEntry[];
    draft: { board: BoardState; pickIndex: number; complete: boolean; seeded: boolean };
}

export type TileTarget = { zone: 'board'; row: number; col: number }
    | { zone: 'rack'; index: number }
    | { zone: 'draft'; row: number; col: number };

export type GameAction = { type: 'set-mode'; mode: 'game' | 'draft' }
    | { type: 'move'; tileId: string; to: TileTarget; letter?: string }
    | { type: 'recall' }
    | { type: 'discard'; tileId: string }
    | { type: 'draw'; count: 1 | 'all' }
    | { type: 'redraw' }
    | { type: 'shuffle-rack' }
    | { type: 'shuffle-bag' }
    | { type: 'reset'; target: 'game' | 'board' | 'rack' | 'bag' | 'score' | 'stickers' }
    | { type: 'draft-pick'; column: number; to?: Position }
    | { type: 'draft-reroll' }
    | { type: 'reset-draft' }
    | { type: 'play' };

export type ActionResult = { ok: true; state: GameState; position?: Position; tile?: TileData }
    | { ok: false; state: GameState; reason: string };

export interface PlayEvaluation {
    canPlay: boolean;
    reason: string | null;
    words: WordInfo[];
    score: PlayScore;
}

function random(state: GameState, channel: 'rng' | 'rackRng' = 'rng'): number {
    // Mulberry32: the complete stream position lives in the plain state.
    const next = state[channel] = (state[channel] + 0x6d2b79f5) >>> 0;
    let value = Math.imul(next ^ (next >>> 15), next | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
}

function nextId(state: GameState): string {
    return `tile-${state.seed}-${state.nextTileId++}`;
}

function isBlank(tile: TileData): boolean {
    return tile.value === '*' || tile.originalValue === '*';
}

function inventoryTile(tile: TileData): TileData {
    return isBlank(tile) ? { id: tile.id, value: '*', score: 0, originalValue: '*' } : tile;
}

function boardTile(tile: TileData, fromBoard: boolean, letter?: string): TileData | null {
    if (!isBlank(tile)) return tile;
    if (fromBoard && /^[A-Z]$/.test(tile.value)) return tile;
    if (!letter || !/^[A-Z]$/.test(letter)) return null;
    return { id: tile.id, value: letter, score: 0, originalValue: '*', displayValue: letter };
}

function inBoard(position: Position): boolean {
    return Number.isInteger(position.row) && Number.isInteger(position.col)
        && position.row >= 0 && position.row < BOARD_SIZE && position.col >= 0 && position.col < BOARD_SIZE;
}

export function isDraftPlacement(position: Position): boolean {
    return inBoard(position) && (position.row === 7 || position.row === 8) && position.col >= 2 && position.col <= 8;
}

function copyBoard(board: BoardState): BoardState {
    return board.map(row => row.map(cell => ({ ...cell })));
}

export function getDraftedTiles(state: GameState): TileData[] {
    const tiles: TileData[] = [];
    for (const row of [7, 8]) {
        for (let col = 2; col <= 8; col++) {
            const tile = state.draft.board[row][col].tile;
            if (tile) tiles.push(tile);
        }
    }
    return tiles;
}

function offerDraft(state: GameState): void {
    const board = state.draft.board;
    for (const col of DRAFT_COLUMNS) board[4][col].tile = null;
    if (state.draft.complete) return;
    const kind = DRAFT_SEQUENCE[state.draft.pickIndex];
    if (kind === '*') {
        board[4][5].tile = { id: nextId(state), value: '*', score: 0, originalValue: '*' };
    } else {
        const tiles = generateUniqueTiles(kind === 'V' ? 2 : 3, kind === 'V' ? 'vowel' : 'consonant', () => random(state), () => nextId(state));
        const columns = kind === 'V' ? [2, 8] : DRAFT_COLUMNS;
        columns.forEach((col, index) => { board[4][col].tile = tiles[index]; });
    }
}

function seedBag(state: GameState): void {
    const tiles = getDraftedTiles(state).map(tile => ({ ...inventoryTile(tile), id: nextId(state) }));
    state.bag = shuffleBag(tiles, () => random(state));
}

export function createGame(seed: number): GameState {
    const normalizedSeed = seed >>> 0;
    const state: GameState = {
        version: 1, seed: normalizedSeed, rng: normalizedSeed, rackRng: (normalizedSeed ^ 0x9e3779b9) >>> 0,
        nextTileId: 0, mode: 'game', board: createInitialBoard(), rack: createInitialRack(), bag: [], discard: [],
        stickers: createInitialStickers(), totalScore: 0, placementHistory: [],
        draft: { board: createInitialDraftBoard(), pickIndex: 0, complete: false, seeded: false },
    };
    offerDraft(state);
    return state;
}

export function evaluatePlay(state: GameState, dictionary: ReadonlySet<string> | null): PlayEvaluation {
    const words = findAllWords(state.board);
    const current = words.filter(word => !word.isLocked);
    const score = calculateCurrentPlayScore(state.board, state.stickers);
    let reason: string | null = null;
    if (state.mode !== 'game') reason = 'Exit Draft to play.';
    else if (dictionary === null) reason = 'Dictionary is not ready.';
    else if (current.length === 0) reason = 'Place a word of at least two letters.';
    else if (!areUnlockedTilesInSingleLine(state.board)) reason = 'New tiles must form one continuous row or column.';
    else if (state.board.some(row => row.some(cell => cell.tile && !/^[A-Z]$/.test(cell.tile.value)))) reason = 'Choose a letter for every blank.';
    else if (current.some(word => !dictionary.has(word.word.toUpperCase()))) reason = 'Every current word must be in the dictionary.';
    else if (!isStartStickerConsumed(state.stickers)) {
        if (current.some(word => !doesWordCoverStartSticker(word))) reason = 'Every current word must cover the center.';
    } else if (state.board.some(row => row.some(cell => cell.tile && !cell.canTake)) && !doesCurrentPlayTouchLocked(state.board)) {
        reason = 'New tiles must touch a locked tile.';
    }
    return { canPlay: reason === null, reason, words, score };
}

function reject(state: GameState, reason: string): ActionResult {
    return { ok: false, state, reason };
}

function fillRack(state: GameState, slots: number[]): void {
    state.rack = [...state.rack];
    state.bag = [...state.bag];
    for (const index of slots) {
        if (state.rack[index]) continue;
        if (state.bag.length === 0 && state.discard.length > 0) {
            state.bag = shuffleBag(state.discard.map(inventoryTile), () => random(state));
            state.discard = [];
        }
        const tile = state.bag.shift();
        if (!tile) break;
        state.rack[index] = inventoryTile(tile);
    }
}

function emptySlots(rack: RackState): number[] {
    return rack.flatMap((tile, index) => tile === null ? [index] : []);
}

function remember(state: GameState, tile: TileData, position: Position): void {
    state.placementHistory = state.placementHistory.filter(entry => entry.tileId !== tile.id);
    state.placementHistory.push({ tileId: tile.id, position, wasBlank: isBlank(tile) });
}

function move(state: GameState, action: Extract<GameAction, { type: 'move' }>): ActionResult {
    const to = action.to;
    if (state.mode === 'draft') {
        if (to.zone !== 'draft' || !isDraftPlacement(to)) return reject(state, 'Choose a draft placement slot.');
        const from = findTilePosition(state.draft.board, action.tileId);
        if (!from) return reject(state, 'The draft tile is no longer available.');
        if (from.row === 4 && DRAFT_COLUMNS.some(col => col === from.col)) {
            return pickDraft(state, from.col, to);
        }
        if (!isDraftPlacement(from)) return reject(state, 'Decorative tiles cannot move.');
        const next = { ...state, draft: { ...state.draft, board: copyBoard(state.draft.board) } };
        const source = next.draft.board[from.row][from.col];
        const destination = next.draft.board[to.row][to.col];
        [source.tile, destination.tile] = [destination.tile, source.tile];
        return { ok: true, state: next, position: { row: to.row, col: to.col }, tile: destination.tile! };
    }
    if (to.zone === 'draft') return reject(state, 'Enter Draft to arrange draft tiles.');
    if (to.zone === 'board' ? !inBoard(to) : !Number.isInteger(to.index) || to.index < 0 || to.index >= RACK_SIZE) {
        return reject(state, 'Invalid tile destination.');
    }
    const boardFrom = findTilePosition(state.board, action.tileId);
    const rackFrom = findTileInRack(state.rack, action.tileId);
    if (!boardFrom && rackFrom === null) return reject(state, 'The tile is no longer available.');
    if (boardFrom && !state.board[boardFrom.row][boardFrom.col].canTake) return reject(state, 'Locked tiles cannot move.');
    const source = boardFrom ? state.board[boardFrom.row][boardFrom.col].tile! : state.rack[rackFrom!]!;
    const destination = to.zone === 'board' ? state.board[to.row][to.col] : null;
    if (destination && (!destination.canPlace || (destination.tile && !destination.canTake))) return reject(state, 'That board cell is locked.');
    const displaced = to.zone === 'board' ? state.board[to.row][to.col].tile : state.rack[to.index];
    const incoming = to.zone === 'board' ? boardTile(source, boardFrom !== null, action.letter) : inventoryTile(source);
    if (!incoming) return reject(state, 'Choose an A–Z letter for the blank.');
    let replacement = displaced;
    if (displaced && displaced.id !== source.id) {
        if (boardFrom) {
            if (!state.board[boardFrom.row][boardFrom.col].canPlace) return reject(state, 'The source cell cannot accept a swap.');
            replacement = boardTile(displaced, to.zone === 'board', action.letter);
            if (!replacement) return reject(state, 'Choose an A–Z letter for the incoming blank.');
        } else replacement = inventoryTile(displaced);
    }
    if (displaced?.id === source.id) return { ok: true, state, tile: source, ...(boardFrom ? { position: boardFrom } : {}) };
    const next = { ...state, placementHistory: state.placementHistory.filter(entry => entry.tileId !== source.id && entry.tileId !== displaced?.id) };
    if (boardFrom || to.zone === 'board') next.board = copyBoard(state.board);
    if (rackFrom !== null || to.zone === 'rack') next.rack = [...state.rack];
    if (boardFrom) {
        next.board[boardFrom.row][boardFrom.col].tile = replacement;
        if (replacement) remember(next, replacement, boardFrom);
    } else next.rack[rackFrom!] = replacement;
    if (to.zone === 'board') {
        next.board[to.row][to.col].tile = incoming;
        remember(next, incoming, { row: to.row, col: to.col });
    } else next.rack[to.index] = incoming;
    return { ok: true, state: next, tile: incoming, ...(to.zone === 'board' ? { position: { row: to.row, col: to.col } } : boardFrom ? { position: boardFrom } : {}) };
}

function pickDraft(state: GameState, column: number, to?: Position): ActionResult {
    if (state.mode !== 'draft') return reject(state, 'Enter Draft to pick tiles.');
    if (state.draft.complete) return reject(state, 'The draft is complete.');
    if (!DRAFT_COLUMNS.some(col => col === column)) return reject(state, 'Invalid draft offer.');
    const tile = state.draft.board[4][column].tile;
    if (!tile) return reject(state, 'That draft offer is empty.');
    let position = to;
    if (!position) {
        for (const row of [7, 8]) {
            for (let col = 2; col <= 8; col++) {
                if (!state.draft.board[row][col].tile) { position = { row, col }; break; }
            }
            if (position) break;
        }
    }
    if (!position || !isDraftPlacement(position) || state.draft.board[position.row][position.col].tile) {
        return reject(state, 'Choose an empty draft placement slot.');
    }
    const next = { ...state, draft: { ...state.draft, board: copyBoard(state.draft.board) } };
    next.draft.board[position.row][position.col].tile = tile;
    next.draft.pickIndex++;
    next.draft.complete = next.draft.pickIndex === DRAFT_SEQUENCE.length;
    offerDraft(next);
    if (next.draft.complete && !next.draft.seeded) {
        seedBag(next);
        next.draft.seeded = true;
    }
    return { ok: true, state: next, position, tile };
}

export function applyAction(state: GameState, action: GameAction, dictionary: ReadonlySet<string> | null): ActionResult {
    if (action.type === 'set-mode') return { ok: true, state: { ...state, mode: action.mode } };
    if (action.type === 'move') return move(state, action);
    if (action.type === 'reset-draft') {
        if (state.mode !== 'draft') return reject(state, 'Enter Draft to reset the draft.');
        const next = { ...state, draft: { board: createInitialDraftBoard(), pickIndex: 0, complete: false, seeded: false } };
        offerDraft(next);
        return { ok: true, state: next };
    }
    if (action.type === 'draft-pick') return pickDraft(state, action.column, action.to);
    if (action.type === 'draft-reroll') {
        if (state.mode !== 'draft' || state.draft.complete) return reject(state, 'There is no active draft offer.');
        const next = { ...state, draft: { ...state.draft, board: copyBoard(state.draft.board) } };
        offerDraft(next);
        return { ok: true, state: next };
    }
    if (state.mode !== 'game') return reject(state, 'Exit Draft to change the game.');
    const next = { ...state };
    switch (action.type) {
        case 'recall': {
            if (findFirstEmptySlot(state.rack) === null) return reject(state, 'The rack is full.');
            for (let index = state.placementHistory.length - 1; index >= 0; index--) {
                const entry = state.placementHistory[index];
                const position = findTilePosition(state.board, entry.tileId);
                if (!position || !state.board[position.row][position.col].canTake) continue;
                return move(state, { type: 'move', tileId: entry.tileId, to: { zone: 'rack', index: findFirstEmptySlot(state.rack)! } });
            }
            return reject(state, 'There is no pending tile to recall.');
        }
        case 'discard': {
            const position = findTilePosition(state.board, action.tileId);
            const index = findTileInRack(state.rack, action.tileId);
            if (!position && index === null) return reject(state, 'The tile is no longer available.');
            if (position && !state.board[position.row][position.col].canTake) return reject(state, 'Locked tiles cannot be discarded.');
            const tile = position ? state.board[position.row][position.col].tile! : state.rack[index!]!;
            if (position) {
                next.board = copyBoard(state.board);
                next.board[position.row][position.col].tile = null;
            } else {
                next.rack = [...state.rack];
                next.rack[index!] = null;
            }
            next.placementHistory = state.placementHistory.filter(entry => entry.tileId !== tile.id);
            next.discard = [...state.discard, inventoryTile(tile)];
            const vacancy = index ?? findFirstEmptySlot(next.rack);
            if (vacancy !== null) fillRack(next, [vacancy]);
            return { ok: true, state: next, tile: inventoryTile(tile), ...(position ? { position } : {}) };
        }
        case 'draw': {
            const slots = emptySlots(state.rack);
            if (slots.length === 0) return reject(state, 'The rack is full.');
            if (state.bag.length + state.discard.length === 0) return reject(state, 'No tiles are available.');
            fillRack(next, action.count === 1 ? slots.slice(0, 1) : slots);
            break;
        }
        case 'redraw': {
            const occupied = state.rack.flatMap((tile, index) => tile ? [index] : []);
            if (occupied.length === 0) return reject(state, 'The rack is empty.');
            // Cosmetic rack order must not change a later discard-recycling draw.
            const returned = state.rack.filter((tile): tile is TileData => tile !== null)
                .map(inventoryTile).sort((left, right) => left.id < right.id ? -1 : left.id > right.id ? 1 : 0);
            next.discard = [...state.discard, ...returned];
            next.rack = createInitialRack();
            fillRack(next, occupied);
            break;
        }
        case 'shuffle-rack': next.rack = shuffleRack(state.rack, () => random(next, 'rackRng')); break;
        case 'shuffle-bag': next.bag = shuffleBag(state.bag, () => random(next)); break;
        case 'play': {
            const evaluation = evaluatePlay(state, dictionary);
            if (!evaluation.canPlay) return reject(state, evaluation.reason!);
            next.board = copyBoard(state.board);
            next.stickers = state.stickers.map(row => [...row]);
            for (let row = 0; row < BOARD_SIZE; row++) {
                for (let col = 0; col < BOARD_SIZE; col++) {
                    const cell = next.board[row][col];
                    if (!cell.tile || !cell.canTake) continue;
                    cell.canTake = false;
                    cell.canPlace = false;
                    const sticker = next.stickers[row][col];
                    if (sticker) next.stickers[row][col] = { ...sticker, consumed: true };
                }
            }
            next.totalScore += evaluation.score.totalScore;
            next.placementHistory = [];
            fillRack(next, emptySlots(next.rack));
            break;
        }
        case 'reset': {
            if (action.target === 'game' || action.target === 'board') {
                next.board = createInitialBoard();
                next.placementHistory = [];
            }
            if (action.target === 'game' || action.target === 'rack') next.rack = createInitialRack();
            if (action.target === 'game' || action.target === 'score') next.totalScore = 0;
            if (action.target === 'game' || action.target === 'bag') seedBag(next);
            if (action.target === 'game') next.discard = [];
            if (action.target === 'game' || action.target === 'stickers') {
                next.stickers = createInitialStickers();
                for (let row = 0; row < BOARD_SIZE; row++) {
                    for (let col = 0; col < BOARD_SIZE; col++) {
                        const cell = next.board[row][col];
                        const sticker = next.stickers[row][col];
                        if (cell.tile && !cell.canTake && sticker) sticker.consumed = true;
                    }
                }
            }
            break;
        }
    }
    return { ok: true, state: next };
}
