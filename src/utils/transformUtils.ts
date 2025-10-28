import { BOARD_SIZE } from '../constants/board';

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
    
    // Constrain to valid grid positions relative to current cell
    const constrainedCol = Math.max(-col, Math.min(BOARD_SIZE - 1 - col, targetCol));
    const constrainedRow = Math.max(-row, Math.min(BOARD_SIZE - 1 - row, targetRow));
    
    // Calculate the snapped position relative to original position
    const snappedX = constrainedCol * cellSize;
    const snappedY = constrainedRow * cellSize;
    
    return {
        transform: `translate3d(${snappedX}px, ${snappedY}px, 0)`,
    };
}
