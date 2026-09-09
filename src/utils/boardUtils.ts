import type { BoardState, Position } from '../game/generated';
import { BOARD_SIZE } from '../constants/board';

export function findTilePosition(board: BoardState, tileId: string): Position | null {
    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            if (board[row][col]?.tile?.id === tileId) {
                return { row, col };
            }
        }
    }
    return null;
}

export function parseEmptySlotId(slotId: string): Position | null {
    if (!slotId.startsWith('empty-')) return null;
    
    const [, rowStr, colStr] = slotId.split('-');
    return { row: parseInt(rowStr), col: parseInt(colStr) };
}
