"use client";
import { useGame } from "../game/store";

export default function Rack() {
  const { state, dispatch } = useGame();

  const setSample = (slot: number) => {
    dispatch({
      type: "SET_RACK_TILE",
      slot,
      tile: { id: `r-${slot}`, letter: String.fromCharCode(65 + slot), score: 1 },
    });
  };

  return (
    <div
      className="grid gap-1 p-2 mt-2"
      style={{
        gridTemplateColumns: `repeat(${state.rack.length}, var(--tile))`,
      }}
    >
      {state.rack.map((tile, i) => (
        <div key={i} onClick={() => setSample(i)}>
          <div
            className="select-none caret-transparent bg-white/90 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-sm flex items-center justify-center text-xs sm:text-sm outline-none"
            style={{
              width: "var(--tile)",
              height: "var(--tile)",
            }}
          >
            {tile ? (
              <div className="flex flex-col items-center">
                <div className="font-medium">{tile.letter}</div>
                <div className="text-[0.6rem] opacity-60">{tile.score}</div>
              </div>
            ) : (
              <div className="text-zinc-400">+</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}