import Tile from "@/src/components/Tile";
import DebugMenu from "../src/components/DebugMenu";
import Board from "../src/components/Board";

export default function Home() {
  return (
    <div id="main" className="h-screen w-screen bg-zinc-500 flex">
      <DebugMenu />
      <div id="game-area" className="grow bg-zinc-500 flex items-center justify-center">
        <Board />
      </div>
    </div>
  );
}
