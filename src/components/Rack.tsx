"use client";
import { useGame } from "../game/store";

export default function Rack() {
  const { state } = useGame();

  return (
    <div
      className="grid gap-1 p-2 mt-2"
    >
      {state.rack.map((tile, i) => (
        <div key={i}>
          <div
            className="select-none caret-transparent bg-white/90 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-sm flex items-center justify-center text-xs sm:text-sm outline-none"
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