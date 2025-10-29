import { BoardState, TileData, Position } from '../types/board';
import { BOARD_SIZE } from '../constants/board';

export function findTilePosition(board: BoardState, tileId: string): Position | null {
    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            if (board[row][col]?.id === tileId) {
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

export function swapBoardTiles(board: BoardState, pos1: Position, pos2: Position): BoardState {
    const newBoard = board.map(row => [...row]);
    
    // Swap tiles
    const tile1 = newBoard[pos1.row][pos1.col];
    const tile2 = newBoard[pos2.row][pos2.col];
    
    newBoard[pos1.row][pos1.col] = tile2;
    newBoard[pos2.row][pos2.col] = tile1;
    
    return newBoard;
}

export function createInitialBoard(): BoardState {
    const initialBoard: BoardState = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));

    // Add some sample tiles for testing
    initialBoard[5][5] = { id: 'tile-1', value: 'A', score: 1 };
    initialBoard[5][6] = { id: 'tile-2', value: 'B', score: 3 };
    initialBoard[6][5] = { id: 'tile-3', value: 'C', score: 3 };
    initialBoard[6][6] = { id: 'tile-4', value: 'D', score: 2 };
    initialBoard[4][5] = { id: 'tile-5', value: 'E', score: 1 };

    return initialBoard;
}

export function removeTileFromBoard(board: BoardState, pos: Position): BoardState {
    const newBoard = board.map(row => [...row]);
    newBoard[pos.row][pos.col] = null;
    return newBoard;
}

export function placeTileOnBoard(board: BoardState, tile: TileData, pos: Position): BoardState {
    const newBoard = board.map(row => [...row]);
    newBoard[pos.row][pos.col] = tile;
    return newBoard;
}
