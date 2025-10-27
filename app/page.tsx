import Tile from "@/src/components/Tile";
import DebugMenu from "../src/components/DebugMenu";

export default function Home() {
  return (
    <div id="main" className="h-screen w-screen bg-zinc-500 flex">
      <DebugMenu />
      <div id="game-area" className="w-3/4 h-full bg-zinc-500">
      </div>
    </div>
  );
}
