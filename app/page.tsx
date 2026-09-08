"use client";

import { KeyboardEvent, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { closestCenter, DndContext } from '@dnd-kit/core';
import { Play, Shuffle } from 'lucide-react';
import DebugMenu from '../src/components/DebugMenu';
import Board from '../src/components/Board';
import Rack from '../src/components/Rack';
import DiscardSlot from '../src/components/DiscardSlot';
import LetterSelectionPopup from '../src/components/LetterSelectionPopup';
import { ActionResult, applyAction, createGame, DRAFT_COLUMNS, evaluatePlay, GameAction, TileTarget } from '../src/game/game';
import { Position } from '../src/types/board';
import { TileData } from '../src/types/tile';
import { findTilePosition } from '../src/utils/boardUtils';
import { findFirstEmptySlot, findTileInRack } from '../src/utils/rackUtils';
import { getAllAvailableLetters } from '../src/utils/tileDefinitions';
import { loadDictionary } from '../src/utils/dictionaryUtils';
import { DropTarget, useDragAndDrop } from '../src/hooks/useDragAndDrop';
import { useKeyboardSelector } from '../src/hooks/useKeyboardSelector';

const subscribeToClient = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;
const blankLetters = getAllAvailableLetters();
const dragAccessibility = {
    screenReaderInstructions: {
        draggable: 'Drag tiles with a pointer. In the game area use arrows to select a cell, letters to place tiles, Backspace to recall, Space to shuffle, and Enter to play. In Draft use 1, 2, or 3 to pick an offered column.',
    },
};

type PendingBlank = { tileId: string; destination: Position; advance: boolean };

export default function Home() {
    const ready = useSyncExternalStore(subscribeToClient, clientSnapshot, serverSnapshot);
    return ready ? <Sandbox /> : <div id="main" className="h-screen w-screen bg-zinc-500 flex" aria-busy="true" />;
}

function Sandbox() {
    // Entropy enters once at the browser boundary; every subsequent command is deterministic.
    const [state, setState] = useState(() => createGame(window.crypto.getRandomValues(new Uint32Array(1))[0]));
    const stateRef = useRef(state);
    const [dictionary, setDictionary] = useState<ReadonlySet<string> | null>(null);
    const dictionaryRef = useRef<ReadonlySet<string> | null>(null);
    const [dictionaryError, setDictionaryError] = useState<string | null>(null);
    const [dictionaryAttempt, setDictionaryAttempt] = useState(0);
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

    useEffect(() => {
        let active = true;
        loadDictionary().then(loaded => {
            if (!active) return;
            dictionaryRef.current = loaded;
            setDictionary(loaded);
            setDictionaryError(null);
        }, error => {
            if (active) setDictionaryError(error instanceof Error ? error.message : 'Dictionary could not be loaded.');
        });
        return () => { active = false; };
    }, [dictionaryAttempt]);

    useEffect(() => {
        gameAreaRef.current?.focus({ preventScroll: true });
        return () => { window.clearTimeout(discardTimer.current); };
    }, []);

    function dispatch(action: GameAction): ActionResult {
        const resetsInput = action.type === 'set-mode' || action.type === 'reset' || action.type === 'reset-draft';
        if (pendingRef.current && !resetsInput) {
            return { ok: false, state: stateRef.current, reason: 'Choose a blank letter or cancel first.' };
        }
        const result = applyAction(stateRef.current, action, dictionaryRef.current);
        if (!result.ok) {
            setActionStatus(result.reason);
            return result;
        }
        // Event handlers always observe this transition, even before React renders it.
        stateRef.current = result.state;
        setState(result.state);
        setActionStatus('');
        if (resetsInput) {
            pendingRef.current = null;
            setPendingBlank(null);
            keyboard.resetSelector();
            drag.clearDrag();
            window.clearTimeout(discardTimer.current);
            discardTimer.current = undefined;
            setDiscardAnim(null);
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
        if (resetsInput || action.type === 'draw' || action.type === 'redraw') {
            gameAreaRef.current?.focus({ preventScroll: true });
        }
        return result;
    }

    function requestMove(tileId: string, to: TileTarget, advance = false): boolean {
        if (pendingRef.current) return false;
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
                const cell = current.board[to.row]?.[to.col];
                if (!cell?.canPlace || (cell.tile && !cell.canTake)) return false;
                const pending = { tileId, destination: { row: to.row, col: to.col }, advance };
                pendingRef.current = pending;
                setPendingBlank(pending);
                drag.clearDrag();
                return true;
            }
        }
        const result = dispatch({ type: 'move', tileId, to });
        if (result.ok && advance) keyboard.advanceSelector();
        return result.ok;
    }

    const keyboard = useKeyboardSelector({
        isEnabled: () => stateRef.current.mode === 'game' && !pendingRef.current,
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
            const tile = position ? current.board[position.row][position.col].tile : current.rack.find(Boolean);
            if (tile) dispatch({ type: 'discard', tileId: tile.id });
        },
    });

    const drag = useDragAndDrop({
        getState: () => stateRef.current,
        isEnabled: () => !pendingRef.current,
        onDrop: (tileId: string, target: DropTarget) => {
            if (target.zone === 'discard') dispatch({ type: 'discard', tileId });
            else requestMove(tileId, target);
        },
    });

    function handleSurfaceKeyDown(event: KeyboardEvent<HTMLDivElement>) {
        if (stateRef.current.mode === 'game') {
            keyboard.handleKeyDown(event);
            return;
        }
        if (pendingRef.current || event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey || event.nativeEvent.isComposing) return;
        if (!(event.target instanceof HTMLElement) || event.target.closest('input, textarea, select, button, a, summary, [contenteditable]:not([contenteditable="false"])')) return;
        const choice = ['1', '2', '3'].indexOf(event.key);
        if (choice !== -1) {
            event.preventDefault();
            dispatch({ type: 'draft-pick', column: DRAFT_COLUMNS[choice] });
        }
    }

    function handleBoardRightClick(tile: TileData, position: Position): boolean {
        if (pendingRef.current) return false;
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
        if (current.mode !== 'game' || !current.rack.some(tile => tile?.id === pending.tileId && tile.value === '*')) return;
        const result = dispatch({ type: 'move', tileId: pending.tileId,
            to: { zone: 'board', ...pending.destination }, letter });
        if (result.ok && pending.advance) keyboard.advanceSelector();
    }

    const isDraftMode = state.mode === 'draft';
    const evaluation = evaluatePlay(state, dictionary);
    const canShuffle = state.rack.filter(Boolean).length > 1;
    const status = actionStatus || (isDraftMode
        ? state.draft.complete ? 'Draft complete. Exit Draft and Draw All when ready.' : `Draft pick ${state.draft.pickIndex + 1} of 14. Use 1, 2, or 3 for the offered columns.`
        : dictionaryError || evaluation.reason || `Ready to play for ${evaluation.score.totalScore} points.`);

    return (
        <div id="main" className="h-screen w-screen bg-zinc-500 flex">
            <div className="contents" inert={pendingBlank !== null}>
                <DndContext sensors={drag.sensors} collisionDetection={closestCenter} accessibility={dragAccessibility}
                    onDragStart={drag.handleDragStart} onDragOver={drag.handleDragOver}
                    onDragEnd={drag.handleDragEnd} onDragCancel={drag.handleDragCancel}>
                    <DebugMenu state={state} dispatch={dispatch} evaluation={evaluation} dictionary={dictionary}
                        dictionaryError={dictionaryError} onRetryDictionary={() => {
                            setDictionaryError(null);
                            setDictionaryAttempt(attempt => attempt + 1);
                        }} tileOpacity={tileOpacity} setTileOpacity={setTileOpacity}
                        showCoordinates={showCoordinates} setShowCoordinates={setShowCoordinates} />
                    <div ref={gameAreaRef} id="game-area" role="region" tabIndex={0}
                        aria-label={isDraftMode ? 'Draft area' : 'Game area'} aria-describedby="game-help game-status"
                        data-mode={state.mode} onKeyDown={handleSurfaceKeyDown}
                        onPointerDown={event => {
                            if (event.target instanceof HTMLElement && !event.target.closest('input, textarea, select, button, a, summary, [contenteditable]:not([contenteditable="false"])')) {
                                event.currentTarget.focus({ preventScroll: true });
                            }
                        }}
                        className="grow bg-zinc-500 flex flex-col items-center justify-center gap-4"
                        style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
                        <p id="game-help" className="sr-only">{isDraftMode
                            ? 'Choose an offered column with 1, 2, or 3. Tab reaches the native debug controls.'
                            : 'Arrows select a cell; letters place tiles; Tab changes direction; Backspace recalls; Space shuffles; Enter plays. Delete discards the selected board tile, or the first rack tile when no cell is selected. Shift+Tab leaves the game area; Escape clears selection and releases focus. Native debug buttons provide draw, redraw, reset and mode controls.'}</p>
                        <p id="game-status" className="sr-only" role="status" aria-live="polite">{status}</p>
                        <Board variant={state.mode} board={isDraftMode ? state.draft.board : state.board}
                            onCellSizeChange={setBoardCellSize} overRackIndex={drag.overRackIndex}
                            boardRef={boardRef} rackRef={rackRef} gameAreaRef={gameAreaRef}
                            onRightClick={handleBoardRightClick} stickers={isDraftMode ? undefined : state.stickers}
                            tileOpacity={tileOpacity} showCoordinates={showCoordinates}
                            selectedCell={isDraftMode ? null : keyboard.selectedCell}
                            selectorDirection={isDraftMode ? null : keyboard.selectorDirection} />
                        {!isDraftMode && (
                            <div className="relative">
                                <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2">
                                    <DiscardSlot tileSize={boardCellSize} />
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
                                <Rack rack={state.rack} boardCellSize={boardCellSize}
                                    overBoardPos={drag.activeId && findTileInRack(state.rack, drag.activeId) !== null ? drag.overBoardPos : null}
                                    overRackIndex={drag.overRackIndex} boardRef={boardRef} rackRef={rackRef} gameAreaRef={gameAreaRef}
                                    selectedCell={keyboard.selectedCell} onRackRightClick={tile => {
                                        const position = keyboard.getSelectedCell();
                                        return !!position && requestMove(tile.id, { zone: 'board', ...position }, true);
                                    }} />
                                <button type="button" onClick={() => dispatch({ type: 'shuffle-rack' })} disabled={!canShuffle}
                                    aria-label="Shuffle rack"
                                    className={`absolute left-full ml-2 top-1/2 -translate-y-1/2 p-2 border rounded-lg transition-colors duration-200 flex items-center justify-center ${canShuffle
                                        ? 'bg-zinc-600 hover:bg-zinc-500 border-zinc-500 cursor-pointer'
                                        : 'bg-zinc-600 border-zinc-500 cursor-not-allowed opacity-50'}`}
                                    title={canShuffle ? 'Shuffle rack' : 'Shuffle disabled - need at least 2 tiles'}>
                                    <Shuffle className="w-5 h-5 text-white" />
                                </button>
                                <button type="button" onClick={() => dispatch({ type: 'play' })} disabled={!evaluation.canPlay}
                                    aria-label="Play"
                                    className={`absolute left-full ml-14 top-1/2 -translate-y-1/2 p-2 border rounded-lg transition-colors duration-200 flex items-center justify-center ${evaluation.canPlay
                                        ? 'bg-green-600 hover:bg-green-500 border-green-500 cursor-pointer'
                                        : 'bg-zinc-600 border-zinc-500 cursor-not-allowed opacity-50'}`}
                                    title={evaluation.canPlay ? 'Play - lock placed tiles' : dictionary ? 'Play - no valid words to lock' : 'Play - loading dictionary...'}>
                                    <Play className="w-5 h-5 text-white" />
                                </button>
                            </div>
                        )}
                    </div>
                </DndContext>
            </div>
            {pendingBlank && <LetterSelectionPopup availableLetters={blankLetters} onSelect={selectBlank} onCancel={closeBlank} returnFocusRef={gameAreaRef} />}
        </div>
    );
}
