import React, { useState } from 'react';
import { Bag } from '../types/bag';
import { RackState } from '../types/rack';
import { BoardState } from '../types/board';
import { drawTileFromBag, createTileBag } from '../utils/bagUtils';
import { findFirstEmptySlot, moveTileToRack } from '../utils/rackUtils';
import { createInitialBoard } from '../utils/boardUtils';

interface DebugMenuProps {
  bag: Bag;
  rack: RackState;
  board: BoardState;
  setRack: React.Dispatch<React.SetStateAction<RackState>>;
  setBag: React.Dispatch<React.SetStateAction<Bag>>;
  setBoard: React.Dispatch<React.SetStateAction<BoardState>>;
}

export default function DebugMenu({ bag, rack, board, setRack, setBag, setBoard }: DebugMenuProps) {
  const [isBagExpanded, setIsBagExpanded] = useState(false);

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
    // Clear the board, rack, and refill the bag
    const emptyBoard = createInitialBoard();
    const emptyRack = Array(rack.length).fill(null);
    const newBag = createTileBag();
    setBoard(emptyBoard);
    setRack(emptyRack);
    setBag(newBag);
  };

  const handleResetBoard = () => {
    // Clear the board only
    const emptyBoard = createInitialBoard();
    setBoard(emptyBoard);
  };

  const handleResetBag = () => {
    // Refill the bag, keeping the rack and board as is
    const newBag = createTileBag();
    setBag(newBag);
  };

  // Check if buttons should be disabled
  const isDrawDisabled = bag.length === 0 || findFirstEmptySlot(rack) === null;
  const isDrawAllDisabled = bag.length === 0 || findFirstEmptySlot(rack) === null;
  const isRedrawDisabled = bag.length === 0;

  // Group tiles by value and score
  const tileGroups = bag.reduce((acc, tile) => {
    const key = `${tile.value}-${tile.score}`;
    if (!acc[key]) {
      acc[key] = {
        value: tile.value,
        score: tile.score,
        count: 0,
      };
    }
    acc[key].count++;
    return acc;
  }, {} as Record<string, { value: string; score: number; count: number }>);

  // Convert to array and sort by score, then by value
  const sortedGroups = Object.values(tileGroups).sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score;
    return a.value.localeCompare(b.value);
  });

  return (
    <div id="debug-menu" className="w-1/4 h-full bg-zinc-600 p-4 overflow-y-auto">
      <h2 className="text-white text-xl font-bold mb-4">Debug Menu</h2>
      
      <div className="bg-zinc-700 rounded-lg p-4 mb-4">
        <h3 className="text-white text-lg font-semibold mb-3">Reset</h3>
        <div className="flex flex-row gap-2 justify-center">
          <button
            onClick={handleResetGame}
            className="py-2 px-3 rounded-lg text-white font-semibold text-sm bg-red-600 hover:opacity-80 hover:bg-red-500 transition-opacity grow"
          >
            Game
          </button>
          <button
            onClick={handleResetBoard}
            className="py-2 px-3 rounded-lg text-white font-semibold text-sm bg-orange-600 hover:opacity-80 hover:bg-orange-500 transition-opacity grow"
          >
            Board
          </button>
          <button
            onClick={handleClear}
            className="py-2 px-3 rounded-lg text-white font-semibold text-sm bg-yellow-600 hover:opacity-80 hover:bg-yellow-500 transition-opacity grow"
          >
            Rack
          </button>
          <button
            onClick={handleResetBag}
            className="py-2 px-3 rounded-lg text-white font-semibold text-sm bg-green-600 hover:opacity-80 hover:bg-green-500 transition-opacity grow"
          >
            Bag
          </button>
        </div>
      </div>
      
      <div className="bg-zinc-700 rounded-lg p-4">
        <button
          onClick={() => setIsBagExpanded(!isBagExpanded)}
          className="w-full flex items-center justify-between text-white text-lg font-semibold mb-3 hover:opacity-80 transition-opacity"
        >
          <span>Tile Bag</span>
          <span className="text-zinc-400 text-sm font-normal">
            {bag.length} tiles
          </span>
          <span className="text-zinc-400">
            {isBagExpanded ? '▼' : '▶'}
          </span>
        </button>
        
        {isBagExpanded && (
          <>
            <div className="text-zinc-300 text-sm mb-2">
              Total tiles: <span className="font-bold text-white">{bag.length}</span>
            </div>
            
            <div className="space-y-1">
              {sortedGroups.map((group) => (
                <div 
                  key={`${group.value}-${group.score}`}
                  className="flex justify-between items-center bg-zinc-800 rounded px-3 py-2 text-sm"
                >
                  <span className="text-white font-mono">
                    {group.value === '*' ? '*' : group.value}
                  </span>
                  <span className="text-zinc-400">
                    Score: {group.score}
                  </span>
                  <span className="text-white font-semibold">
                    ×{group.count}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="bg-zinc-700 rounded-lg p-4 mt-4">
        <h3 className="text-white text-lg font-semibold mb-3">Draw</h3>
        <div className="flex flex-row gap-2 justify-center">
          <button
            onClick={handleDraw}
            disabled={isDrawDisabled}
            className={`py-2 px-3 rounded-lg text-white font-semibold text-sm transition-opacity grow ${
              isDrawDisabled 
                ? 'bg-zinc-800 opacity-50 cursor-not-allowed' 
                : 'bg-zinc-600 hover:opacity-80 hover:bg-zinc-500'
            }`}
          >
            Draw
          </button>
          <button
            onClick={handleDrawAll}
            disabled={isDrawAllDisabled}
            className={`py-2 px-3 rounded-lg text-white font-semibold text-sm transition-opacity grow ${
              isDrawAllDisabled 
                ? 'bg-zinc-800 opacity-50 cursor-not-allowed' 
                : 'bg-zinc-600 hover:opacity-80 hover:bg-zinc-500'
            }`}
          >
            Draw All
          </button>
          <button
            onClick={handleRedraw}
            disabled={isRedrawDisabled}
            className={`py-2 px-3 rounded-lg text-white font-semibold text-sm transition-opacity grow ${
              isRedrawDisabled 
                ? 'bg-zinc-800 opacity-50 cursor-not-allowed' 
                : 'bg-zinc-600 hover:opacity-80 hover:bg-zinc-500'
            }`}
          >
            Redraw
          </button>
        </div>
        {(isDrawDisabled || isDrawAllDisabled || isRedrawDisabled) && (
          <p className="text-zinc-400 text-xs mt-2 text-center">
            {bag.length === 0 ? 'Bag is empty' : 'Rack is full'}
          </p>
        )}
      </div>
    </div>
  );
}