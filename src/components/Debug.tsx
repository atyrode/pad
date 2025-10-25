"use client";
import { useGame } from "../game/store";

export default function Debug() {
  const { state, dispatch } = useGame();

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

  const setRack = (size: number) => {
    const s = Math.max(0, Math.min(50, Math.floor(size || 0)));
    dispatch({ type: "SET_RACK_SIZE", size: s });
  };

  return (
    <div className="w-48 p-3 bg-white/90 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-sm">
      <div className="mb-2 font-medium">Debug</div>

      <label className="text-xs">Board Width</label>
      <input
        type="number"
        value={state.boardWidth}
        onChange={(e) => setDims(Number(e.target.value), state.boardHeight)}
        className="w-full mb-2 px-2 py-1 text-sm rounded border"
        min={1}
        max={50}
      />

      <label className="text-xs">Board Height</label>
      <input
        type="number"
        value={state.boardHeight}
        onChange={(e) => setDims(state.boardWidth, Number(e.target.value))}
        className="w-full mb-2 px-2 py-1 text-sm rounded border"
        min={1}
        max={50}
      />

      <label className="text-xs">Rack Size</label>
      <input
        type="number"
        value={state.rack.length}
        onChange={(e) => setRack(Number(e.target.value))}
        className="w-full mb-3 px-2 py-1 text-sm rounded border"
        min={0}
        max={50}
      />

      <div className="flex gap-2">
        <button
          onClick={() => dispatch({ type: "RESET" })}
          className="flex-1 py-1 text-sm bg-zinc-100 dark:bg-zinc-800 rounded"
        >
          Reset
        </button>
      </div>
    </div>
  );
}