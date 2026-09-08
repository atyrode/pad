import { BOARD_SIZE } from '../constants/board';

export interface CellRect {
    readonly left: number;
    readonly top: number;
    readonly width: number;
    readonly height: number;
    readonly right: number;
    readonly bottom: number;
}

export interface DragGeometry {
    source: CellRect;
    container: CellRect | null;
    board: readonly CellRect[];
    rack: readonly CellRect[];
}

type Translation = { x: number; y: number };

function clampTransformToContainer(transform: Translation, geometry: DragGeometry | null): Translation {
    if (!geometry?.container) return transform;
    const { source, container } = geometry;
    return {
        x: Math.max(container.left - source.left, Math.min(container.right - source.right, transform.x)),
        y: Math.max(container.top - source.top, Math.min(container.bottom - source.bottom, transform.y)),
    };
}

export function getGridConstrainedTransform(
    transform: Translation | null,
    row: number,
    col: number,
    cellSize: number,
    geometry: DragGeometry | null
) {
    if (!transform) return undefined;

    const targetCol = Math.round(transform.x / cellSize);
    const targetRow = Math.round(transform.y / cellSize);
    const minCol = -col;
    const maxCol = BOARD_SIZE - 1 - col;
    const minRow = -row;
    const maxRow = BOARD_SIZE - 1 - row;
    const threshold = 0.5;
    const isOutsideBoard = targetCol < minCol - threshold || targetCol > maxCol + threshold ||
        targetRow < minRow - threshold || targetRow > maxRow + threshold;

    if (cellSize <= 0 || isOutsideBoard) {
        const clamped = clampTransformToContainer(transform, geometry);
        return { transform: `translate3d(${clamped.x}px, ${clamped.y}px, 0)` };
    }

    const x = Math.max(minCol, Math.min(maxCol, targetCol)) * cellSize;
    const y = Math.max(minRow, Math.min(maxRow, targetRow)) * cellSize;
    return { transform: `translate3d(${x}px, ${y}px, 0)` };
}

/** Snap to a measured cell center, or clamp free movement to the game area. */
export function getCellSnappedTransform(
    transform: Translation | null,
    geometry: DragGeometry | null,
    target: CellRect | undefined
) {
    if (!transform) return undefined;
    if (geometry && target) {
        const { source } = geometry;
        const x = target.left + target.width / 2 - source.left - source.width / 2;
        const y = target.top + target.height / 2 - source.top - source.height / 2;
        return { transform: `translate3d(${x}px, ${y}px, 0)` };
    }
    const clamped = clampTransformToContainer(transform, geometry);
    return { transform: `translate3d(${clamped.x}px, ${clamped.y}px, 0)` };
}
