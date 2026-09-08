import { describe, expect, test } from 'bun:test';
import type { TileData } from '../types/tile';
import { areUnlockedTilesInSingleLine } from '../utils/boardUtils';
import { generateUniqueTiles } from '../utils/draftBoardUtils';
import { getTileDefinition } from '../utils/tileDefinitions';
import { applyAction, createGame, DRAFT_COLUMNS, DRAFT_SEQUENCE, evaluatePlay, getDraftedTiles, type GameAction, type GameState } from './game';

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
    test('oversized distinct sampling rejects instead of looping forever', () => {
        expect(() => generateUniqueTiles(7, 'vowel', () => 0, () => 'preview')).toThrow(RangeError);
        expect(() => generateUniqueTiles(21, 'consonant', () => 0, () => 'preview')).toThrow(RangeError);
        const vowels = generateUniqueTiles(6, 'vowel', () => 0, () => 'preview');
        expect(new Set(vowels.map(value => value.value))).toEqual(new Set(['A', 'E', 'I', 'O', 'U', 'Y']));
    });

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
