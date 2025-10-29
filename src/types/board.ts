import React from 'react';
import { TileData } from './tile';

export type BoardState = (TileData | null)[][];

export interface BoardCellProps {
    tile: TileData | null;
    row: number;
    col: number;
    overRackIndex: number | null;
    rackRef?: React.RefObject<HTMLDivElement | null>;
    gameAreaRef?: React.RefObject<HTMLDivElement | null>;
    onRightClick?: (tile: TileData, position: Position) => boolean;
}

export interface Position {
    row: number;
    col: number;
}
