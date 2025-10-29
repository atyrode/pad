import { BoardState, Position } from '../types/board';
import { TileData } from '../types/tile';
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
    const initialBoard: BoardState = Array(BOARD_SIZE).fill(null).map(() => 
        Array(BOARD_SIZE).fill(null).map(() => ({ tile: null, locked: false }))
    );
    return initialBoard;
}

export function removeTileFromBoard(board: BoardState, pos: Position): BoardState {
    const newBoard = board.map(row => [...row]);
    newBoard[pos.row][pos.col] = { tile: null, locked: false };
    return newBoard;
}

export function placeTileOnBoard(board: BoardState, tile: TileData, pos: Position): BoardState {
    const newBoard = board.map(row => [...row]);
    newBoard[pos.row][pos.col] = { tile, locked: false };
    return newBoard;
}

export interface WordInfo {
    word: string;
    position: Position;
    direction: 'horizontal' | 'vertical';
    isLocked: boolean;
}

export function findAllWords(board: BoardState): WordInfo[] {
    const words: WordInfo[] = [];

    // Find horizontal words
    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            const cell = board[row][col];
            const tile = cell.tile;
            
            // Check if this tile is the start of a horizontal word
            // It's a start if: it's at column 0, or the cell to the left is empty
            const isLeftmost = col === 0 || board[row][col - 1].tile === null;
            
            if (tile !== null && isLeftmost) {
                // Collect consecutive tiles to the right
                let word = '';
                let currentCol = col;
                let allTilesLocked = true;
                
                while (currentCol < BOARD_SIZE && board[row][currentCol].tile !== null) {
                    word += board[row][currentCol].tile!.value;
                    // Check if this tile is locked
                    if (!board[row][currentCol].locked) {
                        allTilesLocked = false;
                    }
                    currentCol++;
                }
                
                // Add word only if it has 2+ tiles (single letters are not valid words)
                if (word.length >= 2) {
                    words.push({
                        word,
                        position: { row, col },
                        direction: 'horizontal',
                        isLocked: allTilesLocked
                    });
                }
            }
        }
    }

    // Find vertical words
    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            const cell = board[row][col];
            const tile = cell.tile;
            
            // Check if this tile is the start of a vertical word
            // It's a start if: it's at row 0, or the cell above is empty
            const isTopmost = row === 0 || board[row - 1][col].tile === null;
            
            if (tile !== null && isTopmost) {
                // Collect consecutive tiles below
                let word = '';
                let currentRow = row;
                let allTilesLocked = true;
                
                while (currentRow < BOARD_SIZE && board[currentRow][col].tile !== null) {
                    word += board[currentRow][col].tile!.value;
                    // Check if this tile is locked
                    if (!board[currentRow][col].locked) {
                        allTilesLocked = false;
                    }
                    currentRow++;
                }
                
                // Add word only if it has 2+ tiles (single letters are not valid words)
                if (word.length >= 2) {
                    words.push({
                        word,
                        position: { row, col },
                        direction: 'vertical',
                        isLocked: allTilesLocked
                    });
                }
            }
        }
    }

    return words;
}
