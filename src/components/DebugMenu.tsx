import { useState } from 'react';
import { Bag } from '../types/board';

interface DebugMenuProps {
  bag: Bag;
}

export default function DebugMenu({ bag }: DebugMenuProps) {
  const [isBagExpanded, setIsBagExpanded] = useState(false);

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
    </div>
  );
}