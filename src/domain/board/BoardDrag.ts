import { BOARD_SIZE } from '../../constants/board';

/**
 * BoardDrag domain module - Pure board coordinate transformations
 *
 * This module provides pure mathematical transformations for board coordinates,
 * without any DOM dependencies. Used by UI components for drag-and-drop grid snapping.
 */

/**
 * Compute grid snap for board dragging
 * Returns snapped x/y coordinates for grid-constrained dragging, or null if outside board boundaries
 *
 * @param transform - The drag transform {x, y} relative to current cell
 * @param row - Current row position (0-10)
 * @param col - Current column position (0-10)
 * @param cellSize - Size of each board cell
 * @param boardSize - Size of the board (default: BOARD_SIZE = 11)
 * @returns Snapped {x, y} coordinates, or null if outside board boundaries
 */
export function computeGridSnap(
    transform: { x: number; y: number } | null,
    row: number,
    col: number,
    cellSize: number,
    boardSize = BOARD_SIZE
): { x: number; y: number } | null {
    if (!transform) return null;

    // Calculate which grid cell the cursor is closest to relative to current position
    const targetCol = Math.round(transform.x / cellSize);
    const targetRow = Math.round(transform.y / cellSize);

    // Calculate board boundaries in transform space
    const minCol = -col;
    const maxCol = boardSize - 1 - col;
    const minRow = -row;
    const maxRow = boardSize - 1 - row;

    // Add threshold buffer to prevent rapid switching between modes
    // Use a buffer of 0.5 cells to create hysteresis
    const threshold = 0.5;
    const isOutsideBoard = targetCol < (minCol - threshold) || targetCol > (maxCol + threshold) ||
                           targetRow < (minRow - threshold) || targetRow > (maxRow + threshold);

    // If outside board, return null (free-floating mode)
    if (isOutsideBoard) {
        return null;
    }

    // Otherwise, constrain to valid grid positions relative to current cell
    const constrainedCol = Math.max(minCol, Math.min(maxCol, targetCol));
    const constrainedRow = Math.max(minRow, Math.min(maxRow, targetRow));

    // Calculate the snapped position relative to original position
    const snappedX = constrainedCol * cellSize;
    const snappedY = constrainedRow * cellSize;

    return { x: snappedX, y: snappedY };
}
