"use client";
import { useGame } from "../game/store";
import TileView from "./Tile";

export default function Board() {
  const { state, dispatch } = useGame();

  const handleClick = (index: number) => {
    // example interaction: toggle placeholder tile for now
    const existing = state.board[index]?.tile;
    if (existing) {
      dispatch({ type: "SET_BOARD_TILE", index, tile: null });
    } else {
      dispatch({
        type: "SET_BOARD_TILE",
        index,
        tile: { id: `t-${index}`, letter: "A", score: 1 },
      });
    }
  };

  return (
    <div
      className="grid gap-1 sm:gap-2 p-2"
      style={{
        gridTemplateColumns: `repeat(${state.boardWidth}, var(--tile))`,
      }}
    >
      {state.board.map((cell) => (
        <TileView key={cell.index} cell={cell} onClick={handleClick} />
      ))}
    </div>
  );
}