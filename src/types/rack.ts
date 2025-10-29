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
}

export interface RackPosition {
    index: number;
}
