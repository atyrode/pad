import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import * as wasm from '../src/game/runtime';
import type { GameAction, GameState, PlayEvaluation } from '../src/game/generated';

await wasm.initializeEngine(await Bun.file(new URL('../src/generated/engine/interstice_engine_bg.wasm', import.meta.url)).arrayBuffer());
const referenceIndex = process.argv.indexOf('--reference');
// The compatibility module is selected by the caller at runtime, not shipped with the app.
const reference = referenceIndex === -1 ? null : await import(pathToFileURL(resolve(process.argv[referenceIndex + 1])).href) as Pick<typeof wasm, 'createGame' | 'applyAction' | 'evaluatePlay'>;
const nativePath = resolve(process.env.CARGO_TARGET_DIR ?? 'target', `release/engine-cli${process.platform === 'win32' ? '.exe' : ''}`);
const native = Bun.spawn([nativePath], { stdin: 'pipe', stdout: 'pipe', stderr: 'pipe' });
const fixtureIndex = process.argv.indexOf('--browser-fixture');
const browserTraces: { seed: number; actions: GameAction[]; dictionary: string[]; expected: string }[] = [];
const browserCases: { state: GameState; action: GameAction; dictionary: string[] | null; expected: string }[] = [];

function canonical(value: unknown): string {
    if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
    if (value !== null && typeof value === 'object') {
        return `{${Object.entries(value).sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
            .map(([key, entry]) => `${JSON.stringify(key)}:${canonical(entry)}`).join(',')}}`;
    }
    return JSON.stringify(value);
}
const errors = new Response(native.stderr).text();

async function* responses() {
    const reader = native.stdout.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    try {
        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            let newline: number;
            while ((newline = buffer.indexOf('\n')) !== -1) {
                yield JSON.parse(buffer.slice(0, newline)) as unknown;
                buffer = buffer.slice(newline + 1);
            }
        }
        assert.equal(buffer.trim(), '', 'native response must end at a line boundary');
    } finally { reader.releaseLock(); }
}
const replies = responses();
async function query(request: unknown) {
    native.stdin.write(JSON.stringify(request) + '\n');
    await native.stdin.flush();
    const reply = await replies.next();
    assert.equal(reply.done, false, 'native engine exited before replying');
    return reply.value;
}

// This deliberately permissive synthetic lexicon tests mechanics, not French balance.
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const words = [...alphabet].flatMap(left => [...alphabet].map(right => left + right));
words.push('AAAAAAA', 'ABCDEFG', 'AB', 'ABA', 'BA', 'BAB');
const dictionary = new Set(words);
let transitions = 0;
const seeds = [0, 1, 5, 42, 0x7fffffff, 0xffffffff, ...Array.from({ length: 32 }, (_, index) => Math.imul(index + 1, 0x9e3779b9) >>> 0)];

try {
    for (const seed of seeds) {
        let state = wasm.createGame(seed);
        let oldState = reference?.createGame(seed);
        if (oldState) assert.deepEqual(state, oldState, `initial reference seed ${seed}`);
        const initial = structuredClone(state);
        const actions: GameAction[] = [];
        const steps: { result: wasm.ActionResult; evaluation: PlayEvaluation }[] = [];
        let policyRng = (seed ^ 0xa511e9b3) >>> 0;
        const choose = (length: number) => {
            policyRng ^= policyRng << 13;
            policyRng ^= policyRng >>> 17;
            policyRng ^= policyRng << 5;
            return (policyRng >>> 0) % length;
        };
        function act(action: GameAction) {
            const before = structuredClone(state);
            const result = wasm.applyAction(state, action, dictionary);
            assert.deepEqual(state, before, 'Wasm must not mutate the caller snapshot');
            if (!result.ok) assert.equal(result.state, state, 'rejection retains snapshot identity');
            if (reference && oldState) {
                const expected = reference.applyAction(oldState, action, dictionary);
                assert.deepEqual(result, expected, `reference action ${actions.length}, seed ${seed}: ${JSON.stringify(action)}`);
                oldState = expected.state;
            }
            state = result.state;
            const evaluation = wasm.evaluatePlay(state, dictionary);
            if (reference && oldState) assert.deepEqual(evaluation, reference.evaluatePlay(oldState, dictionary), `reference evaluation seed ${seed}, action ${actions.length}`);
            actions.push(action);
            steps.push({ result, evaluation });
            transitions++;
        }
        function draft() {
            while (!state.draft.complete) {
                const columns = wasm.DRAFT_COLUMNS.filter(column => state.draft.board[4][column].tile);
                const column = columns[choose(columns.length)];
                if (choose(2)) act({ type: 'draft-pick', column });
                else {
                    const slots = [7, 8].flatMap(row => Array.from({ length: 7 }, (_, index) => ({ row, col: index + 2 })))
                        .filter(position => !state.draft.board[position.row][position.col].tile);
                    act({ type: 'move', tileId: state.draft.board[4][column].tile!.id, to: { zone: 'draft', ...slots[choose(slots.length)] } });
                }
            }
        }
        act({ type: 'set-mode', mode: 'draft' });
        act({ type: 'draft-reroll' });
        draft();
        act({ type: 'set-mode', mode: 'game' });
        act({ type: 'draw', count: 'all' });
        for (let step = 0; step < 96; step++) {
            const tiles = [...state.rack.filter(Boolean), ...state.board.flat().map(cell => cell.tile).filter(Boolean)];
            const id = tiles.length && choose(5) ? tiles[choose(tiles.length)]!.id : 'stale-tile';
            const row = choose(13) - 1;
            const col = choose(13) - 1;
            const candidates: GameAction[] = [
                { type: 'move', tileId: id, to: { zone: 'board', row, col }, letter: choose(2) ? 'A' : undefined },
                { type: 'move', tileId: id, to: { zone: 'rack', index: choose(9) - 1 }, letter: 'B' },
                { type: 'recall' }, { type: 'discard', tileId: id }, { type: 'play' },
                { type: 'draw', count: choose(2) ? 1 : 'all' }, { type: 'redraw' },
                { type: 'shuffle-rack' }, { type: 'shuffle-bag' },
                { type: 'reset', target: (['board', 'rack', 'bag', 'score', 'stickers', 'game'] as const)[choose(6)] },
            ];
            act(candidates[choose(candidates.length)]);
        }
        act({ type: 'new-encounter', config: { plays: 4, redraws: 3, targetScore: seed % 2 ? 1 : 100 } });
        act({ type: 'draw', count: 'all' });
        act({ type: 'start-encounter' });
        draft();
        for (const [index, col] of [5, 6].entries()) {
            const tile = state.rack[index]!;
            act({ type: 'move', tileId: tile.id, to: { zone: 'board', row: 5, col }, letter: tile.value === '*' ? 'A' : tile.value });
        }
        act({ type: 'play' });
        act({ type: 'redraw-selected', tileIds: [] });
        const selected = state.rack.filter(Boolean).slice(0, 2).map(tile => tile!.id);
        act({ type: 'redraw-selected', tileIds: [...selected, selected[0]] });
        act({ type: 'redraw-selected', tileIds: selected });
        act({ type: 'concede-encounter' });
        act({ type: 'play' });
        act({ type: 'retry-encounter' });
        act({ type: 'shuffle-rack' });
        act({ type: 'enter-sandbox' });
        act({ type: 'set-mode', mode: 'draft' });
        act({ type: 'reset-draft' });
        const actual = await query({ op: 'trace', seed, actions, dictionary: words });
        assert.deepEqual(actual, { initial, steps }, `native/Wasm trace seed ${seed}`);
        if (fixtureIndex !== -1) browserTraces.push({ seed, actions, dictionary: words, expected: createHash('sha256').update(canonical(actual)).digest('hex') });
    }

    // Explicit dictionary absence and invalid finite encounter budgets.
    let state = wasm.createGame(61);
    const special: { action: GameAction; dictionary: Set<string> | null }[] = [
        { action: { type: 'new-encounter', config: { plays: 0, redraws: 3, targetScore: 100 } }, dictionary: null },
        { action: { type: 'new-encounter', config: { plays: 4.5, redraws: 3, targetScore: 100 } }, dictionary: null },
        { action: { type: 'new-encounter', config: { plays: 4, redraws: -1, targetScore: 100 } }, dictionary: null },
        { action: { type: 'new-encounter' }, dictionary: null },
        ...Array.from({ length: 13 }, () => ({ action: { type: 'draft-pick', column: 2 } as GameAction, dictionary: null })),
        { action: { type: 'start-encounter' }, dictionary: null },
        { action: { type: 'start-encounter' }, dictionary },
    ];
    for (const entry of special) {
        const result = wasm.applyAction(state, entry.action, entry.dictionary);
        if (reference) assert.deepEqual(result, reference.applyAction(state as GameState, entry.action, entry.dictionary));
        assert.deepEqual(await query({ op: 'apply', state, action: entry.action, dictionary: entry.dictionary ? [...entry.dictionary] : null }), result);
        if (fixtureIndex !== -1) browserCases.push({ state, action: entry.action, dictionary: entry.dictionary ? [...entry.dictionary] : null, expected: createHash('sha256').update(canonical(result)).digest('hex') });
        state = result.state;
        transitions++;
    }
    if (fixtureIndex !== -1) await Bun.write(process.argv[fixtureIndex + 1], JSON.stringify({ traces: browserTraces, cases: browserCases }));
    console.log(`Matched ${transitions} transitions and seeded evaluations across native Rust, Wasm${reference ? ' and the reference engine' : ''} (${seeds.length} seeds).`);
} finally {
    native.stdin.end();
    const code = await native.exited;
    const stderr = await errors;
    assert.equal(code, 0, stderr);
}
