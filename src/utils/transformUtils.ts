import React from 'react';
import { BOARD_SIZE } from '../constants/board';
import { Position } from '../types/board';

/**
 * Clamps transform values to keep the dragged element within container boundaries
 * @param transform - The drag transform {x, y}
 * @param elementRef - Ref to the element being dragged
 * @param containerRef - Ref to the container that should bound the drag
 * @returns Clamped {x, y} transform values
 */
export function clampTransformToContainer(
    transform: { x: number; y: number },
    elementRef: React.RefObject<HTMLElement | null>,
    containerRef?: React.RefObject<HTMLElement | null>
): { x: number; y: number } {
    if (!containerRef?.current || !elementRef.current) {
        return transform;
    }

    const containerRect = containerRef.current.getBoundingClientRect();
    const elementRect = elementRef.current.getBoundingClientRect();

    // Calculate the element's position if the transform was applied
    const newLeft = elementRect.left + transform.x;
    const newTop = elementRect.top + transform.y;
    const newRight = newLeft + elementRect.width;
    const newBottom = newTop + elementRect.height;

    // Calculate how much we need to clamp by
    let clampedX = transform.x;
    let clampedY = transform.y;

    // Clamp horizontally
    if (newLeft < containerRect.left) {
        clampedX = transform.x + (containerRect.left - newLeft);
    } else if (newRight > containerRect.right) {
        clampedX = transform.x - (newRight - containerRect.right);
    }

    // Clamp vertically
    if (newTop < containerRect.top) {
        clampedY = transform.y + (containerRect.top - newTop);
    } else if (newBottom > containerRect.bottom) {
        clampedY = transform.y - (newBottom - containerRect.bottom);
    }

    return { x: clampedX, y: clampedY };
}

export function getGridConstrainedTransform(
    transform: { x: number; y: number } | null,
    row: number,
    col: number,
    cellSize: number,
    cellRef?: React.RefObject<HTMLElement | null>,
    gameAreaRef?: React.RefObject<HTMLElement | null>
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
    
    // If outside board, use free-floating transform (with boundary clamping)
    if (isOutsideBoard) {
        const clampedTransform = cellRef 
            ? clampTransformToContainer(transform, cellRef, gameAreaRef)
            : transform;
        return {
            transform: `translate3d(${clampedTransform.x}px, ${clampedTransform.y}px, 0)`,
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
 * Snaps directly to the target board cell position when over a board cell
 * @param transform - The drag transform (relative to rack tile's original position)
 * @param boardCellSize - Size of board cells (including gap)
 * @param overBoardPos - Position of the board cell being dragged over, or null if not over board
 * @param rackCellRef - Ref to the rack cell DOM element
 * @param boardRef - Ref to the board container DOM element
 * @param gameAreaRef - Ref to the game area container for boundary clamping
 * @returns Transform style object or undefined
 */
export function getRackTileTransformOverBoard(
    transform: { x: number; y: number } | null,
    boardCellSize: number,
    overBoardPos: Position | null,
    rackCellRef: React.RefObject<HTMLDivElement | null>,
    boardRef?: React.RefObject<HTMLDivElement | null>,
    gameAreaRef?: React.RefObject<HTMLElement | null>
): { transform?: string } | undefined {
    if (!transform) return undefined;
    
    // If dragging over a board cell, calculate absolute position to snap to that cell
    if (overBoardPos !== null && rackCellRef.current && boardRef?.current) {
        // Find the actual board cell element at the target position
        const boardCells = boardRef.current.querySelectorAll('[id="board-cell"]');
        const targetBoardCell = Array.from(boardCells)[overBoardPos.row * BOARD_SIZE + overBoardPos.col] as HTMLElement;
        
        if (targetBoardCell) {
            // Get positions of both elements
            // The rackCellRef points to the outer container, which doesn't move
            // The transform will be applied to the inner tile div
            const rackCellRect = rackCellRef.current.getBoundingClientRect();
            const boardCellRect = targetBoardCell.getBoundingClientRect();
            
            // Calculate center positions
            const rackCenterX = rackCellRect.left + rackCellRect.width / 2;
            const rackCenterY = rackCellRect.top + rackCellRect.height / 2;
            
            const boardCenterX = boardCellRect.left + boardCellRect.width / 2;
            const boardCenterY = boardCellRect.top + boardCellRect.height / 2;
            
            // Calculate the transform needed to move from rack center to board center
            // CSS transforms are relative to the element's original position
            // Since the tile div is positioned at (0,0) relative to the rack cell container,
            // we need to calculate: target position - rack cell position
            // But we need to account for the fact that the tile fills the rack cell
            const snapX = boardCenterX - rackCenterX;
            const snapY = boardCenterY - rackCenterY;
            
            return {
                transform: `translate3d(${snapX}px, ${snapY}px, 0)`,
            };
        }
    }
    
    // Otherwise, free-floating (use the raw transform with boundary clamping)
    const clampedTransform = clampTransformToContainer(transform, rackCellRef, gameAreaRef);
    return {
        transform: `translate3d(${clampedTransform.x}px, ${clampedTransform.y}px, 0)`,
    };
}

/**
 * Calculate grid-snapped transform when dragging a tile over a rack cell
 * Snaps directly to the target rack cell position when over a rack cell
 * Works for both rack → rack and board → rack scenarios
 * @param transform - The drag transform (relative to tile's original position)
 * @param overRackIndex - Index of the rack cell being dragged over, or null if not over rack
 * @param sourceCellRef - Ref to the source cell DOM element (rack or board cell)
 * @param rackRef - Ref to the rack container DOM element
 * @param sourceIndex - Index of the source rack cell (for rack → rack), or null for board → rack
 * @param gameAreaRef - Ref to the game area container for boundary clamping
 * @returns Transform style object or undefined
 */
export function getTileTransformOverRack(
    transform: { x: number; y: number } | null,
    overRackIndex: number | null,
    sourceCellRef: React.RefObject<HTMLDivElement | null>,
    rackRef?: React.RefObject<HTMLDivElement | null>,
    sourceIndex?: number | null,
    gameAreaRef?: React.RefObject<HTMLElement | null>
): { transform?: string } | undefined {
    if (!transform) return undefined;
    
    // If dragging over a rack cell, calculate absolute position to snap to that cell
    if (overRackIndex !== null && sourceCellRef.current && rackRef?.current) {
        // Find the actual rack cell element at the target position
        const rackCells = rackRef.current.querySelectorAll('[id="rack-cell"]');
        const targetRackCell = Array.from(rackCells)[overRackIndex] as HTMLElement;
        
        if (targetRackCell) {
            // Get positions of both elements
            const sourceCellRect = sourceCellRef.current.getBoundingClientRect();
            const targetRackCellRect = targetRackCell.getBoundingClientRect();
            
            // Calculate center positions
            const sourceCenterX = sourceCellRect.left + sourceCellRect.width / 2;
            const sourceCenterY = sourceCellRect.top + sourceCellRect.height / 2;
            
            const targetCenterX = targetRackCellRect.left + targetRackCellRect.width / 2;
            const targetCenterY = targetRackCellRect.top + targetRackCellRect.height / 2;
            
            // Calculate the transform needed to move from source center to target center
            // CSS transforms are relative to the element's original position
            const snapX = targetCenterX - sourceCenterX;
            const snapY = targetCenterY - sourceCenterY;
            
            return {
                transform: `translate3d(${snapX}px, ${snapY}px, 0)`,
            };
        }
    }
    
    // Otherwise, free-floating (use the raw transform with boundary clamping)
    const clampedTransform = clampTransformToContainer(transform, sourceCellRef, gameAreaRef);
    return {
        transform: `translate3d(${clampedTransform.x}px, ${clampedTransform.y}px, 0)`,
    };
}
