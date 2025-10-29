import { BOARD_SIZE } from '../constants/board';
import { Position } from '../types/board';

export function getGridConstrainedTransform(
    transform: { x: number; y: number } | null,
    row: number,
    col: number,
    cellSize: number
) {
    if (!transform) return undefined;
    
    // Calculate which grid cell the cursor is closest to relative to current position
    const targetCol = Math.round(transform.x / cellSize);
    const targetRow = Math.round(transform.y / cellSize);
    
    // Calculate board boundaries in transform space
    const minCol = -col;
    const maxCol = BOARD_SIZE - 1 - col;
    const minRow = -row;
    const maxRow = BOARD_SIZE - 1 - row;
    
    // Add threshold buffer to prevent rapid switching between modes
    // Use a buffer of 0.5 cells to create hysteresis
    const threshold = 0.5;
    const isOutsideBoard = targetCol < (minCol - threshold) || targetCol > (maxCol + threshold) || 
                           targetRow < (minRow - threshold) || targetRow > (maxRow + threshold);
    
    // If outside board, use free-floating transform
    if (isOutsideBoard) {
        return {
            transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        };
    }
    
    // Otherwise, constrain to valid grid positions relative to current cell
    const constrainedCol = Math.max(minCol, Math.min(maxCol, targetCol));
    const constrainedRow = Math.max(minRow, Math.min(maxRow, targetRow));
    
    // Calculate the snapped position relative to original position
    const snappedX = constrainedCol * cellSize;
    const snappedY = constrainedRow * cellSize;
    
    return {
        transform: `translate3d(${snappedX}px, ${snappedY}px, 0)`,
    };
}

/**
 * Calculate grid-snapped transform when dragging a rack tile over the board
 * Reuses the same grid snapping logic as board tiles for consistency
 * @param transform - The drag transform
 * @param boardCellSize - Size of board cells (including gap)
 * @param overBoardPos - Position of the board cell being dragged over, or null if not over board
 * @returns Transform style object or undefined
 */
export function getRackTileTransformOverBoard(
    transform: { x: number; y: number } | null,
    boardCellSize: number,
    overBoardPos: Position | null
): { transform?: string } | undefined {
    if (!transform) return undefined;
    
    // If dragging over a board cell, use the same grid snapping logic as board tiles
    if (overBoardPos !== null) {
        // Use getGridConstrainedTransform with the board cell's position
        // This ensures rack tiles snap exactly like board tiles do
        return getGridConstrainedTransform(
            transform,
            overBoardPos.row,
            overBoardPos.col,
            boardCellSize
        );
    }
    
    // Otherwise, free-floating
    return {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    };
}
