"use client";
export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <div className="w-[min(92vmin,900px)] h-[min(92vmin,900px)] max-w-[95vw] max-h-[95vh] grid grid-cols-11 gap-1 sm:gap-2 p-2">
        {Array.from({ length: 121 }).map((_, i) => (
          <div
            key={i}
            tabIndex={-1}
            onPointerDown={(e) => e.preventDefault()}
            onFocus={(e) => (e.currentTarget as HTMLElement).blur()}
            onDragStart={(e) => e.preventDefault()}
            draggable={false}
            role="presentation"
            className="aspect-square select-none caret-transparent bg-white/90 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-sm flex items-center justify-center text-xs sm:text-sm outline-none"
          >
            {/* cell */}
          </div>
        ))}
      </div>
    </div>
  );
}
