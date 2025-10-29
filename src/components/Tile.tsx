export default function Tile({ 
    value, 
    score,
    locked = false
}: {
    value: string, score: number, locked?: boolean 
}) {

  return (
    <div id="tile" className={`${locked ? 'bg-zinc-300' : 'bg-white'} aspect-square flex items-center justify-center rounded-sm relative select-none`} style={{ userSelect: 'none' }}>
        <div id="tile-letter" className="text-4xl font-bold text-black leading-none">{value}</div>
        <div id="tile-score" className="absolute bottom-1 right-1 text-xs font-medium text-gray-600">{score}</div>
    </div>
  );
}