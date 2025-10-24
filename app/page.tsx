"use client";
export default function Home() {
  return (
    <div className="h-screen overflow-hidden flex items-center justify-center bg-zinc-50 dark:bg-black p-4 box-border">
      {/* wrapper sets a --board-w and a --tile size that is the min of width/11 and available height/12 */}
      <div
        className="w-[min(92vmin,900px)] max-w-[95vw] flex flex-col items-center"
        style={
          {
            // board width reference and tile size: reserve increased to 8rem so gaps/paddings fit
            ["--board-w" as any]: "min(92vmin,900px)",
            ["--tile" as any]:
              "min(calc(var(--board-w) / 11), calc((100vh - 11rem) / 12))",
          } as React.CSSProperties
        }
      >
        {/* board: 11x11 using the --tile for columns */}
        <div
          className="grid gap-1 sm:gap-2 p-2"
          style={{
            gridTemplateColumns: "repeat(11, var(--tile))",
          }}
        >
          {Array.from({ length: 121 }).map((_, i) => (
            <div
              key={i}
              tabIndex={-1}
              onPointerDown={(e) => e.preventDefault()}
              onFocus={(e) => (e.currentTarget as HTMLElement).blur()}
              onDragStart={(e) => e.preventDefault()}
              draggable={false}
              role="presentation"
              className="select-none caret-transparent bg-white/90 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-sm flex items-center justify-center text-xs sm:text-sm outline-none"
              style={{
                width: "var(--tile)",
                height: "var(--tile)",
              }}
            >
              {/* cell */}
            </div>
          ))}
        </div>

        {/* rack: 1 row of 7 tiles, using the same --tile size so squares match */}
        <div
          className="grid gap-1 sm:gap-2 p-2 mt-2"
          style={{
            gridTemplateColumns: "repeat(7, var(--tile))",
          }}
        >
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              tabIndex={-1}
              onPointerDown={(e) => e.preventDefault()}
              onFocus={(e) => (e.currentTarget as HTMLElement).blur()}
              onDragStart={(e) => e.preventDefault()}
              draggable={false}
              role="presentation"
              className="select-none caret-transparent bg-white/90 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-sm flex items-center justify-center text-xs sm:text-sm outline-none"
              style={{
                width: "var(--tile)",
                height: "var(--tile)",
              }}
            >
              {/* rack cell */}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
