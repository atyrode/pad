export interface TileData {
    id: string;
    value: string;
    score: number;
}

export type BoardState = (TileData | null)[][];

export interface BoardCellProps {
    tile: TileData | null;
    row: number;
    col: number;
}

export interface Position {
    row: number;
    col: number;
}

export type RackState = (TileData | null)[];

export interface RackCellProps {
    tile: TileData | null;
    index: number;
    boardCellSize: number;
    overBoardPos: Position | null;
    boardRef?: React.RefObject<HTMLDivElement | null>;
}

export interface RackPosition {
    index: number;
}
