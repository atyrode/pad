import { TileData } from './tile';

export type Direction = 'right' | 'down';

export interface BoardCellState {
    tile: TileData | null;
    canPlace: boolean;
    canTake: boolean;
}

export type BoardState = BoardCellState[][];

export interface Position {
    row: number;
    col: number;
}

export interface PlacementHistoryEntry {
    tileId: string;
    position: Position;
    wasBlank?: boolean; // true if the tile was originally a "*"
}
