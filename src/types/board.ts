import React from 'react';
import { TileData } from './tile';
import { Sticker } from './sticker';

export interface BoardCellState {
    tile: TileData | null;
    locked: boolean;
}

export type BoardState = BoardCellState[][];

export interface BoardCellProps {
    tile: TileData | null;
    locked: boolean;
    row: number;
    col: number;
    overRackIndex: number | null;
    rackRef?: React.RefObject<HTMLDivElement | null>;
    gameAreaRef?: React.RefObject<HTMLDivElement | null>;
    onRightClick?: (tile: TileData, position: Position) => boolean;
    sticker?: Sticker | null;
    tileOpacity?: number;
    showCoordinates?: boolean;
}

export interface Position {
    row: number;
    col: number;
}
