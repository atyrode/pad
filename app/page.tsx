"use client";

import { KeyboardEvent, useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import { closestCenter, DndContext } from '@dnd-kit/core';
import { Menu, Play, RotateCcw, Shuffle, X } from 'lucide-react';
import DebugMenu from '../src/components/DebugMenu';
import Board from '../src/components/Board';
import DraftTileFlight, { DraftFlight } from '../src/components/DraftTileFlight';
import Rack from '../src/components/Rack';
import DiscardSlot from '../src/components/DiscardSlot';
import LetterSelectionPopup from '../src/components/LetterSelectionPopup';
import { applyAction, createGame, DRAFT_COLUMNS, evaluatePlay, initializeEngine, type ActionResult, type GameAction, type Lexicon, type TileTarget } from '../src/game/runtime';
import type { BoardState, Position, TileData } from '../src/game/generated';
import { findTilePosition } from '../src/utils/boardUtils';
import { findFirstEmptySlot, findTileInRack } from '../src/utils/rackUtils';
import { getAllAvailableLetters } from '../src/utils/tileDefinitions';
import { loadDictionary } from '../src/utils/dictionaryUtils';
import { DropTarget, useDragAndDrop } from '../src/hooks/useDragAndDrop';
import { useKeyboardSelector } from '../src/hooks/useKeyboardSelector';

const blankLetters = getAllAvailableLetters();
const dragAccessibility = {
    screenReaderInstructions: {
        draggable: 'Drag tiles with a pointer. In the game area use arrows to select a cell, letters to place tiles, Backspace to recall, Space to shuffle, and Enter to play. In Draft type an offered letter or use 1, 2, or 3 to pick an offered column.',
    },
};

type PendingBlank = { tileId: string; destination: Position; advance: boolean };
type DraftPresentation = { flights: DraftFlight[]; board: BoardState | null };

function captureDraftRects(board: HTMLDivElement | null) {
    const rects = new Map<string, DraftFlight['from']>();
    board?.querySelectorAll<HTMLElement>('[data-board-cell][data-row="4"], [data-board-cell][data-row="7"], [data-board-cell][data-row="8"]').forEach(cell => {
        const rect = cell.getBoundingClientRect();
        rects.set(`${cell.dataset.row}-${cell.dataset.col}`, {
            left: rect.left + cell.clientLeft, top: rect.top + cell.clientTop,
            width: rect.width - 2 * cell.clientLeft, height: rect.height - 2 * cell.clientTop,
        });
    });
    return rects;
}

export default function Home() {
    const [ready, setReady] = useState(false);
    const [engineError, setEngineError] = useState<string | null>(null);
    const [engineAttempt, setEngineAttempt] = useState(0);
    useEffect(() => {
        let active = true;
        initializeEngine().then(() => {
            if (active) setReady(true);
        }, error => {
            if (active) setEngineError(error instanceof Error ? error.message : String(error));
        });
        return () => { active = false; };
    }, [engineAttempt]);
    if (ready) return <Sandbox />;
    return <div id="main" className="h-screen w-screen bg-zinc-500 flex items-center justify-center" aria-busy={!engineError}>
        {engineError && <p role="alert" className="text-sm text-zinc-100">
            Game engine unavailable. <button type="button" className="underline underline-offset-2" title={engineError}
                onClick={() => { setEngineError(null); setEngineAttempt(attempt => attempt + 1); }}>Retry</button>
        </p>}
    </div>;
}

function Sandbox() {
    // Entropy enters once at the browser boundary; every subsequent command is deterministic.
    const [state, setState] = useState(() => {
        const initial = createGame(window.crypto.getRandomValues(new Uint32Array(1))[0]);
        return applyAction(initial, { type: 'new-encounter' }, null).state;
    });
    const stateRef = useRef(state);
    const [dictionary, setDictionary] = useState<Lexicon | null>(null);
    const dictionaryRef = useRef<Lexicon | null>(null);
    const [dictionaryError, setDictionaryError] = useState<string | null>(null);
    const [dictionaryAttempt, setDictionaryAttempt] = useState(0);
    const [isDebugOpen, setIsDebugOpen] = useState(false);
    const [tileOpacity, setTileOpacity] = useState(100);
    const [showCoordinates, setShowCoordinates] = useState(false);
    const [boardCellSize, setBoardCellSize] = useState(44);
    const [pendingBlank, setPendingBlank] = useState<PendingBlank | null>(null);
    const pendingRef = useRef<PendingBlank | null>(null);
    const [discardAnim, setDiscardAnim] = useState<TileData | null>(null);
    const discardTimer = useRef<number | undefined>(undefined);
    const boardRef = useRef<HTMLDivElement>(null);
    const rackRef = useRef<HTMLDivElement>(null);
    const gameAreaRef = useRef<HTMLDivElement>(null);
    const [actionStatus, setActionStatus] = useState('');
    const [redrawTileIds, setRedrawTileIds] = useState<readonly string[] | null>(null);
    const redrawRef = useRef<readonly string[] | null>(null);
    const [draftPresentation, setDraftPresentation] = useState<DraftPresentation>({ flights: [], board: null });
    const draftPresentationRef = useRef(draftPresentation);
    const draftExitTimer = useRef<number | undefined>(undefined);
    const updateDraftPresentation = useCallback((next: DraftPresentation) => {
        draftPresentationRef.current = next;
        setDraftPresentation(next);
    }, []);
    const clearDraftPresentation = useCallback(() => {
        window.clearTimeout(draftExitTimer.current);
        draftExitTimer.current = undefined;
        const current = draftPresentationRef.current;
        if (current.flights.length || current.board) updateDraftPresentation({ flights: [], board: null });
    }, [updateDraftPresentation]);
    const finishDraftFlight = useCallback((tileId: string) => {
        const current = draftPresentationRef.current;
        if (!current.flights.some(flight => flight.tile.id === tileId)) return;
        const flights = current.flights.filter(flight => flight.tile.id !== tileId);
        updateDraftPresentation({ flights, board: current.board });
        if (!flights.length && current.board) {
            // Let the completed bag settle; the encounter has already started in the engine.
            draftExitTimer.current = window.setTimeout(() => {
                draftExitTimer.current = undefined;
                updateDraftPresentation({ flights: [], board: null });
            }, 400);
        }
    }, [updateDraftPresentation]);
    const hiddenDraftTileIds = useMemo(() => new Set(draftPresentation.flights.map(flight => flight.tile.id)), [draftPresentation.flights]);

    useEffect(() => {
        gameAreaRef.current?.focus({ preventScroll: true });
        return () => {
            window.clearTimeout(discardTimer.current);
            window.clearTimeout(draftExitTimer.current);
        };
    }, []);

    useEffect(() => {
        const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
        const resizeObserver = new ResizeObserver(clearDraftPresentation);
        if (gameAreaRef.current) resizeObserver.observe(gameAreaRef.current);
        if (boardRef.current) resizeObserver.observe(boardRef.current);
        window.addEventListener('resize', clearDraftPresentation);
        window.addEventListener('scroll', clearDraftPresentation, true);
        motion.addEventListener('change', clearDraftPresentation);
        return () => {
            resizeObserver.disconnect();
            window.removeEventListener('resize', clearDraftPresentation);
            window.removeEventListener('scroll', clearDraftPresentation, true);
            motion.removeEventListener('change', clearDraftPresentation);
        };
    }, [clearDraftPresentation]);

    function updateRedrawSelection(tileIds: readonly string[] | null) {
        redrawRef.current = tileIds;
        setRedrawTileIds(tileIds);
    }

    function canMoveTiles() {
        const encounter = stateRef.current.encounter;
        return !pendingRef.current && redrawRef.current === null &&
            (!encounter || encounter.status === 'draft' || encounter.status === 'playing');
    }

    function selectRedraw() {
        const current = stateRef.current;
        if (!canMoveTiles() || current.encounter?.status !== 'playing' ||
            current.encounter.redrawsRemaining === 0 || !current.rack.some(Boolean)) return;
        clearDraftPresentation();
        updateRedrawSelection([]);
        keyboard.resetSelector();
        drag.clearDrag();
        setActionStatus('');
        gameAreaRef.current?.focus({ preventScroll: true });
    }

    function toggleRedraw(tileId: string) {
        const selected = redrawRef.current;
        if (selected === null || !stateRef.current.rack.some(tile => tile?.id === tileId)) return;
        updateRedrawSelection(selected.includes(tileId) ? selected.filter(id => id !== tileId) : [...selected, tileId]);
    }

    function cancelRedraw() {
        updateRedrawSelection(null);
        setActionStatus('');
        gameAreaRef.current?.focus({ preventScroll: true });
    }

    function confirmRedraw() {
        const selected = redrawRef.current;
        if (selected?.length) dispatch({ type: 'redraw-selected', tileIds: selected });
    }

    function retryDictionary() {
        setDictionaryError(null);
        setDictionaryAttempt(attempt => attempt + 1);
    }

    function dispatch(action: GameAction, draggedTileId?: string): ActionResult {
        const lifecycleAction = action.type === 'new-encounter' || action.type === 'start-encounter' ||
            action.type === 'retry-encounter' || action.type === 'concede-encounter' || action.type === 'enter-sandbox';
        const resetsInput = lifecycleAction || action.type === 'set-mode' || action.type === 'reset' || action.type === 'reset-draft';
        const previous = stateRef.current;
        const draftChoice = previous.mode === 'draft' && (action.type === 'draft-pick' ||
            (action.type === 'move' && previous.draft.board[4].some(cell => cell.tile?.id === action.tileId)));
        if (!draftChoice || draftPresentationRef.current.board) clearDraftPresentation();
        if (pendingRef.current && !resetsInput) {
            return { ok: false, state: stateRef.current, reason: 'Choose a blank letter or cancel first.' };
        }
        if (redrawRef.current !== null && !resetsInput && action.type !== 'redraw-selected') {
            return { ok: false, state: stateRef.current, reason: 'Confirm the selected redraw or cancel first.' };
        }
        // Measure before committing: rapid choices need no intermediate render or animation callback.
        const draftRects = draftChoice && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
            ? captureDraftRects(boardRef.current) : null;
        const result = applyAction(previous, action, dictionaryRef.current);
        if (!result.ok) {
            setActionStatus(result.reason);
            return result;
        }
        const phaseChanged = result.state.encounter?.status !== previous.encounter?.status;
        // Event handlers always observe this transition, even before React renders it.
        stateRef.current = result.state;
        setState(result.state);
        setActionStatus('');
        if (draftRects && result.state.draft.pickIndex > previous.draft.pickIndex) {
            const chosenIds = new Set<string>();
            for (const row of [7, 8]) {
                for (let col = 2; col <= 8; col++) {
                    const tile = previous.draft.board[row][col].tile;
                    if (tile) chosenIds.add(tile.id);
                }
            }
            const flights: DraftFlight[] = [];
            for (const row of [7, 8]) {
                for (let col = 2; col <= 8; col++) {
                    const tile = result.state.draft.board[row][col].tile;
                    if (!tile || chosenIds.has(tile.id) || tile.id === draggedTileId) continue;
                    const sourceColumn = DRAFT_COLUMNS.find(column => previous.draft.board[4][column].tile?.id === tile.id);
                    const automaticBlank = sourceColumn === undefined && tile.value === '*';
                    if (sourceColumn === undefined && !automaticBlank) continue;
                    const from = draftRects.get(`4-${sourceColumn ?? 5}`);
                    const to = draftRects.get(`${row}-${col}`);
                    if (from && to) flights.push({ tile, from, to, delay: automaticBlank ? 260 : 0, duration: automaticBlank ? 400 : 290 });
                }
            }
            if (flights.length) {
                updateDraftPresentation({
                    flights: [...draftPresentationRef.current.flights, ...flights],
                    board: result.state.mode === 'game' ? result.state.draft.board : null,
                });
            }
        }
        if (resetsInput || phaseChanged) {
            updateRedrawSelection(null);
            pendingRef.current = null;
            setPendingBlank(null);
            keyboard.resetSelector();
            drag.clearDrag();
            window.clearTimeout(discardTimer.current);
            discardTimer.current = undefined;
            setDiscardAnim(null);
        }
        if (action.type === 'new-encounter') setIsDebugOpen(false);
        if (action.type === 'redraw-selected') {
            updateRedrawSelection(null);
        } else if (redrawRef.current !== null) {
            updateRedrawSelection(redrawRef.current.filter(id => result.state.rack.some(tile => tile?.id === id)));
        }
        if (action.type === 'discard' && result.tile) {
            window.clearTimeout(discardTimer.current);
            setDiscardAnim(result.tile);
            // Presentation only: discard and refill have already committed above.
            discardTimer.current = window.setTimeout(() => {
                discardTimer.current = undefined;
                setDiscardAnim(null);
            }, 180);
        }
        if (resetsInput || phaseChanged || action.type === 'draw' || action.type === 'redraw' || action.type === 'redraw-selected') {
            gameAreaRef.current?.focus({ preventScroll: true });
        }
        return result;
    }

    function requestMove(tileId: string, to: TileTarget, advance = false, dragged = false): boolean {
        if (draftPresentationRef.current.board) clearDraftPresentation();
        if (!canMoveTiles()) return false;
        const current = stateRef.current;
        if (current.mode === 'game') {
            // An occupied rack drop is the same swap as placing its tile on the source cell.
            // Reversing this blank swap gives the chooser a rack identity, never a stale slot.
            if (to.zone === 'rack' && current.rack[to.index]?.value === '*') {
                const source = findTilePosition(current.board, tileId);
                const incoming = current.rack[to.index];
                if (source && incoming) return requestMove(incoming.id, { zone: 'board', ...source });
            }
            const rackTile = current.rack.find(tile => tile?.id === tileId);
            if (rackTile?.value === '*' && to.zone === 'board') {
                // Probe the engine with a valid blank letter before opening a chooser.
                // No state is committed: locked destinations and phase guards stay engine-owned.
                const eligibility = applyAction(current, { type: 'move', tileId, to, letter: 'A' }, dictionaryRef.current);
                if (!eligibility.ok) {
                    setActionStatus(eligibility.reason);
                    return false;
                }
                const pending = { tileId, destination: { row: to.row, col: to.col }, advance };
                pendingRef.current = pending;
                setPendingBlank(pending);
                drag.clearDrag();
                return true;
            }
        }
        const result = dispatch({ type: 'move', tileId, to }, dragged ? tileId : undefined);
        if (result.ok && advance) keyboard.advanceSelector();
        return result.ok;
    }

    const keyboard = useKeyboardSelector({
        isEnabled: () => stateRef.current.mode === 'game' && canMoveTiles(),
        getBoard: () => stateRef.current.board,
        onLetterInput: (letter, position) => {
            const rack = stateRef.current.rack;
            const tile = rack.find(candidate => candidate?.value.toUpperCase() === letter)
                ?? rack.find(candidate => candidate?.value === '*');
            return !!tile && dispatch({ type: 'move', tileId: tile.id, to: { zone: 'board', ...position }, letter }).ok;
        },
        onBackspace: () => {
            const result = dispatch({ type: 'recall' });
            return { success: result.ok, position: result.ok ? result.position : undefined };
        },
        onShuffle: () => { dispatch({ type: 'shuffle-rack' }); },
        onPlay: () => { dispatch({ type: 'play' }); },
        onDiscard: position => {
            const current = stateRef.current;
            if (current.encounter) {
                selectRedraw();
                return;
            }
            const tile = position ? current.board[position.row][position.col].tile : current.rack.find(Boolean);
            if (tile) dispatch({ type: 'discard', tileId: tile.id });
        },
    });

    const drag = useDragAndDrop({
        getState: () => stateRef.current,
        isEnabled: canMoveTiles,
        onDrop: (tileId: string, target: DropTarget) => {
            if (target.zone === 'discard') {
                dispatch(stateRef.current.encounter
                    ? { type: 'redraw-selected', tileIds: [tileId] }
                    : { type: 'discard', tileId });
            }
            else requestMove(tileId, target, false, true);
        },
    });
    const onDictionaryReady = useEffectEvent((loaded: Lexicon) => {
        dictionaryRef.current = loaded;
        setDictionary(loaded);
        setDictionaryError(null);
        if (stateRef.current.encounter?.status === 'draft' && stateRef.current.draft.complete) {
            dispatch({ type: 'start-encounter' });
        }
    });

    useEffect(() => {
        let active = true;
        loadDictionary().then(loaded => {
            if (active) onDictionaryReady(loaded);
        }, error => {
            if (active) setDictionaryError(error instanceof Error ? error.message : 'Dictionary could not be loaded.');
        });
        return () => { active = false; };
    }, [dictionaryAttempt]);


    function handleSurfaceKeyDown(event: KeyboardEvent<HTMLDivElement>) {
        if (draftPresentationRef.current.board) clearDraftPresentation();
        const nativeTarget = !(event.target instanceof HTMLElement) ||
            !!event.target.closest('input, textarea, select, button, a, summary, [contenteditable]:not([contenteditable="false"])');
        if (!nativeTarget && !event.defaultPrevented && !event.ctrlKey && !event.metaKey &&
            !event.altKey && !event.shiftKey && !event.nativeEvent.isComposing) {
            const encounter = stateRef.current.encounter;
            if (event.key === 'Enter' && (encounter?.status === 'won' || encounter?.status === 'lost')) {
                event.preventDefault();
                dispatch({ type: 'retry-encounter' });
                return;
            }
            if (encounter?.status === 'playing' && /^[1-7]$/.test(event.key) && redrawRef.current === null) {
                selectRedraw();
            }
        }
        if (redrawRef.current !== null) {
            if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey || event.nativeEvent.isComposing) return;
            if (!(event.target instanceof HTMLElement) || event.target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])')) return;
            if (event.key === 'Escape') {
                event.preventDefault();
                cancelRedraw();
                return;
            }
            if (event.target.closest('button, a, summary')) return;
            const slot = /^[1-7]$/.test(event.key) ? Number(event.key) - 1 : -1;
            if (slot !== -1) {
                event.preventDefault();
                const tile = stateRef.current.rack[slot];
                if (tile) toggleRedraw(tile.id);
            } else if (event.key === 'Enter') {
                event.preventDefault();
                confirmRedraw();
            }
            return;
        }
        if (!canMoveTiles()) return;
        if (stateRef.current.mode === 'game') {
            keyboard.handleKeyDown(event);
            return;
        }
        if (pendingRef.current || event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.nativeEvent.isComposing) return;
        if (!(event.target instanceof HTMLElement) || event.target.closest('input, textarea, select, button, a, summary, [contenteditable]:not([contenteditable="false"])')) return;
        const isLetter = /^[a-zA-Z]$/.test(event.key);
        if (event.shiftKey && !isLetter) return;
        const choice = isLetter
            ? DRAFT_COLUMNS.findIndex(column => stateRef.current.draft.board[4][column].tile?.value.toUpperCase() === event.key.toUpperCase())
            : ['1', '2', '3'].indexOf(event.key);
        if (choice !== -1) {
            event.preventDefault();
            dispatch({ type: 'draft-pick', column: DRAFT_COLUMNS[choice] });
        }
    }

    function handleBoardRightClick(tile: TileData, position: Position): boolean {
        if (!canMoveTiles()) return false;
        const current = stateRef.current;
        if (current.mode === 'draft') {
            if (position.row !== 4 || current.draft.board[4][position.col].tile?.id !== tile.id) return false;
            return dispatch({ type: 'draft-pick', column: position.col }).ok;
        }
        const index = findFirstEmptySlot(current.rack);
        return index !== null && requestMove(tile.id, { zone: 'rack', index });
    }

    function closeBlank() {
        pendingRef.current = null;
        setPendingBlank(null);
        drag.clearDrag();
    }

    function selectBlank(letter: string) {
        const pending = pendingRef.current;
        if (!pending) return;
        closeBlank();
        const current = stateRef.current;
        if (!canMoveTiles() || current.mode !== 'game' || !current.rack.some(tile => tile?.id === pending.tileId && tile.value === '*')) return;
        const result = dispatch({ type: 'move', tileId: pending.tileId,
            to: { zone: 'board', ...pending.destination }, letter });
        if (result.ok && pending.advance) keyboard.advanceSelector();
    }

    const isDraftMode = state.mode === 'draft';
    const showDraftBoard = isDraftMode || draftPresentation.board !== null;
    const evaluation = useMemo(() => evaluatePlay(state, dictionary), [state, dictionary]);
    const finished = state.encounter?.status === 'won' || state.encounter?.status === 'lost';
    const canShuffle = !finished && redrawTileIds === null && state.rack.filter(Boolean).length > 1;
    const canPlay = finished ? dictionary !== null : redrawTileIds !== null ? redrawTileIds.length > 0 : evaluation.canPlay;
    const status = actionStatus || (draftPresentation.board ? 'Completing draft. Encounter ready; any game input continues immediately.' : finished
        ? state.encounter?.status === 'won' ? 'Target reached. Your attempt is complete.' : 'Attempt ended.'
        : redrawTileIds !== null ? 'Unselected rack tiles keep their slots. Recycled tiles may return with the same letter.'
        : isDraftMode
            ? state.draft.complete ? state.encounter ? 'Bag ready. Waiting for the dictionary to start automatically.' : 'Draft complete. Exit Draft and Draw All when ready.'
                : `Draft choice ${state.draft.pickIndex + 1} of ${state.encounter ? 13 : 14}. Type an offered letter or choose a column.`
            : evaluation.reason || `Ready to play for ${evaluation.score.totalScore} points.`);

    return (
        <div id="main" className="relative h-screen w-screen bg-zinc-500 flex">
            <div className="contents" inert={pendingBlank !== null}>
                <DndContext sensors={drag.sensors} collisionDetection={closestCenter} accessibility={dragAccessibility}
                    onDragStart={event => { clearDraftPresentation(); drag.handleDragStart(event); }} onDragOver={drag.handleDragOver}
                    onDragEnd={drag.handleDragEnd} onDragCancel={drag.handleDragCancel}>
                    <button type="button" aria-label={isDebugOpen ? 'Close debug menu' : 'Open debug menu'}
                        aria-expanded={isDebugOpen} aria-controls="debug-panel"
                        onClick={() => { clearDraftPresentation(); setIsDebugOpen(open => !open); }}
                        className="absolute left-4 top-4 z-30 flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-500 bg-zinc-600 text-zinc-100 transition-colors hover:bg-zinc-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-200">
                        {isDebugOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
                    </button>
                    <aside id="debug-panel" aria-label="Debug controls" aria-hidden={!isDebugOpen} inert={!isDebugOpen}
                        className="h-full shrink-0 overflow-hidden bg-zinc-600 transition-[width] duration-300 ease-in-out motion-reduce:transition-none"
                        style={{ width: isDebugOpen ? '33.333333%' : 0 }}>
                        <div className={`h-full transition-[opacity,transform] duration-300 ease-in-out motion-reduce:transition-none ${isDebugOpen ? 'translate-x-0 opacity-100' : '-translate-x-3 opacity-0'}`}
                            style={{ width: 'calc(100vw / 3)' }}>
                            <DebugMenu state={state} dispatch={dispatch} evaluation={evaluation} dictionary={dictionary}
                                dictionaryError={dictionaryError} onRetryDictionary={retryDictionary} tileOpacity={tileOpacity} setTileOpacity={setTileOpacity}
                                showCoordinates={showCoordinates} setShowCoordinates={setShowCoordinates} />
                        </div>
                    </aside>
                    <div ref={gameAreaRef} id="game-area" role="region" tabIndex={0}
                        aria-label={isDraftMode ? 'Draft area' : 'Game area'} aria-describedby="game-status"
                        data-mode={state.mode} onKeyDown={handleSurfaceKeyDown}
                        onPointerDown={event => {
                            if (draftPresentationRef.current.board) clearDraftPresentation();
                            if (event.target instanceof HTMLElement && !event.target.closest('input, textarea, select, button, a, summary, [contenteditable]:not([contenteditable="false"])')) {
                                event.currentTarget.focus({ preventScroll: true });
                            }
                        }}
                        className="min-w-0 flex-1 bg-zinc-500 flex flex-col items-center justify-center gap-3"
                        style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
                        <p id="game-status" role="status" aria-live="polite" className="sr-only">
                            {dictionaryError ? `Dictionary unavailable: ${dictionaryError}` : dictionary === null ? 'Loading dictionary.' : status}
                        </p>
                        {dictionaryError && (
                            <p role="alert" className="text-sm text-zinc-100">
                                Dictionary unavailable. <button type="button" onClick={retryDictionary} className="underline underline-offset-2">Retry</button>
                            </p>
                        )}
                        {!showDraftBoard && state.encounter && (
                            <div aria-label="Encounter progress" className="flex items-center gap-5 text-sm tabular-nums text-zinc-100">
                                <span className={finished ? state.encounter.status === 'won' ? 'text-green-200' : 'text-red-200' : undefined}>{state.totalScore} / {state.encounter.config.targetScore}</span>
                                <span>{state.encounter.playsRemaining} plays</span>
                                <span>{state.encounter.redrawsRemaining} redraws</span>
                            </div>
                        )}
                        <div className="contents" inert={finished || redrawTileIds !== null || draftPresentation.board !== null}>
                        <Board variant={showDraftBoard ? 'draft' : 'game'} board={draftPresentation.board ?? (isDraftMode ? state.draft.board : state.board)}
                            maxWidth={showDraftBoard ? 'min(95%, calc(100dvh - 48px))' : 'min(95%, calc(100dvh - 136px))'}
                            onCellSizeChange={setBoardCellSize} overRackIndex={drag.overRackIndex}
                            boardRef={boardRef} rackRef={rackRef} gameAreaRef={gameAreaRef}
                            onRightClick={handleBoardRightClick} stickers={showDraftBoard ? undefined : state.stickers}
                            tileOpacity={tileOpacity} hiddenTileIds={hiddenDraftTileIds} showCoordinates={showCoordinates}
                            selectedCell={showDraftBoard ? null : keyboard.selectedCell}
                            selectorDirection={showDraftBoard ? null : keyboard.selectorDirection} />
                        </div>
                        {!showDraftBoard && (
                            <div className="relative shrink-0 animate-[fadeIn_160ms_ease-out] motion-reduce:animate-none">
                                <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2">
                                    <DiscardSlot tileSize={boardCellSize}
                                        redraw={state.encounter !== null}
                                        disabled={finished || (state.encounter !== null && state.encounter.redrawsRemaining === 0)}
                                        selecting={redrawTileIds !== null}
                                        onActivate={state.encounter ? () => redrawRef.current === null ? selectRedraw() : redrawRef.current.length ? confirmRedraw() : cancelRedraw() : undefined} />
                                </div>
                                {discardAnim && (
                                    <div className="pointer-events-none absolute" aria-hidden="true"
                                        style={{ left: -boardCellSize - 8, top: '50%', transform: 'translateY(-50%)',
                                            width: boardCellSize - 2, height: boardCellSize - 2, animation: 'fadeIn 180ms ease reverse forwards' }}>
                                        <div className="w-full h-full bg-zinc-800 border border-zinc-600 rounded-lg flex items-center justify-center text-white font-bold">
                                            {discardAnim.displayValue || discardAnim.value}
                                        </div>
                                    </div>
                                )}
                                <div inert={finished}>
                                <Rack rack={state.rack} boardCellSize={boardCellSize}
                                    redrawTileIds={redrawTileIds ?? undefined}
                                    onToggleRedraw={redrawTileIds !== null ? toggleRedraw : undefined}
                                    overBoardPos={drag.activeId && findTileInRack(state.rack, drag.activeId) !== null ? drag.overBoardPos : null}
                                    overRackIndex={drag.overRackIndex} boardRef={boardRef} rackRef={rackRef} gameAreaRef={gameAreaRef}
                                    selectedCell={keyboard.selectedCell} onRackRightClick={tile => {
                                        const position = keyboard.getSelectedCell();
                                        return !!position && requestMove(tile.id, { zone: 'board', ...position }, true);
                                    }} />
                                </div>
                                <button type="button" onClick={() => dispatch({ type: 'shuffle-rack' })} disabled={!canShuffle}
                                    aria-label="Shuffle rack"
                                    className={`absolute left-full ml-2 top-1/2 -translate-y-1/2 p-2 border rounded-lg transition-colors duration-200 flex items-center justify-center ${canShuffle
                                        ? 'bg-zinc-600 hover:bg-zinc-500 border-zinc-500 cursor-pointer'
                                        : 'bg-zinc-600 border-zinc-500 cursor-not-allowed opacity-50'}`}
                                    title={canShuffle ? 'Shuffle rack' : 'Shuffle unavailable'}>
                                    <Shuffle className="w-5 h-5 text-white" />
                                </button>
                                <button type="button" onClick={() => finished ? dispatch({ type: 'retry-encounter' }) : redrawTileIds !== null ? confirmRedraw() : dispatch({ type: 'play' })} disabled={!canPlay}
                                    aria-label={finished ? 'Retry same bag' : redrawTileIds !== null ? 'Redraw selected tiles' : 'Play'}
                                    className={`absolute left-full ml-14 top-1/2 -translate-y-1/2 p-2 border rounded-lg transition-colors duration-200 flex items-center justify-center ${canPlay
                                        ? 'bg-green-600 hover:bg-green-500 border-green-500 cursor-pointer'
                                        : 'bg-zinc-600 border-zinc-500 cursor-not-allowed opacity-50'}`}
                                    title={finished ? 'Retry same bag' : redrawTileIds !== null ? 'Redraw selected tiles' : canPlay ? `Play for ${evaluation.score.totalScore} points` : 'Play unavailable'}>
                                    {finished ? <RotateCcw className="w-5 h-5 text-white" /> : <Play className="w-5 h-5 text-white" />}
                                </button>
                            </div>
                        )}
                    </div>
                </DndContext>
            </div>
            {draftPresentation.flights.map(flight => <DraftTileFlight key={flight.tile.id} flight={flight} onFinish={finishDraftFlight} />)}
            {pendingBlank && <LetterSelectionPopup availableLetters={blankLetters} onSelect={selectBlank} onCancel={closeBlank} returnFocusRef={gameAreaRef} />}
        </div>
    );
}
