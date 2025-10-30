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
        Array(BOARD_SIZE).fill(null).map(() => ({ tile: null, canPlace: true, canTake: true }))
    );
    return initialBoard;
}

export function removeTileFromBoard(board: BoardState, pos: Position): BoardState {
    const newBoard = board.map(row => [...row]);
    newBoard[pos.row][pos.col] = { tile: null, canPlace: true, canTake: true };
    return newBoard;
}

export function placeTileOnBoard(board: BoardState, tile: TileData, pos: Position): BoardState {
    const newBoard = board.map(row => [...row]);
    newBoard[pos.row][pos.col] = { tile, canPlace: true, canTake: true };
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
                    // Check if this tile is locked (non-takeable)
                    if (board[row][currentCol].canTake) {
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
                    // Check if this tile is locked (non-takeable)
                    if (board[currentRow][col].canTake) {
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

/**
 * Check if all unlocked tiles on the board form a single contiguous line
 * (either all in one row OR all in one column, allowing gaps filled by locked tiles)
 * Returns true if no unlocked tiles exist (empty board)
 */
export function areUnlockedTilesInSingleLine(board: BoardState): boolean {
    // Collect all unlocked tile positions
    const unlockedPositions: Position[] = [];
    
    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            const cell = board[row][col];
            if (cell.tile && cell.canTake) {
                unlockedPositions.push({ row, col });
            }
        }
    }
    
    // If no unlocked tiles, this is valid (empty board)
    if (unlockedPositions.length === 0) {
        return true;
    }
    
    // If only one tile, it's always valid
    if (unlockedPositions.length === 1) {
        return true;
    }
    
    // Check if all tiles are in the same row
    const allSameRow = unlockedPositions.every(pos => pos.row === unlockedPositions[0].row);
    if (allSameRow) {
        // Sort by column and check for gaps
        const sortedByCol = unlockedPositions.sort((a, b) => a.col - b.col);
        const row = sortedByCol[0].row;
        
        for (let i = 1; i < sortedByCol.length; i++) {
            const currentCol = sortedByCol[i].col;
            const prevCol = sortedByCol[i-1].col;
            
            // Check if there's a gap between consecutive unlocked tiles
            if (currentCol - prevCol > 1) {
                // Check if the gap is filled by locked tiles
                let hasLockedTileInGap = false;
                for (let col = prevCol + 1; col < currentCol; col++) {
                    if (board[row][col].tile && !board[row][col].canTake) {
                        hasLockedTileInGap = true;
                        break;
                    }
                }
                if (!hasLockedTileInGap) {
                    return false; // Gap not filled by locked tiles
                }
            }
        }
        return true; // All tiles in same row with gaps filled by locked tiles
    }
    
    // Check if all tiles are in the same column
    const allSameCol = unlockedPositions.every(pos => pos.col === unlockedPositions[0].col);
    if (allSameCol) {
        // Sort by row and check for gaps
        const sortedByRow = unlockedPositions.sort((a, b) => a.row - b.row);
        const col = sortedByRow[0].col;
        
        for (let i = 1; i < sortedByRow.length; i++) {
            const currentRow = sortedByRow[i].row;
            const prevRow = sortedByRow[i-1].row;
            
            // Check if there's a gap between consecutive unlocked tiles
            if (currentRow - prevRow > 1) {
                // Check if the gap is filled by locked tiles
                let hasLockedTileInGap = false;
                for (let row = prevRow + 1; row < currentRow; row++) {
                    if (board[row][col].tile && !board[row][col].canTake) {
                        hasLockedTileInGap = true;
                        break;
                    }
                }
                if (!hasLockedTileInGap) {
                    return false; // Gap not filled by locked tiles
                }
            }
        }
        return true; // All tiles in same column with gaps filled by locked tiles
    }
    
    // Tiles are scattered across multiple rows AND columns
    return false;
}
