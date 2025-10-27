export default function Tile({ 
    value, 
    score
}: {
    value: string, score: number 
}) {

  return (
    <div id="tile" className="bg-white/90 aspect-square flex items-center justify-center w-full h-full relative rounded-sm">
        <div id="tile-letter" className="text-4xl font-bold text-black leading-none">{value}</div>
        <div id="tile-score" className="absolute bottom-1 right-1 text-xs font-medium text-gray-600">{score}</div>
    </div>
  );
}