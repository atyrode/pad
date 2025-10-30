import React from 'react';
import { TileData } from './tile';
import { Position } from './board';

export type RackState = (TileData | null)[];

export interface RackCellProps {
    tile: TileData | null;
    index: number;
    boardCellSize: number;
    overBoardPos: Position | null;
    overRackIndex: number | null;
    boardRef?: React.RefObject<HTMLDivElement | null>;
    rackRef?: React.RefObject<HTMLDivElement | null>;
    gameAreaRef?: React.RefObject<HTMLDivElement | null>;
    selectedCell?: Position | null;
    onRackRightClick?: (tile: TileData, rackIndex: number) => boolean;
}

export interface RackPosition {
    index: number;
}
