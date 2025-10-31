import React from 'react';
import * as BoardDomain from '../domain/board/Board';
import * as Draft from '../domain/draft/Draft';
import * as Dictionary from '../domain/dictionary/Dictionary';
import * as Stickers from '../domain/stickers/Stickers';
import * as Rack from '../domain/rack/Rack';
import * as Bag from '../domain/bag/Bag';
import GameService, { GameStateSnapshot } from '../engine/GameService';
import * as PlayResolution from '../engine/PlayResolution';
import * as TileSupply from '../engine/TileSupply';
import { useGameStore } from '../state/store';

interface DebugMenuProps {
  onResetDraft?: () => void;
  onRerollSuggestions?: () => void;
  onDraw?: () => void;
  onDrawAll?: () => void;
  onRedraw?: () => void;
  onClearRack?: () => void;
  onResetGame?: () => void;
  onResetBoard?: () => void;
  onResetBag?: () => void;
  onResetScore?: () => void;
  onResetStickers?: () => void;
  onShuffleBag?: () => void;
}

export default function DebugMenu({ onResetDraft, onRerollSuggestions }: Pick<DebugMenuProps, 'onResetDraft' | 'onRerollSuggestions'>) {
  // Get state from Zustand store
  const state = useGameStore();

  // Store actions - using individual selectors to avoid infinite loops
  const setBoard = useGameStore((state) => state.setBoard);
  const setRack = useGameStore((state) => state.setRack);
  const setBag = useGameStore((state) => state.setBag);
  const setDiscard = useGameStore((state) => state.setDiscard);
  const setStickers = useGameStore((state) => state.setStickers);
  const setTotalScore = useGameStore((state) => state.setTotalScore);
  const setTileOpacity = useGameStore((state) => state.setTileOpacity);
  const setShowCoordinates = useGameStore((state) => state.setShowCoordinates);
  const setIsDraftMode = useGameStore((state) => state.setIsDraftMode);
  const setDraftBoard = useGameStore((state) => state.setDraftBoard);
  const setDraftRerollCount = useGameStore((state) => state.setDraftRerollCount);
  const setDraftEnded = useGameStore((state) => state.setDraftEnded);
  const setHasSeededFromDraft = useGameStore((state) => state.setHasSeededFromDraft);
  const setPlacementHistory = useGameStore((state) => state.setPlacementHistory);
  const batchUpdate = useGameStore((state) => state.batchUpdate);

  const handleDraw = () => {
    const result = TileSupply.drawOne({
      rack: state.rack,
      bag: state.bag,
      discard: state.discard,
    });

    if (!result) return;

    batchUpdate({
      bag: result.bag,
      rack: result.rack,
      discard: result.discard,
    });
  };

  const handleDrawAll = () => {
    const gameState: GameStateSnapshot = {
      board: state.board,
      rack: state.rack,
      bag: state.bag,
      discard: state.discard,
      stickers: state.stickers,
      totalScore: state.totalScore,
      placementHistory: state.placementHistory,
    };

    const result = TileSupply.drawToFill({
      rack: state.rack,
      bag: state.bag,
      discard: state.discard,
    });

    batchUpdate({
      bag: result.bag,
      rack: result.rack,
      discard: result.discard,
    });
  };

  const handleRedraw = () => {
    const gameState: GameStateSnapshot = {
      board: state.board,
      rack: state.rack,
      bag: state.bag,
      discard: state.discard,
      stickers: state.stickers,
      totalScore: state.totalScore,
      placementHistory: state.placementHistory,
    };

    const result = TileSupply.redraw({
      rack: state.rack,
      bag: state.bag,
      discard: state.discard,
    });

    batchUpdate({
      bag: result.bag,
      rack: result.rack,
      discard: result.discard,
    });
  };

  const handleClearRack = () => {
    setRack(Array(state.rack.length).fill(null));
  };

  const handleResetBoard = () => {
    setBoard(BoardDomain.createEmpty());
  };

  const handleResetScore = () => {
    setTotalScore(0);
  };

  const handleResetStickers = () => {
    let stickers = Stickers.createInitialStickers();
    for (let row = 0; row < state.board.length; row++) {
      for (let col = 0; col < state.board[row].length; col++) {
        const cell = state.board[row][col];
        if (cell.tile && !cell.canTake) {
          stickers = Stickers.consumeSticker(stickers, { row, col });
        }
      }
    }
    setStickers(stickers);
  };

  const handleResetBag = () => {
    const centerCount = 7;
    const centerStart = Math.floor((11 - centerCount) / 2);
    const positions = [7, 8].flatMap(r => Array.from({ length: centerCount }, (_, i) => ({ row: r, col: centerStart + i })));
    const draftedTiles = positions
      .map(p => state.draftBoard[p.row][p.col].tile)
      .filter(Boolean) as any[];
    setBag(Bag.shuffle(draftedTiles.filter(Boolean)));
  };

  const handleResetGame = () => {
    // Capture current board before resetting for sticker calculation
    const currentBoard = state.board;
    const emptyRack: any[] = Array(state.rack.length).fill(null);
    let stickers = Stickers.createInitialStickers();
    for (let row = 0; row < currentBoard.length; row++) {
      for (let col = 0; col < currentBoard[row].length; col++) {
        const cell = currentBoard[row][col];
        if (cell.tile && !cell.canTake) {
          stickers = Stickers.consumeSticker(stickers, { row, col });
        }
      }
    }
    const centerCount = 7;
    const centerStart = Math.floor((11 - centerCount) / 2);
    const positions = [7, 8].flatMap(r => Array.from({ length: centerCount }, (_, i) => ({ row: r, col: centerStart + i })));
    const draftedTiles = positions
      .map(p => state.draftBoard[p.row][p.col].tile)
      .filter(Boolean) as any[];

    batchUpdate({
      board: BoardDomain.createEmpty(),
      rack: emptyRack,
      totalScore: 0,
      stickers,
      bag: Bag.shuffle(draftedTiles.filter(Boolean)),
      placementHistory: [],
    });
  };

  const handleShuffleBag = () => {
    setBag(Bag.shuffle(state.bag));
  };

  // All mutating handlers are now defined locally; this component uses the store directly.

  // Check if buttons should be disabled
  const isDrawDisabled = state.bag.length === 0 || Rack.firstEmpty(state.rack) === null;
  const isDrawAllDisabled = state.bag.length === 0 || Rack.firstEmpty(state.rack) === null;
  const isRedrawDisabled = state.bag.length === 0 || state.rack.every(tile => tile === null);

  // Helper function to get validation icon
  const getValidationIcon = (word: string) => {
    if (!state.isDictionaryLoaded) {
      return <span className="text-zinc-500 text-xs">⏳</span>;
    }

    const isValid = Dictionary.isValidWordSync(word);
    if (isValid === true) {
      return <span className="text-green-500 text-xs">✓</span>;
    } else if (isValid === false) {
      return <span className="text-red-500 text-xs">✗</span>;
    } else {
      return <span className="text-zinc-500 text-xs">?</span>;
    }
  };

  // Find all words on the board
  const words = BoardDomain.findAllWords(state.board);
  const currentWords = words.filter(w => !w.isLocked);
  const playedWords = words.filter(w => w.isLocked);

  // Calculate current play score
  const currentPlayScore = PlayResolution.calculateCurrentPlayScore(state.board, state.stickers);

  // Count stickers
  const stickerCounts = Stickers.countStickers(state.stickers);

  // Check if board is empty (no tiles placed)
  const isBoardEmpty = state.board.every(row =>
    row.every(cell => cell.tile === null)
  );

  // Check if rack is empty (all slots are null)
  const isRackEmpty = state.rack.every(tile => tile === null);

  // Draft-based bag: consider draft unavailable if no drafted tiles present
  const centerCount = 7;
  const centerStart = Math.floor((11 - centerCount) / 2);
  const draftedCount = state.draftBoard && state.draftBoard.length >= 9 ?
    [7, 8].flatMap(r => Array.from({ length: centerCount }, (_, i) => ({ row: r, col: centerStart + i })))
      .filter(pos => pos.row < state.draftBoard.length && pos.col < state.draftBoard[pos.row].length && state.draftBoard[pos.row][pos.col].tile)
      .length : 0;

  // Helper: collect all drafted tiles (14 center slots)
  const collectDraftedTiles = () => {
    if (!state.draftBoard || state.draftBoard.length < 9) return [];
    const positions = [7, 8].flatMap(r => Array.from({ length: centerCount }, (_, i) => ({ row: r, col: centerStart + i })));
    return positions
      .filter(p => p.row < state.draftBoard.length && p.col < state.draftBoard[p.row].length)
      .map(p => state.draftBoard[p.row][p.col].tile)
      .filter(Boolean) as any[];
  };

  // Compare current bag to drafted tiles (order-agnostic, by tile.id)
  const isBagSameAsDraft = () => {
    const draftedTiles = collectDraftedTiles();
    if (draftedTiles.length === 0) return false;
    if (state.bag.length !== draftedTiles.length) return false;
    const draftedIds = new Set(draftedTiles.map(t => t.id));
    return state.bag.every(t => draftedIds.has(t!.id));
  };

  // Check if score is zero
  const isScoreZero = state.totalScore === 0;

  // Calculate disabled states for reset buttons
  const isBoardResetDisabled = isBoardEmpty;
  const isRackResetDisabled = isRackEmpty;
  const isBagResetDisabled = draftedCount === 0 || isBagSameAsDraft();
  const isScoreResetDisabled = isScoreZero;

  // Check if stickers are in initial state
  const isStickersReset = stickerCounts.multiActive === 4 && stickerCounts.pointsActive === 4 &&
    stickerCounts.multiConsumed === 0 && stickerCounts.pointsConsumed === 0 &&
    stickerCounts.startActive === 1 && stickerCounts.startConsumed === 0;
  const isStickersResetDisabled = isStickersReset;

  // Game reset is disabled if all other reset buttons are disabled
  const isGameResetDisabled = isBoardResetDisabled &&
    isRackResetDisabled &&
    isBagResetDisabled &&
    isScoreResetDisabled;

  return (
    <div id="debug-menu" className="w-1/3 h-full bg-zinc-600 p-4 overflow-y-auto">
      <h2 className="text-white text-xl font-bold mb-4">Debug Menu</h2>

      {/* Mode */}
      <div className="bg-zinc-700 rounded-lg p-4 mb-4">
        <h3 className="text-white text-lg font-semibold mb-3">Mode</h3>
        <div className="flex flex-row gap-2 justify-center">
          <button
            onClick={() => setIsDraftMode(!state.isDraftMode)}
            className={`py-2 px-3 rounded-lg text-white font-semibold text-sm transition-opacity grow ${
              state.isDraftMode
                ? 'bg-blue-600 hover:opacity-80 hover:bg-blue-500'
                : 'bg-zinc-600 hover:opacity-80 hover:bg-zinc-500'
            }`}
          >
            {state.isDraftMode ? 'Exit Draft' : 'Enter Draft'}
          </button>
        </div>
      </div>

      {/* Game Mode Sections - Only show when NOT in draft mode */}
      {!state.isDraftMode && (
        <>
          {/* Reset */}
          <div className="bg-zinc-700 rounded-lg p-4 mb-4">
            <h3 className="text-white text-lg font-semibold mb-3">Reset</h3>
            <div className="flex flex-row gap-2 justify-center mb-2">
              <button
                onClick={handleResetGame}
                disabled={isGameResetDisabled}
                className={`py-2 px-3 rounded-lg text-white font-semibold text-sm transition-opacity grow ${isGameResetDisabled
                  ? 'bg-zinc-800 opacity-50 cursor-not-allowed'
                  : 'bg-red-600 hover:opacity-80 hover:bg-red-500'
                  }`}
              >
                Game
              </button>
            </div>
            <div className="flex flex-row gap-2 justify-center">
              <button
                onClick={handleResetBoard}
                disabled={isBoardResetDisabled}
                className={`py-2 px-3 rounded-lg text-white font-semibold text-sm transition-opacity grow ${isBoardResetDisabled
                  ? 'bg-zinc-800 opacity-50 cursor-not-allowed'
                  : 'bg-orange-600 hover:opacity-80 hover:bg-orange-500'
                  }`}
              >
                Board
              </button>
              <button
                onClick={handleClearRack}
                disabled={isRackResetDisabled}
                className={`py-2 px-3 rounded-lg text-white font-semibold text-sm transition-opacity grow ${isRackResetDisabled
                  ? 'bg-zinc-800 opacity-50 cursor-not-allowed'
                  : 'bg-yellow-600 hover:opacity-80 hover:bg-yellow-500'
                  }`}
              >
                Rack
              </button>
              <button
                onClick={handleResetBag}
                disabled={isBagResetDisabled}
                className={`py-2 px-3 rounded-lg text-white font-semibold text-sm transition-opacity grow ${isBagResetDisabled
                  ? 'bg-zinc-800 opacity-50 cursor-not-allowed'
                  : 'bg-green-600 hover:opacity-80 hover:bg-green-500'
                  }`}
              >
                Bag
              </button>
              <button
                onClick={handleResetScore}
                disabled={isScoreResetDisabled}
                className={`py-2 px-3 rounded-lg text-white font-semibold text-sm transition-opacity grow ${isScoreResetDisabled
                  ? 'bg-zinc-800 opacity-50 cursor-not-allowed'
                  : 'bg-purple-600 hover:opacity-80 hover:bg-purple-500'
                  }`}
              >
                Score
              </button>
              <button
                onClick={handleResetStickers}
                disabled={isStickersResetDisabled}
                className={`py-2 px-3 rounded-lg text-white font-semibold text-sm transition-opacity grow ${isStickersResetDisabled
                  ? 'bg-zinc-800 opacity-50 cursor-not-allowed'
                  : 'bg-indigo-600 hover:opacity-80 hover:bg-indigo-500'
                  }`}
              >
                Stickers
              </button>
            </div>
          </div>

          {/* Draw */}
          <div className="bg-zinc-700 rounded-lg p-4 mt-4">
            <h3 className="text-white text-lg font-semibold mb-3">Draw</h3>
            <div className="flex flex-row gap-2 justify-center">
              <button
                onClick={handleDraw}
                disabled={isDrawDisabled}
                className={`py-2 px-3 rounded-lg text-white font-semibold text-sm transition-opacity grow ${isDrawDisabled
                  ? 'bg-zinc-800 opacity-50 cursor-not-allowed'
                  : 'bg-zinc-600 hover:opacity-80 hover:bg-zinc-500'
                  }`}
              >
                Draw
              </button>
              <button
                onClick={handleDrawAll}
                disabled={isDrawAllDisabled}
                className={`py-2 px-3 rounded-lg text-white font-semibold text-sm transition-opacity grow ${isDrawAllDisabled
                  ? 'bg-zinc-800 opacity-50 cursor-not-allowed'
                  : 'bg-zinc-600 hover:opacity-80 hover:bg-zinc-500'
                  }`}
              >
                Draw All
              </button>
              <button
                onClick={handleRedraw}
                disabled={isRedrawDisabled}
                className={`py-2 px-3 rounded-lg text-white font-semibold text-sm transition-opacity grow ${isRedrawDisabled
                  ? 'bg-zinc-800 opacity-50 cursor-not-allowed'
                  : 'bg-zinc-600 hover:opacity-80 hover:bg-zinc-500'
                  }`}
              >
                Redraw
              </button>
            </div>
            {(isDrawDisabled || isDrawAllDisabled || isRedrawDisabled) && (
              <p className="text-zinc-400 text-xs mt-2 text-center">
                {state.bag.length === 0 ? 'Bag is empty' :
                  isRedrawDisabled && state.rack.every(tile => tile === null) ? 'Rack is empty' : 'Rack is full'}
              </p>
            )}
          </div>

          {/* Score */}
          <div className="bg-zinc-700 rounded-lg p-4 mt-4">
            <h3 className="text-white text-lg font-semibold mb-3">Score</h3>

            {/* Total Score */}
            <div className="mb-3">
              <div className="text-white text-sm font-medium mb-1">Total Score</div>
              <div className="text-green-400 text-2xl font-bold">
                {state.totalScore}
              </div>
            </div>

            {/* Current Play Score */}
            <div className="mb-3">
              <div className="text-white text-sm font-medium mb-2">Current Play</div>
              <div className="bg-zinc-800 rounded px-3 py-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-zinc-300 text-xs">Points:</span>
                  <span className="text-white text-sm font-mono">
                    {currentPlayScore.breakdown.baseTilePoints}
                    {currentPlayScore.breakdown.stickerPoints > 0 && (
                      <span className="text-green-400"> (+{currentPlayScore.breakdown.stickerPoints})</span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-zinc-300 text-xs">Multi:</span>
                  <span className="text-white text-sm font-mono">
                    {currentPlayScore.breakdown.baseTileMulti}
                    {currentPlayScore.breakdown.stickerMulti > 0 && (
                      <span className="text-green-400"> (+{currentPlayScore.breakdown.stickerMulti})</span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between items-center border-t border-zinc-600 pt-1">
                  <span className="text-zinc-300 text-xs font-medium">Total:</span>
                  <span className="text-green-400 text-sm font-bold font-mono">{currentPlayScore.breakdown.total}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Board */}
          <div className="bg-zinc-700 rounded-lg p-4 mt-4">
            <h3 className="text-white text-lg font-semibold mb-3">Board</h3>

            {/* Current Words Section */}
            <div className="mb-4">
              <h4 className="text-white text-sm font-medium mb-2">Current</h4>
              {currentWords.length === 0 ? (
                <p className="text-zinc-400 text-xs text-center">No current words</p>
              ) : (
                <div className="space-y-1">
                  {currentWords.map((wordInfo, index) => (
                    <div
                      key={`current-${index}`}
                      className="text-white text-sm font-mono bg-zinc-800 rounded px-2 py-1 flex justify-between items-center"
                    >
                      <span>
                        {wordInfo.word.toUpperCase()} at ({wordInfo.position.row},{wordInfo.position.col}) {wordInfo.direction}
                      </span>
                      {getValidationIcon(wordInfo.word)}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Played Words Section */}
            <div>
              <h4 className="text-white text-sm font-medium mb-2">Played</h4>
              {playedWords.length === 0 ? (
                <p className="text-zinc-400 text-xs text-center">No played words</p>
              ) : (
                <div className="space-y-1">
                  {playedWords.map((wordInfo, index) => (
                    <div
                      key={`played-${index}`}
                      className="text-white text-sm font-mono bg-zinc-800 rounded px-2 py-1 flex justify-between items-center"
                    >
                      <span>
                        {wordInfo.word.toUpperCase()} at ({wordInfo.position.row},{wordInfo.position.col}) {wordInfo.direction}
                      </span>
                      {getValidationIcon(wordInfo.word)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Tile Bag */}
          <div className="bg-zinc-700 rounded-lg p-4 mt-4">
            <h3 className="text-white text-lg font-semibold mb-3">
              Tile Bag ({state.bag.length} tiles)
            </h3>

            <div className="grid grid-cols-8 gap-1 overflow-y-auto mb-3">
              {state.bag.map((tile, index) => (
                <div
                  key={index}
                  className="w-6 h-6 bg-zinc-800 rounded flex items-center justify-center text-xs font-mono text-white border border-zinc-600"
                  title={`${tile.value} (${tile.score} points)`}
                >
                  {tile.value === '*' ? '*' : tile.value}
                </div>
              ))}
            </div>
            <button
              onClick={handleShuffleBag}
              disabled={state.bag.length === 0}
              className={`w-full py-2 px-3 rounded-lg text-white font-semibold text-sm transition-opacity ${state.bag.length === 0
                ? 'bg-zinc-800 opacity-50 cursor-not-allowed'
                : 'bg-zinc-600 hover:opacity-80 hover:bg-zinc-500'
                }`}
            >
              Shuffle
            </button>
          </div>

          {/* Stickers */}
          <div className="bg-zinc-700 rounded-lg p-4 mt-4">
            <h3 className="text-white text-lg font-semibold mb-3">Stickers</h3>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="bg-zinc-800 rounded px-3 py-2">
                <div className="text-purple-300 text-xs font-medium mb-1">Multi (x2)</div>
                <div className="text-white text-sm">
                  <span className="text-green-400">{stickerCounts.multiActive}</span>
                  <span className="text-zinc-400"> / </span>
                  <span className="text-zinc-500">{stickerCounts.multiConsumed}</span>
                </div>
              </div>
              <div className="bg-zinc-800 rounded px-3 py-2">
                <div className="text-blue-300 text-xs font-medium mb-1">Points (+10)</div>
                <div className="text-white text-sm">
                  <span className="text-green-400">{stickerCounts.pointsActive}</span>
                  <span className="text-zinc-400"> / </span>
                  <span className="text-zinc-500">{stickerCounts.pointsConsumed}</span>
                </div>
              </div>
              <div className="bg-zinc-800 rounded px-3 py-2">
                <div className="text-yellow-300 text-xs font-medium mb-1">Start (★)</div>
                <div className="text-white text-sm">
                  <span className="text-green-400">{stickerCounts.startActive}</span>
                  <span className="text-zinc-400"> / </span>
                  <span className="text-zinc-500">{stickerCounts.startConsumed}</span>
                </div>
              </div>
            </div>

            <div className="text-xs text-zinc-400 text-center">
              Active / Consumed
            </div>
          </div>
        </>
      )}

      {/* Draft Mode Sections - Only show when in draft mode */}
      {state.isDraftMode && (
        <>
          <div className="bg-zinc-700 rounded-lg p-4 mb-4">
            <h3 className="text-white text-lg font-semibold mb-3">Draft Mode</h3>
            <p className="text-zinc-400 text-sm text-center mb-3">
              Draft mode is active. Use the suggested tiles to build words!
            </p>
            <div className="flex flex-row gap-2 justify-center">
              <button
                onClick={() => {
                  if (onRerollSuggestions) {
                    onRerollSuggestions();
                  }
                }}
                className="py-2 px-3 rounded-lg text-white font-semibold text-sm transition-opacity bg-blue-600 hover:opacity-80 hover:bg-blue-500"
              >
                New Suggestions
              </button>
              <button
                onClick={() => {
                  if (onResetDraft) {
                    onResetDraft();
                  } else {
                    const newDraftBoard = Draft.createInitialDraftBoard();
                    setDraftBoard(newDraftBoard);
                  }
                }}
                className="py-2 px-3 rounded-lg text-white font-semibold text-sm transition-opacity bg-orange-600 hover:opacity-80 hover:bg-orange-500"
              >
                Reset Draft
              </button>
            </div>
          </div>
        </>
      )}

      {/* Visual Settings */}
      <div className="bg-zinc-700 rounded-lg p-4 mt-4">
        <h3 className="text-white text-lg font-semibold mb-3">Visual Settings</h3>

        {/* Tile Opacity Slider */}
        <div className="mb-4">
          <div className="text-white text-sm font-medium mb-2">Tile Opacity</div>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="0"
              max="100"
              value={state.tileOpacity}
              onChange={(e) => setTileOpacity(Number(e.target.value))}
              className="flex-1 h-2 bg-zinc-600 rounded-lg appearance-none cursor-pointer slider"
            />
            <span className="text-white text-sm font-mono w-12 text-right">
              {state.tileOpacity}%
            </span>
          </div>
        </div>

        {/* Coordinates Toggle */}
        <div>
          <div className="text-white text-sm font-medium mb-2">Show Coordinates</div>
          <button
            onClick={() => setShowCoordinates(!state.showCoordinates)}
            className={`w-full py-2 px-3 rounded-lg text-white font-semibold text-sm transition-opacity ${
              state.showCoordinates
                ? 'bg-green-600 hover:opacity-80 hover:bg-green-500'
                : 'bg-zinc-600 hover:opacity-80 hover:bg-zinc-500'
            }`}
          >
            {state.showCoordinates ? 'Hide' : 'Show'} Coordinates
          </button>
        </div>
      </div>

    </div>
  );
}