import React, { useState, useEffect } from 'react';
import { Bag } from '../types/bag';
import { RackState } from '../types/rack';
import { BoardState } from '../types/board';
import { StickerState } from '../types/sticker';
import { drawTileFromBag, createTileBag, shuffleBag, getFullBagSize } from '../utils/bagUtils';
import { findFirstEmptySlot, moveTileToRack } from '../utils/rackUtils';
import { createInitialBoard, findAllWords } from '../utils/boardUtils';
import { isValidWordSync, preloadDictionary } from '../utils/dictionaryUtils';
import { calculateCurrentPlayScore } from '../utils/scoreUtils';
import { createInitialStickers, countStickers, consumeSticker } from '../utils/stickerUtils';

interface DebugMenuProps {
  bag: Bag;
  rack: RackState;
  board: BoardState;
  setRack: React.Dispatch<React.SetStateAction<RackState>>;
  setBag: React.Dispatch<React.SetStateAction<Bag>>;
  setBoard: React.Dispatch<React.SetStateAction<BoardState>>;
  totalScore: number;
  setTotalScore: React.Dispatch<React.SetStateAction<number>>;
  stickers: StickerState;
  setStickers: React.Dispatch<React.SetStateAction<StickerState>>;
}

export default function DebugMenu({ bag, rack, board, setRack, setBag, setBoard, totalScore, setTotalScore, stickers, setStickers }: DebugMenuProps) {
  const [isDictionaryLoaded, setIsDictionaryLoaded] = useState(false);

  // Load dictionary on component mount
  useEffect(() => {
    preloadDictionary().then(() => {
      setIsDictionaryLoaded(true);
    });
  }, []);

  const handleDraw = () => {
    // Check if bag has tiles and rack has space
    if (bag.length === 0) return;

    const emptySlot = findFirstEmptySlot(rack);
    if (emptySlot === null) return; // Rack is full

    // Draw tile from bag
    const { tile, newBag } = drawTileFromBag(bag);
    if (tile === null) return;

    // Update states
    setBag(newBag);
    setRack((prevRack) => moveTileToRack(prevRack, tile, emptySlot));
  };

  const handleDrawAll = () => {
    if (bag.length === 0) return;

    let currentBag = bag;
    let newRack = [...rack];

    // Fill all empty slots
    for (let i = 0; i < newRack.length; i++) {
      if (newRack[i] === null && currentBag.length > 0) {
        const { tile, newBag } = drawTileFromBag(currentBag);
        if (tile) {
          newRack[i] = tile;
          currentBag = newBag;
        }
      }
    }

    setBag(currentBag);
    setRack(newRack);
  };

  const handleRedraw = () => {
    if (bag.length === 0) return;

    // Count how many tiles are currently in the rack
    const currentTileCount = rack.filter(tile => tile !== null).length;

    // Empty the rack
    const emptyRack = Array(rack.length).fill(null);

    // Draw the same number of tiles
    let currentBag = bag;
    let newRack = [...emptyRack];

    for (let i = 0; i < currentTileCount && currentBag.length > 0; i++) {
      const { tile, newBag } = drawTileFromBag(currentBag);
      if (tile) {
        newRack[i] = tile;
        currentBag = newBag;
      }
    }

    setBag(currentBag);
    setRack(newRack);
  };

  const handleClear = () => {
    // Empty the rack
    const emptyRack = Array(rack.length).fill(null);
    setRack(emptyRack);
  };

  const handleResetGame = () => {
    // Clear the board, rack, refill the bag, reset score, and reset stickers
    const emptyBoard = createInitialBoard();
    const emptyRack = Array(rack.length).fill(null);
    const newBag = createTileBag();
    const newStickers = createInitialStickers();
    setBoard(emptyBoard);
    setRack(emptyRack);
    setBag(newBag);
    setTotalScore(0);
    setStickers(newStickers);
  };

  const handleResetScore = () => {
    // Reset only the score
    setTotalScore(0);
  };

  const handleResetBoard = () => {
    // Clear the board only
    const emptyBoard = createInitialBoard();
    setBoard(emptyBoard);
  };

  const handleResetStickers = () => {
    // Reset stickers to initial state
    let newStickers = createInitialStickers();
    
    // Consume any stickers that have locked tiles on top
    for (let row = 0; row < board.length; row++) {
      for (let col = 0; col < board[row].length; col++) {
        const cell = board[row][col];
        if (cell.tile && cell.locked) {
          // This position has a locked tile, so consume the sticker if it exists
          newStickers = consumeSticker(newStickers, { row, col });
        }
      }
    }
    
    setStickers(newStickers);
  };

  const handleResetBag = () => {
    // Refill the bag, keeping the rack and board as is
    const newBag = createTileBag();
    setBag(newBag);
  };

  const handleShuffle = () => {
    // Shuffle the current bag
    const shuffledBag = shuffleBag(bag);
    setBag(shuffledBag);
  };

  // Check if buttons should be disabled
  const isDrawDisabled = bag.length === 0 || findFirstEmptySlot(rack) === null;
  const isDrawAllDisabled = bag.length === 0 || findFirstEmptySlot(rack) === null;
  const isRedrawDisabled = bag.length === 0 || rack.every(tile => tile === null);

  // Helper function to get validation icon
  const getValidationIcon = (word: string) => {
    if (!isDictionaryLoaded) {
      return <span className="text-zinc-500 text-xs">⏳</span>;
    }

    const isValid = isValidWordSync(word);
    if (isValid === true) {
      return <span className="text-green-500 text-xs">✓</span>;
    } else if (isValid === false) {
      return <span className="text-red-500 text-xs">✗</span>;
    } else {
      return <span className="text-zinc-500 text-xs">?</span>;
    }
  };

  // Find all words on the board
  const words = findAllWords(board);
  const currentWords = words.filter(w => !w.isLocked);
  const playedWords = words.filter(w => w.isLocked);

  // Calculate current play score
  const currentPlayScore = calculateCurrentPlayScore(board, stickers);

  // Count stickers
  const stickerCounts = countStickers(stickers);

  // Check if board is empty (no tiles placed)
  const isBoardEmpty = board.every(row =>
    row.every(cell => cell.tile === null)
  );

  // Check if rack is empty (all slots are null)
  const isRackEmpty = rack.every(tile => tile === null);

  // Full bag size (calculated from TILE_DISTRIBUTION)
  const FULL_BAG_SIZE = getFullBagSize();
  const isBagFull = bag.length >= FULL_BAG_SIZE;

  // Check if score is zero
  const isScoreZero = totalScore === 0;

  // Calculate disabled states for reset buttons
  const isBoardResetDisabled = isBoardEmpty;
  const isRackResetDisabled = isRackEmpty;
  const isBagResetDisabled = isBagFull;
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
            onClick={handleClear}
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
            {bag.length === 0 ? 'Bag is empty' :
              isRedrawDisabled && rack.every(tile => tile === null) ? 'Rack is empty' : 'Rack is full'}
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
            {totalScore}
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
          Tile Bag ({bag.length} tiles)
        </h3>

        <div className="grid grid-cols-8 gap-1 overflow-y-auto mb-3">
          {bag.map((tile, index) => (
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
          onClick={handleShuffle}
          disabled={bag.length === 0}
          className={`w-full py-2 px-3 rounded-lg text-white font-semibold text-sm transition-opacity ${bag.length === 0
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

    </div>
  );
}