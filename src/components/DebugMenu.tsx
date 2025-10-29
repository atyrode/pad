import React, { useState } from 'react';
import { Bag } from '../types/bag';
import { RackState } from '../types/rack';
import { BoardState } from '../types/board';
import { drawTileFromBag, createTileBag, shuffleBag } from '../utils/bagUtils';
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

  const handleShuffle = () => {
    // Shuffle the current bag
    const shuffledBag = shuffleBag(bag);
    setBag(shuffledBag);
  };

  // Check if buttons should be disabled
  const isDrawDisabled = bag.length === 0 || findFirstEmptySlot(rack) === null;
  const isDrawAllDisabled = bag.length === 0 || findFirstEmptySlot(rack) === null;
  const isRedrawDisabled = bag.length === 0;


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
          className={`w-full py-2 px-3 rounded-lg text-white font-semibold text-sm transition-opacity ${
            bag.length === 0
              ? 'bg-zinc-800 opacity-50 cursor-not-allowed'
              : 'bg-zinc-600 hover:opacity-80 hover:bg-zinc-500'
          }`}
        >
          Shuffle
        </button>
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