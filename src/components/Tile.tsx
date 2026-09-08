export default function Tile({ 
    value, 
    score,
    locked = false,
    originalValue,
    displayValue
}: {
    value: string, score: number, locked?: boolean, originalValue?: string, displayValue?: string
}) {
  // Check if this is a transformed blank tile
  const isTransformedBlank = originalValue === "*";
  const displayLetter = displayValue || value;

  return (
    <div data-tile="" className={`${locked ? 'bg-zinc-300' : 'bg-white'} aspect-square flex items-center justify-center rounded-sm relative select-none`} style={{ userSelect: 'none' }}>
        <div data-tile-letter="" className={`text-4xl font-bold leading-none ${isTransformedBlank ? 'text-purple-600' : 'text-black'}`}>{displayLetter}</div>
        <div data-tile-score="" className="absolute bottom-1 right-1 text-xs font-medium text-gray-600">{score}</div>
    </div>
  );
}