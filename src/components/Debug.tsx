"use client";
import { useGame } from "../game/store";
import { useState } from "react";
import { getTileDisplay, isBlankTile, tileToString, Tile } from "../game/mechanics/tile";

export default function Debug() {
  const { state, dispatch } = useGame();
  const [drawQuantity, setDrawQuantity] = useState(1);
  const [returnTiles, setReturnTiles] = useState("");

  const setDims = (w: number, h: number) => {
    // Force odd numbers by rounding to nearest odd
    let width = Math.max(1, Math.min(50, Math.floor(w || 0)));
    let height = Math.max(1, Math.min(50, Math.floor(h || 0)));
    
    // Round to nearest odd number based on current state
    if (width % 2 === 0) {
      // If even, choose direction based on current state
      if (width > state.boardWidth) {
        // Going up - round up to next odd
        width = Math.min(50, width + 1);
      } else {
        // Going down - round down to previous odd
        width = Math.max(1, width - 1);
      }
    }
    if (height % 2 === 0) {
      // If even, choose direction based on current state
      if (height > state.boardHeight) {
        // Going up - round up to next odd
        height = Math.min(50, height + 1);
      } else {
        // Going down - round down to previous odd
        height = Math.max(1, height - 1);
      }
    }
    
    dispatch({ type: "SET_BOARD_DIMS", width, height });
  };


  return (
    <div className="w-1/2 p-3 bg-white/90 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-sm overflow-y-auto">
      <div className="mb-3 font-medium text-sm">🎮 Game Debug Panel</div>

      {/* Game State Info */}
      <div className="mb-3 p-2 bg-gray-50 dark:bg-gray-800 rounded text-xs">
        <div className="font-medium mb-1">Game State:</div>
        <div>Board: {state.boardWidth}×{state.boardHeight}</div>
      </div>

      {/* Board Controls */}
      <div className="mb-3">
        <div className="text-xs font-medium mb-2">Board Controls</div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs">Width</label>
            <input
              type="number"
              value={state.boardWidth}
              onChange={(e) => setDims(Number(e.target.value), state.boardHeight)}
              className="w-full px-2 py-1 text-xs rounded border"
              min={1}
              max={50}
            />
          </div>
          <div>
            <label className="text-xs">Height</label>
            <input
              type="number"
              value={state.boardHeight}
              onChange={(e) => setDims(state.boardWidth, Number(e.target.value))}
              className="w-full px-2 py-1 text-xs rounded border"
              min={1}
              max={50}
            />
          </div>
        </div>
      </div>

      {/* Bag Controls */}
      <div className="mb-3">
        <div className="text-xs font-medium mb-2">Bag Controls</div>
        <div className="flex gap-1 mb-2">
          <button
            onClick={() => dispatch({ type: "INIT_BAG" })}
            className="flex-1 py-1 text-xs bg-purple-100 dark:bg-purple-800 rounded"
          >
            Init Bag
          </button>
          <button
            onClick={() => dispatch({ type: "SHUFFLE_BAG" })}
            className="flex-1 py-1 text-xs bg-orange-100 dark:bg-orange-800 rounded"
          >
            Shuffle
          </button>
        </div>
        <div className="text-xs text-gray-600 dark:text-gray-400">
          {state.bag.peek().length > 0 ? <div>Bag contents ({state.bag.peek().length} tiles):</div> : <div>Bag is empty</div>}
          <div className="grid grid-cols-20 gap-1 p-2">
            {state.bag.peek().reverse().map((tile, i) => (
              <div key={tile.id} className="border rounded text-center">
                {tile.letter}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tile Drawing */}
      <div className="mb-3">
        <div className="text-xs font-medium mb-2">Tile Drawing</div>
        <div className="flex gap-1 mb-2">
          <input
            type="number"
            value={drawQuantity}
            onChange={(e) => setDrawQuantity(Number(e.target.value))}
            className="w-16 px-2 py-1 text-xs rounded border"
            min={1}
            max={10}
          />
          <button
            onClick={() => dispatch({ type: "DRAW_TILES", quantity: drawQuantity })}
            className="flex-1 py-1 text-xs bg-blue-100 dark:bg-blue-800 rounded"
          >
            Draw {drawQuantity}
          </button>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => dispatch({ type: "CLEAR_RACK" })}
            className="flex-1 py-1 text-xs bg-red-100 dark:bg-red-800 rounded"
          >
            Clear Rack
          </button>
          <button
            onClick={() => {
              dispatch({ type: "CLEAR_RACK" });
              dispatch({ type: "DRAW_TILES", quantity: drawQuantity });
            }}
            className="flex-1 py-1 text-xs bg-green-100 dark:bg-green-800 rounded"
          >
            Redraw
          </button>
        </div>
        <div className="text-xs text-gray-600 dark:text-gray-400 mt-2">
          {state.rack.length > 0 ? <div>Rack contents ({state.rack.length} tiles):</div> : <div>Rack is empty</div>}
          <div className="grid grid-cols-20 gap-1 p-2">
            {state.rack.map((tile, i) => (
              <div key={tile?.id || i} className="border rounded text-center">
                {tile?.letter}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-3">
        <div className="text-xs font-medium mb-2">Quick Actions</div>
        <div className="grid grid-cols-2 gap-1">
          <button
            onClick={() => dispatch({ type: "RESET" })}
            className="py-1 text-xs bg-zinc-100 dark:bg-zinc-800 rounded"
          >
            Reset Game
          </button>
          <button
            onClick={() => {
              dispatch({ type: "INIT_BAG" });
              dispatch({ type: "CLEAR_RACK" });
              dispatch({ type: "DRAW_TILES", quantity: 7 });
            }}
            className="py-1 text-xs bg-indigo-100 dark:bg-indigo-800 rounded"
          >
            New Game
          </button>
        </div>
      </div>
    </div>
  );
}