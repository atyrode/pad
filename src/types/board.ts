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
