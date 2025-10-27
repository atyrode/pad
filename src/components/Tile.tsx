export default function Tile({ 
    value, 
    score
}: {
    value: string, score: number 
}) {

  return (
    <div id="tile" className="bg-white aspect-square flex items-center justify-center rounded-sm relative select-none" style={{ userSelect: 'none' }}>
        <div id="tile-letter" className="text-4xl font-bold text-black leading-none">{value}</div>
        <div id="tile-score" className="absolute bottom-1 right-1 text-xs font-medium text-gray-600">{score}</div>
    </div>
  );
}