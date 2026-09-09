import { describe, expect, test } from 'bun:test';
import type { TileData } from './generated';
import { getTileDefinition } from '../utils/tileDefinitions';
import { applyAction, areUnlockedTilesInSingleLine, createGame, DRAFT_COLUMNS, DRAFT_SEQUENCE, evaluatePlay, getDraftedTiles, initializeEngine, type EncounterConfig, type GameAction, type GameState } from './runtime';

await initializeEngine(await Bun.file(new URL('../generated/engine/skrabble_engine_bg.wasm', import.meta.url)).arrayBuffer());

function tile(id: string, value = 'A'): TileData {
    return { id, value, score: getTileDefinition(value)!.score, ...(value === '*' ? { originalValue: '*' } : {}) };
}

function act(state: GameState, action: GameAction, dictionary: ReadonlySet<string> | null = null): GameState {
    const result = applyAction(state, action, dictionary);
    if (!result.ok) throw new Error(result.reason);
    return result.state;
}

function liveIds(state: GameState): string[] {
    return [...state.bag, ...state.discard, ...state.rack, ...state.board.flat().map(cell => cell.tile)]
        .filter((value): value is TileData => value !== null).map(value => value.id).sort();
}

function expectConserved(before: GameState, after: GameState): void {
    const ids = liveIds(after);
    expect(ids).toEqual(liveIds(before));
    expect(new Set(ids).size).toBe(ids.length);
}

function finishDraft(seed = 42): GameState {
    let state = act(createGame(seed), { type: 'set-mode', mode: 'draft' });
    for (let pick = 0; pick < DRAFT_SEQUENCE.length; pick++) {
        const column = DRAFT_COLUMNS.find(col => state.draft.board[4][col].tile)!;
        state = act(state, { type: 'draft-pick', column });
    }
    return state;
}

function finishEncounterDraft(config: EncounterConfig = { plays: 4, redraws: 3, targetScore: 100 }, seed = 42): GameState {
    let state = act(createGame(seed), { type: 'new-encounter', config });
    for (let pick = 0; pick < DRAFT_SEQUENCE.length - 1; pick++) {
        const column = DRAFT_COLUMNS.find(col => state.draft.board[4][col].tile)!;
        state = act(state, { type: 'draft-pick', column });
    }
    return state;
}

function placeOpeningWord(state: GameState): { state: GameState; dictionary: ReadonlySet<string> } {
    const tiles = state.rack.filter((value): value is TileData => value !== null).slice(0, 2);
    const dictionary = new Set([tiles.map(tile => tile.value === '*' ? 'A' : tile.value).join('')]);
    for (const [index, tile] of tiles.entries()) {
        state = act(state, { type: 'move', tileId: tile.id, to: { zone: 'board', row: 5, col: 5 + index }, letter: 'A' });
    }
    return { state, dictionary };
}

function put(state: GameState, row: number, col: number, value: string, locked = false): void {
    state.board[row][col] = { tile: tile(`board-${row}-${col}`, value), canPlace: !locked, canTake: !locked };
}

function freeze(value: unknown): void {
    if (value && typeof value === 'object') {
        Object.values(value).forEach(freeze);
        Object.freeze(value);
    }
}

function expectRejected(state: GameState, action: GameAction, dictionary: ReadonlySet<string> | null = null): void {
    const snapshot = structuredClone(state);
    freeze(state);
    const result = applyAction(state, action, dictionary);
    expect(result.ok).toBe(false);
    expect(result.state).toBe(state);
    expect(state).toEqual(snapshot);
}

describe('physical tile ownership', () => {
    test('moves and swaps preserve physical inventory across all game-zone combinations', () => {
        let state = createGame(7);
        state.rack[0] = tile('a');
        state.rack[1] = tile('b', 'B');
        state.bag = [tile('c', 'C')];
        const start = state;
        const commands: GameAction[] = [
            { type: 'move', tileId: 'a', to: { zone: 'board', row: 5, col: 5 } },
            { type: 'move', tileId: 'b', to: { zone: 'board', row: 5, col: 6 } },
            { type: 'move', tileId: 'a', to: { zone: 'board', row: 5, col: 6 } },
            { type: 'move', tileId: 'a', to: { zone: 'rack', index: 0 } },
            { type: 'move', tileId: 'b', to: { zone: 'rack', index: 0 } },
            { type: 'move', tileId: 'b', to: { zone: 'rack', index: 3 } },
            { type: 'move', tileId: 'b', to: { zone: 'board', row: 5, col: 5 } },
            { type: 'move', tileId: 'a', to: { zone: 'rack', index: 1 } },
            { type: 'draw', count: 1 },
            { type: 'move', tileId: 'a', to: { zone: 'rack', index: 0 } },
        ];
        for (const command of commands) {
            const previous = structuredClone(state);
            freeze(state);
            const next = act(state, command);
            expect(state).toEqual(previous);
            expectConserved(start, next);
            state = next;
        }
        expect(state.board[5][5].tile?.id).toBe('b');
        expect(state.rack[0]?.id).toBe('a');
        expect(state.rack[1]?.id).toBe('c');
    });

    test('discard replaces the actual source slot immediately and redraw never deletes rack tiles', () => {
        let state = createGame(11);
        state.rack[2] = tile('old');
        state.rack[5] = tile('keep', 'E');
        state.bag = [tile('replacement', 'R'), tile('bag', 'B')];
        state.discard = [tile('discard', 'D')];
        const start = state;
        state = act(state, { type: 'discard', tileId: 'old' });
        expect(state.rack[2]?.id).toBe('replacement');
        expect(state.discard.map(value => value.id)).toEqual(['discard', 'old']);
        expectConserved(start, state);
        state = act(state, { type: 'redraw' });
        expect(state.rack[2]?.id).toBe('bag');
        expect(state.rack.filter(Boolean)).toHaveLength(2);
        expectConserved(start, state);
        state = act(state, { type: 'draw', count: 'all' });
        expect(state.rack.filter(Boolean)).toHaveLength(5);
        expect(state.bag).toEqual([]);
        expect(state.discard).toEqual([]);
        expectConserved(start, state);
    });

    test('draw-all recycles discard mid-draw; board discard uses first vacancy', () => {
        let state = createGame(12);
        state.bag = [tile('bag')];
        state.discard = [tile('d1'), tile('d2')];
        put(state, 5, 5, 'A');
        const initial = state;
        state = act(state, { type: 'draw', count: 'all' });
        expect(state.rack[0]?.id).toBe('bag');
        expect(state.rack.filter(Boolean)).toHaveLength(3);
        expect(state.board[5][5].tile?.id).toBe('board-5-5');
        state = act(state, { type: 'discard', tileId: 'board-5-5' });
        expect(state.board[5][5].tile).toBeNull();
        expect(state.rack[3]?.id).toBe('board-5-5');
        expectConserved(initial, state);
    });
});

describe('atomic rejection and blank handling', () => {
    test('locked, stale, out-of-range, mode-blocked and full-rack recall reject without consuming state or RNG', () => {
        const state = createGame(9);
        state.rack = Array.from({ length: 7 }, (_, index) => tile(`rack-${index}`));
        put(state, 5, 5, 'A', true);
        put(state, 5, 6, 'B');
        state.placementHistory = [{ tileId: 'board-5-6', position: { row: 5, col: 6 } }];
        for (const action of [
            { type: 'move', tileId: 'missing', to: { zone: 'board', row: 5, col: 4 } },
            { type: 'move', tileId: 'board-5-5', to: { zone: 'rack', index: 0 } },
            { type: 'move', tileId: 'rack-0', to: { zone: 'board', row: 5, col: 5 } },
            { type: 'move', tileId: 'rack-0', to: { zone: 'rack', index: 7 } },
            { type: 'move', tileId: 'rack-0', to: { zone: 'board', row: NaN, col: 0 } },
            { type: 'discard', tileId: 'board-5-5' },
            { type: 'discard', tileId: 'missing' },
            { type: 'recall' },
            { type: 'reset-draft' },
            { type: 'play' },
        ] satisfies GameAction[]) expectRejected(state, action);
        const draft = act(state, { type: 'set-mode', mode: 'draft' });
        expectRejected(draft, { type: 'draw', count: 'all' });
        expectRejected(draft, { type: 'reset', target: 'game' });
        expectRejected(draft, { type: 'move', tileId: 'rack-0', to: { zone: 'draft', row: 7, col: 2 } });
    });

    test('blanks require one uppercase letter and normalize on recall, swapping and discard', () => {
        let state = createGame(4);
        state.rack[0] = tile('blank', '*');
        state.rack[1] = tile('a');
        for (const letter of [undefined, '', '*', 'a', 'AB', 'É', '1']) {
            expectRejected(state, { type: 'move', tileId: 'blank', to: { zone: 'board', row: 5, col: 5 }, letter });
        }
        state = act(state, { type: 'move', tileId: 'blank', to: { zone: 'board', row: 5, col: 5 }, letter: 'Z' });
        expect(state.board[5][5].tile).toMatchObject({ value: 'Z', score: 0, displayValue: 'Z' });
        state = act(state, { type: 'move', tileId: 'blank', to: { zone: 'board', row: 5, col: 6 } });
        expect(state.board[5][6].tile?.value).toBe('Z');
        const recalled = applyAction(state, { type: 'recall' }, null);
        expect(recalled.ok).toBe(true);
        if (!recalled.ok) return;
        expect(recalled.position).toEqual({ row: 5, col: 6 });
        state = recalled.state;
        expect(state.rack[0]).toEqual(tile('blank', '*'));
        state = act(state, { type: 'move', tileId: 'a', to: { zone: 'board', row: 5, col: 5 } });
        expectRejected(state, { type: 'move', tileId: 'a', to: { zone: 'rack', index: 0 } });
        state = act(state, { type: 'move', tileId: 'a', to: { zone: 'rack', index: 0 }, letter: 'E' });
        expect(state.board[5][5].tile).toMatchObject({ id: 'blank', value: 'E', score: 0 });
        state = act(state, { type: 'move', tileId: 'a', to: { zone: 'board', row: 5, col: 5 } });
        expect(state.rack[0]).toEqual(tile('blank', '*'));
        state = act(state, { type: 'move', tileId: 'blank', to: { zone: 'board', row: 5, col: 6 }, letter: 'Q' });
        state = act(state, { type: 'discard', tileId: 'blank' });
        expect(state.rack[0]).toEqual(tile('blank', '*'));
    });

    test('recall follows current physical position, not an obsolete placement coordinate', () => {
        let state = createGame(13);
        state.rack[0] = tile('a');
        state.rack[1] = tile('b', 'B');
        state = act(state, { type: 'move', tileId: 'a', to: { zone: 'board', row: 5, col: 5 } });
        state = act(state, { type: 'move', tileId: 'b', to: { zone: 'board', row: 5, col: 6 } });
        state = act(state, { type: 'move', tileId: 'a', to: { zone: 'board', row: 5, col: 6 } });
        state = act(state, { type: 'recall' });
        expect(state.rack[0]?.id).toBe('a');
        expect(state.board[5][5].tile?.id).toBe('b');
        expect(state.board[5][6].tile).toBeNull();
        state = act(state, { type: 'recall' });
        expect(state.rack[1]?.id).toBe('b');
    });
});

describe('draft and seeded mechanics', () => {

    test('fourteen manual picks respect offers, rearrange independently, seed fresh copies once and never auto-exit or draw', () => {
        let state = act(createGame(31), { type: 'set-mode', mode: 'draft' });
        const vowels = new Set(['A', 'E', 'I', 'O', 'U', 'Y']);
        for (const [index, kind] of DRAFT_SEQUENCE.entries()) {
            const offers = DRAFT_COLUMNS.map(col => state.draft.board[4][col].tile).filter((value): value is TileData => value !== null);
            expect(offers).toHaveLength(kind === 'V' ? 2 : kind === 'C' ? 3 : 1);
            expect(new Set(offers.map(value => value.value)).size).toBe(offers.length);
            for (const offered of offers) {
                if (kind === '*') expect(offered.value).toBe('*');
                else expect(vowels.has(offered.value)).toBe(kind === 'V');
            }
            if (kind === 'V') expect(state.draft.board[4][5].tile).toBeNull();
            const column = DRAFT_COLUMNS.find(col => state.draft.board[4][col].tile)!;
            state = act(state, { type: 'draft-pick', column });
            expect(getDraftedTiles(state)).toHaveLength(index + 1);
            if (index < 13) expect(state.bag).toEqual([]);
            if (index === 0) {
                const chosen = getDraftedTiles(state)[0];
                const offerBefore = state.draft.board[4];
                const rng = state.rng;
                state = act(state, { type: 'move', tileId: chosen.id, to: { zone: 'draft', row: 8, col: 8 } });
                expect(state.draft.board[4]).toEqual(offerBefore);
                expect(state.rng).toBe(rng);
                expect(state.draft.pickIndex).toBe(1);
                expectRejected(state, { type: 'move', tileId: chosen.id, to: { zone: 'draft', row: 0, col: 0 } });
            }
        }
        expect(state.mode).toBe('draft');
        expect(state.draft.complete).toBe(true);
        expect(state.draft.seeded).toBe(true);
        expect(state.rack.filter(Boolean)).toEqual([]);
        expect(state.bag).toHaveLength(14);
        expect(state.bag.map(value => value.value).sort()).toEqual(getDraftedTiles(state).map(value => value.value).sort());
        const templateIds = new Set(getDraftedTiles(state).map(value => value.id));
        expect(state.bag.some(value => templateIds.has(value.id))).toBe(false);
        expectRejected(state, { type: 'draft-pick', column: 5 });
        expectRejected(state, { type: 'draft-reroll' });
        const bag = state.bag;
        state = act(state, { type: 'set-mode', mode: 'game' });
        state = act(state, { type: 'set-mode', mode: 'draft' });
        expect(state.bag).toEqual(bag);
    });

    test('reroll does not consume a pick and invalid offer targets do not advance randomness', () => {
        let state = act(createGame(44), { type: 'set-mode', mode: 'draft' });
        expectRejected(state, { type: 'draft-pick', column: 5 });
        expectRejected(state, { type: 'draft-pick', column: 2, to: { row: 4, col: 2 } });
        const oldIds = state.draft.board[4].map(cell => cell.tile?.id);
        state = act(state, { type: 'draft-reroll' });
        expect(state.draft.pickIndex).toBe(0);
        expect(getDraftedTiles(state)).toEqual([]);
        expect(state.draft.board[4].map(cell => cell.tile?.id)).not.toEqual(oldIds);
    });

    test('equal seeds and actions replay exactly; cosmetic shuffles cannot alter bag or draft randomness', () => {
        const run = () => {
            let state = act(finishDraft(902), { type: 'set-mode', mode: 'game' });
            for (const action of [{ type: 'draw', count: 'all' }, { type: 'redraw' }, { type: 'shuffle-bag' }] satisfies GameAction[]) state = act(state, action);
            return state;
        };
        expect(run()).toEqual(run());
        let plain = act(finishDraft(902), { type: 'set-mode', mode: 'game' });
        plain = act(plain, { type: 'draw', count: 'all' });
        let shuffled = act(plain, { type: 'shuffle-rack' });
        shuffled = act(shuffled, { type: 'shuffle-rack' });
        expect(shuffled.rng).toBe(plain.rng);
        for (let redraw = 0; redraw < 2; redraw++) {
            plain = act(plain, { type: 'redraw' });
            shuffled = act(shuffled, { type: 'redraw' });
            expect(shuffled.bag).toEqual(plain.bag);
            expect(shuffled.discard).toEqual(plain.discard);
            expect(shuffled.rack).toEqual(plain.rack);
        }
        for (const action of [{ type: 'shuffle-bag' }, { type: 'set-mode', mode: 'draft' }, { type: 'reset-draft' }, { type: 'draft-reroll' }] satisfies GameAction[]) {
            plain = act(plain, action);
            shuffled = act(shuffled, action);
        }
        expect(shuffled.bag).toEqual(plain.bag);
        expect(shuffled.draft).toEqual(plain.draft);
        expect(shuffled.rng).toBe(plain.rng);
    });

    test('reset-bag copies recipe IDs; whole reset clears discard, pending history and score', () => {
        let state = act(finishDraft(), { type: 'set-mode', mode: 'game' });
        state = act(state, { type: 'draw', count: 'all' });
        state = act(state, { type: 'move', tileId: state.rack[0]!.id, to: { zone: 'board', row: 5, col: 5 }, letter: 'A' });
        state = act(state, { type: 'discard', tileId: state.rack[1]!.id });
        const oldIds = new Set(liveIds(state));
        state = act(state, { type: 'reset', target: 'bag' });
        expect(state.bag.some(value => oldIds.has(value.id))).toBe(false);
        expect(new Set(liveIds(state)).size).toBe(liveIds(state).length);
        state.totalScore = 100;
        state = act(state, { type: 'reset', target: 'game' });
        expect(state.discard).toEqual([]);
        expect(state.placementHistory).toEqual([]);
        expect(state.rack.filter(Boolean)).toEqual([]);
        expect(state.board.flat().filter(cell => cell.tile)).toEqual([]);
        expect(state.totalScore).toBe(0);
        expect(state.bag).toHaveLength(14);
        expect(act(createGame(1), { type: 'reset', target: 'game' }).bag).toEqual([]);
    });
});

describe('play geometry and bespoke scoring', () => {
    for (const direction of ['horizontal', 'vertical'] as const) {
        test(`${direction} gaps require every bridging cell, while a complete locked bridge is valid`, () => {
            const state = createGame(1);
            const positions = direction === 'horizontal' ? [[5, 3], [5, 4], [5, 5], [5, 6]] : [[3, 5], [4, 5], [5, 5], [6, 5]];
            put(state, positions[0][0], positions[0][1], 'A');
            put(state, positions[1][0], positions[1][1], 'A', true);
            put(state, positions[3][0], positions[3][1], 'A');
            const dictionary = new Set(['AA', 'AAAA']);
            expect(areUnlockedTilesInSingleLine(state.board)).toBe(false);
            expect(evaluatePlay(state, dictionary).canPlay).toBe(false);
            expectRejected(state, { type: 'play' }, dictionary);
            const bridge = structuredClone(state);
            put(bridge, positions[2][0], positions[2][1], 'A', true);
            expect(areUnlockedTilesInSingleLine(bridge.board)).toBe(true);
            expect(evaluatePlay(bridge, dictionary).canPlay).toBe(true);
        });
    }

    test('all crossing words validate; shared tiles and stickers count per occurrence in one aggregate product', () => {
        const state = createGame(1);
        put(state, 5, 5, 'A');
        put(state, 5, 4, 'B', true);
        put(state, 4, 5, 'C', true);
        state.stickers[5][5] = { type: 'points', value: 10, consumed: false };
        state.stickers[5][4] = { type: 'multi', value: 2, consumed: false };
        state.stickers[4][5] = { type: 'points', value: 10, consumed: true };
        expect(evaluatePlay(state, new Set(['BA'])).canPlay).toBe(false);
        const evaluation = evaluatePlay(state, new Set(['BA', 'CA']));
        expect(evaluation.canPlay).toBe(true);
        expect(evaluation.score.breakdown).toEqual({ baseTilePoints: 8, stickerPoints: 20, baseTileMulti: 4, stickerMulti: 2, points: 28, multi: 6, total: 168 });
        expect(evaluation.score.totalScore).toBe(168);
    });

    test('seven new tiles add fifty once before multiplying and committed tiles lock, consume stickers and refill', () => {
        const state = createGame(5);
        for (let col = 2; col <= 8; col++) put(state, 5, col, 'A');
        put(state, 4, 5, 'B', true);
        state.stickers[5][2] = { type: 'multi', value: 2, consumed: false };
        state.bag = [tile('refill')];
        state.discard = [tile('recycle')];
        state.totalScore = 3;
        state.placementHistory = [{ tileId: 'board-5-2', position: { row: 5, col: 2 } }];
        const dictionary = new Set(['AAAAAAA', 'BA']);
        const evaluation = evaluatePlay(state, dictionary);
        expect(evaluation.canPlay).toBe(true);
        // Main word contributes seven points; BA contributes four. One bingo, nine occurrences, +2 multi.
        expect(evaluation.score.totalScore).toBe((11 + 50) * (9 + 2));
        const played = act(state, { type: 'play' }, dictionary);
        expect(played.totalScore).toBe(674);
        expect(played.board[5][2].canTake).toBe(false);
        expect(played.board[5][2].canPlace).toBe(false);
        expect(played.stickers[5][2]?.consumed).toBe(true);
        expect(played.stickers[5][5]?.consumed).toBe(true);
        expect(played.placementHistory).toEqual([]);
        expect(played.rack.filter(Boolean).map(value => value!.id)).toEqual(['refill', 'recycle']);
        expectConserved(state, played);
        expect(evaluatePlay(played, dictionary).score.totalScore).toBe(0);
        expectRejected(played, { type: 'play' }, dictionary);
        expectRejected(played, { type: 'discard', tileId: 'board-5-2' });
    });

    test('start, orthogonal contact, single letters and unavailable dictionary gate commits', () => {
        const state = createGame(1);
        put(state, 1, 1, 'A');
        put(state, 1, 2, 'A');
        const dictionary = new Set(['AA']);
        expect(evaluatePlay(state, dictionary).canPlay).toBe(false);
        state.stickers[5][5]!.consumed = true;
        put(state, 2, 3, 'A', true);
        expect(evaluatePlay(state, dictionary).canPlay).toBe(false);
        put(state, 2, 2, 'A', true);
        expect(evaluatePlay(state, dictionary).canPlay).toBe(true);
        expect(evaluatePlay(state, null).canPlay).toBe(false);
        const single = createGame(1);
        put(single, 5, 5, 'A');
        expect(evaluatePlay(single, new Set(['A'])).canPlay).toBe(false);
    });
});

describe('encounter lifecycle and budgets', () => {
    test('invalid configurations and premature lifecycle commands reject atomically', () => {
        const state = createGame(50);
        for (const [field, values] of [
            ['plays', [0, -1, 1.5, Infinity, NaN, Number.MAX_SAFE_INTEGER + 1]],
            ['redraws', [-1, 0.5, Infinity, NaN, Number.MAX_SAFE_INTEGER + 1]],
            ['targetScore', [0, -1, 0.5, Infinity, NaN, Number.MAX_SAFE_INTEGER + 1]],
        ] as const) {
            for (const value of values) {
                expectRejected(state, { type: 'new-encounter', config: { plays: 4, redraws: 3, targetScore: 100, [field]: value } });
            }
        }
        for (const type of ['start-encounter', 'retry-encounter', 'concede-encounter'] as const) expectRejected(state, { type });
        expectRejected(state, { type: 'redraw-selected', tileIds: ['absent'] });
        const draft = act(state, { type: 'new-encounter' });
        expectRejected(draft, { type: 'start-encounter' }, new Set());
        expectRejected(draft, { type: 'retry-encounter' }, new Set());
        expectRejected(draft, { type: 'concede-encounter' });
        const complete = finishEncounterDraft();
        expectRejected(complete, { type: 'start-encounter' });
        const playing = act(complete, { type: 'start-encounter' }, new Set());
        expectRejected(playing, { type: 'start-encounter' }, new Set());
        expectRejected(playing, { type: 'retry-encounter' }, new Set());
    });

    test('a missing dictionary leaves the automatically completed recipe waiting without reseeding on rearrangement or recovery', () => {
        let state = act(createGame(60), { type: 'new-encounter' });
        const offered = state.draft.board[4][2].tile!;
        state = act(state, { type: 'move', tileId: offered.id, to: { zone: 'draft', row: 8, col: 8 } });
        expect(state.draft.pickIndex).toBe(1);
        const offers = state.draft.board[4];
        const rng = state.rng;
        state = act(state, { type: 'move', tileId: offered.id, to: { zone: 'draft', row: 7, col: 2 } });
        expect(state.draft.board[4]).toEqual(offers);
        expect(state.rng).toBe(rng);
        while (!state.draft.complete) {
            const column = DRAFT_COLUMNS.find(col => state.draft.board[4][col].tile)!;
            state = act(state, { type: 'draft-pick', column });
        }
        expect(state.encounter?.status).toBe('draft');
        expect(state.mode).toBe('draft');
        expect(state.rack.filter(Boolean)).toEqual([]);
        expect(state.draft.pickIndex).toBe(14);
        expect(getDraftedTiles(state).filter(tile => tile.value === '*')).toHaveLength(1);
        const inventory = liveIds(state);
        const templateIds = new Set(getDraftedTiles(state).map(tile => tile.id));
        expect(inventory).toHaveLength(14);
        expect(inventory.some(id => templateIds.has(id))).toBe(false);
        expectRejected(state, { type: 'draft-pick', column: 5 });
        expectRejected(state, { type: 'start-encounter' });
        const recipe = getDraftedTiles(state);
        state = act(state, { type: 'move', tileId: recipe[0].id, to: { zone: 'draft', row: 8, col: 8 } }, new Set());
        expect(state.encounter?.status).toBe('draft');
        expect(state.rack.filter(Boolean)).toEqual([]);
        expect(liveIds(state)).toEqual(inventory);
        expect(getDraftedTiles(state).map(tile => tile.id).sort()).toEqual(recipe.map(tile => tile.id).sort());
        state = act(state, { type: 'start-encounter' }, new Set());
        expect(state.encounter?.status).toBe('playing');
        expect(state.mode).toBe('game');
        expect(state.rack.filter(Boolean)).toHaveLength(7);
        expect(state.bag).toHaveLength(7);
        expect(liveIds(state)).toEqual(inventory);
        expectRejected(state, { type: 'start-encounter' }, new Set());
        expectRejected(state, { type: 'draft-pick', column: 5 }, new Set());
    });

    test('the thirteenth choice auto-picks the final blank and starts identically for direct and pointer picks', () => {
        const dictionary = new Set<string>();
        let state = act(createGame(61), { type: 'new-encounter' }, dictionary);
        for (let pick = 0; pick < 12; pick++) {
            const column = DRAFT_COLUMNS.find(col => state.draft.board[4][col].tile)!;
            state = act(state, { type: 'draft-pick', column }, dictionary);
        }
        expect(getDraftedTiles(state)).toHaveLength(12);
        expect(state.bag).toEqual([]);
        expect(state.rack.filter(Boolean)).toEqual([]);
        const column = DRAFT_COLUMNS.find(col => state.draft.board[4][col].tile)!;
        const offered = state.draft.board[4][column].tile!;
        const position = { row: 8, col: 8 };
        const actions: GameAction[] = [
            { type: 'draft-pick', column, to: position },
            { type: 'move', tileId: offered.id, to: { zone: 'draft', ...position } },
        ];
        const snapshot = structuredClone(state);
        freeze(state);
        const results = actions.map(action => applyAction(state, action, dictionary));
        expect(results[0].state).toEqual(results[1].state);
        for (const result of results) {
            expect(result.ok).toBe(true);
            if (!result.ok) throw new Error(result.reason);
            const playing = result.state;
            expect(playing.encounter).toEqual({
                status: 'playing', config: { plays: 4, redraws: 3, targetScore: 100 },
                playsRemaining: 4, redrawsRemaining: 3,
            });
            expect(playing.mode).toBe('game');
            expect(playing.draft.complete).toBe(true);
            expect(playing.draft.seeded).toBe(true);
            expect(playing.draft.pickIndex).toBe(14);
            expect(playing.draft.board[8][8].tile).toEqual(offered);
            expect(playing.draft.board[8][7].tile?.value).toBe('*');
            const recipe = getDraftedTiles(playing);
            expect(recipe).toHaveLength(14);
            expect(recipe.filter(tile => tile.value === '*')).toHaveLength(1);
            expect(DRAFT_COLUMNS.every(col => playing.draft.board[4][col].tile === null)).toBe(true);
            expect(playing.rack.filter(Boolean)).toHaveLength(7);
            expect(playing.bag).toHaveLength(7);
            const inventory = [...playing.bag, ...playing.rack.filter((tile): tile is TileData => tile !== null)];
            expect(new Set(inventory.map(tile => tile.id)).size).toBe(14);
            expect(inventory.map(tile => tile.value).sort()).toEqual(recipe.map(tile => tile.value).sort());
            const recipeIds = new Set(recipe.map(tile => tile.id));
            expect(inventory.some(tile => recipeIds.has(tile.id))).toBe(false);
            expectRejected(playing, { type: 'start-encounter' }, dictionary);
            expectRejected(playing, actions[0], dictionary);
            expectRejected(playing, actions[1], dictionary);
        }
        expect(state).toEqual(snapshot);
        const waiting = act(state, actions[1]);
        expect(act(waiting, { type: 'start-encounter' }, dictionary)).toEqual(results[0].state);
    });

    test('draft and playing phases cannot bypass budgets with sandbox commands', () => {
        const draft = finishEncounterDraft();
        const playing = act(draft, { type: 'start-encounter' }, new Set());
        const debugActions: GameAction[] = [
            { type: 'draw', count: 'all' }, { type: 'discard', tileId: playing.rack[0]!.id },
            { type: 'redraw' }, { type: 'shuffle-bag' }, { type: 'set-mode', mode: 'game' },
            { type: 'set-mode', mode: 'draft' }, { type: 'draft-reroll' }, { type: 'reset-draft' },
            ...(['game', 'board', 'rack', 'bag', 'score', 'stickers'] as const).map(target => ({ type: 'reset', target } as const)),
        ];
        for (const state of [draft, playing]) {
            for (const action of debugActions) expectRejected(state, action, new Set());
        }
        const offer = getDraftedTiles(draft)[0];
        expectRejected(draft, { type: 'move', tileId: offer.id, to: { zone: 'rack', index: 0 } });
        expectRejected(draft, { type: 'shuffle-rack' });
        expectRejected(draft, { type: 'redraw-selected', tileIds: [] });
        expectRejected(playing, { type: 'draft-pick', column: 2 });
        expectRejected(playing, { type: 'move', tileId: playing.rack[0]!.id, to: { zone: 'draft', row: 7, col: 2 } });
    });

    test('only valid plays spend a play; movement, recall, shuffle and rejection are free', () => {
        const opening = act(finishEncounterDraft({ plays: 2, redraws: 0, targetScore: 10000 }), { type: 'start-encounter' }, new Set());
        let state = act(opening, { type: 'move', tileId: opening.rack[0]!.id, to: { zone: 'board', row: 5, col: 5 }, letter: 'A' });
        state = act(state, { type: 'recall' });
        state = act(state, { type: 'shuffle-rack' });
        expect(state.encounter?.playsRemaining).toBe(2);
        expectRejected(state, { type: 'move', tileId: state.rack[0]!.id, to: { zone: 'board', row: -1, col: 5 } });
        const pending = placeOpeningWord(state);
        expectRejected(pending.state, { type: 'play' });
        expectRejected(pending.state, { type: 'play' }, new Set());
        const gap = act(pending.state, { type: 'move', tileId: pending.state.board[5][6].tile!.id, to: { zone: 'board', row: 5, col: 7 } });
        expectRejected(gap, { type: 'play' }, pending.dictionary);
        const score = evaluatePlay(pending.state, pending.dictionary).score.totalScore;
        state = act(pending.state, { type: 'play' }, pending.dictionary);
        expect(state.totalScore).toBe(score);
        expect(state.encounter?.playsRemaining).toBe(1);
        expect(state.encounter?.redrawsRemaining).toBe(0);
        expect(state.encounter?.status).toBe('playing');
        expect(state.board[5][5].canTake).toBe(false);
        expect(state.stickers[5][5]?.consumed).toBe(true);
        expect(state.rack.filter(Boolean)).toHaveLength(7);
        expect(state.placementHistory).toEqual([]);
        expectConserved(opening, state);
        expectRejected(state, { type: 'play' }, pending.dictionary);
    });

    test('target success wins on the last play, while a below-target last play loses', () => {
        const config = { plays: 1, redraws: 0, targetScore: 1 };
        const draft = finishEncounterDraft(config);
        config.plays = 99;
        config.targetScore = 10000;
        const win = placeOpeningWord(act(draft, { type: 'start-encounter' }, new Set()));
        const won = act(win.state, { type: 'play' }, win.dictionary);
        expect(won.encounter?.status).toBe('won');
        expect(won.encounter?.playsRemaining).toBe(0);
        const exact = placeOpeningWord(act(finishEncounterDraft({ plays: 2, redraws: 0, targetScore: won.totalScore }), { type: 'start-encounter' }, new Set()));
        const earlyWin = act(exact.state, { type: 'play' }, exact.dictionary);
        expect(earlyWin.encounter?.status).toBe('won');
        expect(earlyWin.encounter?.playsRemaining).toBe(1);
        const loss = placeOpeningWord(act(finishEncounterDraft({ plays: 1, redraws: 3, targetScore: 10000 }), { type: 'start-encounter' }, new Set()));
        const lost = act(loss.state, { type: 'play' }, loss.dictionary);
        expect(lost.encounter?.status).toBe('lost');
        expect(lost.encounter?.playsRemaining).toBe(0);
        expect(lost.encounter?.redrawsRemaining).toBe(3);
        for (const state of [won, lost]) {
            for (const action of [
                { type: 'move', tileId: state.rack[0]!.id, to: { zone: 'board', row: 5, col: 7 } },
                { type: 'recall' }, { type: 'shuffle-rack' }, { type: 'play' },
                { type: 'redraw-selected', tileIds: [state.rack[0]!.id] },
                { type: 'reset', target: 'score' }, { type: 'concede-encounter' },
                { type: 'start-encounter' },
            ] satisfies GameAction[]) expectRejected(state, action, win.dictionary);
            expect(evaluatePlay(state, win.dictionary).canPlay).toBe(false);
            expectRejected(state, { type: 'retry-encounter' });
            expect(act(state, { type: 'retry-encounter' }, new Set()).encounter?.status).toBe('playing');
        }
    });

    test('concession blocks even a valid pending play; leaving restores sandbox but cannot resume the attempt', () => {
        const pending = placeOpeningWord(act(finishEncounterDraft(), { type: 'start-encounter' }, new Set()));
        expect(evaluatePlay(pending.state, pending.dictionary).canPlay).toBe(true);
        const ended = act(pending.state, { type: 'concede-encounter' });
        expect(ended.encounter?.status).toBe('lost');
        expect(ended.encounter?.playsRemaining).toBe(4);
        expect(evaluatePlay(ended, pending.dictionary).canPlay).toBe(false);
        expectRejected(ended, { type: 'play' }, pending.dictionary);
        const sandbox = act(ended, { type: 'enter-sandbox' });
        expect(sandbox.encounter).toBeNull();
        expectConserved(ended, sandbox);
        expect(evaluatePlay(sandbox, pending.dictionary).canPlay).toBe(true);
        expect(act(sandbox, { type: 'play' }, pending.dictionary).totalScore).toBeGreaterThan(0);
        expectRejected(sandbox, { type: 'retry-encounter' }, pending.dictionary);
        expectRejected(sandbox, { type: 'start-encounter' }, pending.dictionary);
        const playing = act(finishEncounterDraft(), { type: 'start-encounter' }, new Set());
        expect(act(playing, { type: 'enter-sandbox' }).encounter).toBeNull();
        const draft = act(createGame(1), { type: 'new-encounter' });
        const manualDraft = act(draft, { type: 'enter-sandbox' });
        expect(act(manualDraft, { type: 'draft-reroll' }).draft.pickIndex).toBe(0);
    });

    test('retry restores a fresh attempt from the same recipe and new draft abandons every old gameplay zone', () => {
        const config = { plays: 3, redraws: 2, targetScore: 10000 };
        const initial = act(finishEncounterDraft(config), { type: 'start-encounter' }, new Set());
        const pending = placeOpeningWord(initial);
        let state = act(pending.state, { type: 'play' }, pending.dictionary);
        state = act(state, { type: 'redraw-selected', tileIds: [state.rack[0]!.id] });
        state = act(state, { type: 'move', tileId: state.rack[1]!.id, to: { zone: 'board', row: 4, col: 5 }, letter: 'A' });
        const ended = act(state, { type: 'concede-encounter' });
        const previousIds = new Set(liveIds(ended));
        const recipe = getDraftedTiles(ended).map(tile => tile.value).sort();
        freeze(ended);
        const retry = act(ended, { type: 'retry-encounter' }, new Set());
        expect(retry.totalScore).toBe(0);
        expect(retry.encounter?.playsRemaining).toBe(3);
        expect(retry.encounter?.redrawsRemaining).toBe(2);
        expect(retry.board.flat().filter(cell => cell.tile)).toEqual([]);
        expect(retry.discard).toEqual([]);
        expect(retry.placementHistory).toEqual([]);
        expect(retry.stickers.flat().some(sticker => sticker?.consumed)).toBe(false);
        expect([...retry.bag, ...retry.rack.filter((tile): tile is TileData => tile !== null)].map(tile => tile.value).sort()).toEqual(recipe);
        expect(getDraftedTiles(retry)).toEqual(getDraftedTiles(ended));
        expect(liveIds(retry)).toHaveLength(14);
        expect(liveIds(retry).some(id => previousIds.has(id))).toBe(false);
        expect(retry.rng).not.toBe(ended.rng);
        for (const source of [state, ended, retry]) {
            const fresh = act(source, { type: 'new-encounter' });
            expect(fresh.encounter?.status).toBe('draft');
            expect(fresh.totalScore).toBe(0);
            expect(liveIds(fresh)).toEqual([]);
            expect(getDraftedTiles(fresh)).toEqual([]);
            expect(fresh.placementHistory).toEqual([]);
            expect(fresh.stickers.flat().some(sticker => sticker?.consumed)).toBe(false);
            expect(fresh.draft.pickIndex).toBe(0);
        }
    });
});

describe('selected encounter redraw', () => {
    test('selection spends one redraw, preserves unselected slots and pending tiles, and rejects invalid IDs atomically', () => {
        let state = act(finishEncounterDraft({ plays: 4, redraws: 1, targetScore: 100 }), { type: 'start-encounter' }, new Set());
        const pendingId = state.rack[0]!.id;
        state = act(state, { type: 'move', tileId: pendingId, to: { zone: 'board', row: 5, col: 5 }, letter: 'A' });
        const selected = [state.rack[2]!.id, state.rack[5]!.id];
        for (const tileIds of [[], [selected[0], selected[0]], [selected[0], 'stale'], [selected[0], pendingId], [state.bag[0].id]]) {
            expectRejected(state, { type: 'redraw-selected', tileIds });
        }
        const next = act(state, { type: 'redraw-selected', tileIds: selected });
        expect(next.rack[2]?.id).toBe(state.bag[0].id);
        expect(next.rack[5]?.id).toBe(state.bag[1].id);
        for (const index of [0, 1, 3, 4, 6]) expect(next.rack[index]).toEqual(state.rack[index]);
        expect(next.board).toEqual(state.board);
        expect(next.placementHistory).toEqual(state.placementHistory);
        expect(next.totalScore).toBe(state.totalScore);
        expect(next.encounter?.playsRemaining).toBe(4);
        expect(next.encounter?.redrawsRemaining).toBe(0);
        expect(next.discard.map(tile => tile.id).sort()).toEqual([...selected].sort());
        expectConserved(state, next);
        expectRejected(next, { type: 'redraw-selected', tileIds: [next.rack[2]!.id] });
    });

    test('an exhausted bag recycles a just-returned blank without changing its identity or inventing inventory', () => {
        let state = act(finishEncounterDraft({ plays: 4, redraws: 1, targetScore: 100 }), { type: 'start-encounter' }, new Set());
        const allTiles = [...state.bag, ...state.rack.filter((tile): tile is TileData => tile !== null)];
        const blank = allTiles.find(tile => tile.value === '*')!;
        // Only the blank remains in inventory; all other physical tiles are on the board.
        state.bag = [];
        state.rack = [blank, null, null, null, null, null, null];
        for (const [index, physical] of allTiles.filter(tile => tile.id !== blank.id).entries()) {
            state.board[Math.floor(index / 11)][index % 11].tile = physical;
        }
        state = act(state, { type: 'move', tileId: blank.id, to: { zone: 'board', row: 5, col: 5 }, letter: 'Z' });
        state = act(state, { type: 'recall' });
        freeze(state);
        const redrawn = act(state, { type: 'redraw-selected', tileIds: [blank.id] });
        expect(redrawn.rack[0]).toEqual(tile(blank.id, '*'));
        expect(redrawn.rack.slice(1)).toEqual([null, null, null, null, null, null]);
        expect(redrawn.encounter?.redrawsRemaining).toBe(0);
        expectConserved(state, redrawn);
    });

    test('seeded replay is exact and selection order or cosmetic rack shuffles cannot perturb mechanics', () => {
        const run = () => {
            let state = act(finishEncounterDraft(), { type: 'start-encounter' }, new Set());
            state = act(state, { type: 'redraw-selected', tileIds: [state.rack[6]!.id, state.rack[1]!.id] });
            state = act(state, { type: 'concede-encounter' });
            return act(state, { type: 'retry-encounter' }, new Set());
        };
        expect(run()).toEqual(run());
        let plain = act(finishEncounterDraft(), { type: 'start-encounter' }, new Set());
        let shuffled = act(act(plain, { type: 'shuffle-rack' }), { type: 'shuffle-rack' });
        for (let redraw = 0; redraw < 3; redraw++) {
            const selection = plain.rack.filter((tile): tile is TileData => tile !== null).map(tile => tile.id).sort().slice(0, 4);
            const reversed = act(plain, { type: 'redraw-selected', tileIds: [...selection].reverse() });
            plain = act(plain, { type: 'redraw-selected', tileIds: selection });
            expect(reversed).toEqual(plain);
            shuffled = act(shuffled, { type: 'redraw-selected', tileIds: [...selection].reverse() });
            expect(shuffled.rng).toBe(plain.rng);
            expect(shuffled.bag).toEqual(plain.bag);
            expect(shuffled.discard).toEqual(plain.discard);
            expect(shuffled.rack.filter(Boolean).map(tile => tile!.id).sort()).toEqual(plain.rack.filter(Boolean).map(tile => tile!.id).sort());
        }
        plain = act(act(plain, { type: 'concede-encounter' }), { type: 'retry-encounter' }, new Set());
        shuffled = act(act(shuffled, { type: 'concede-encounter' }), { type: 'retry-encounter' }, new Set());
        expect(shuffled.rack).toEqual(plain.rack);
        expect(shuffled.bag).toEqual(plain.bag);
        expect(shuffled.rng).toBe(plain.rng);
    });
});
