export default function Tile({ 
    value, 
    score
}: {
    value: string, score: number 
}) {

  return (
    <div id="tile" className="bg-white/90 aspect-square flex items-center justify-center max-w-full max-h-full relative">
        <div id="tile-letter" className="text-4xl font-bold text-black leading-none">{value}</div>
        <div id="tile-score" className="absolute bottom-2 right-3 text-xs font-medium text-gray-600">{score}</div>
    </div>
  );
}