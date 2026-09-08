import { useCallback, useLayoutEffect, useState, type RefObject } from 'react';
import { useDndMonitor } from '@dnd-kit/core';
import { CELL_GAP } from '../constants/board';
import type { DragGeometry } from '../utils/transformUtils';

/** Measure the board once; cells and rack share the same snapping pitch. */
export function useCellSize(
    boardRef: RefObject<HTMLDivElement | null>,
    onCellSizeChange: (size: number) => void
) {
    const [cellSize, setCellSize] = useState(0);

    useLayoutEffect(() => {
        const board = boardRef.current;
        const cell = board?.querySelector<HTMLElement>('[data-board-cell]');
        if (!board || !cell) return;
        const measure = () => {
            const size = cell.offsetWidth + CELL_GAP;
            setCellSize(size);
            onCellSizeChange(size);
        };
        const observer = new ResizeObserver(measure);
        observer.observe(board);
        observer.observe(cell);
        return () => observer.disconnect();
    }, [boardRef, onCellSizeChange]);

    return cellSize;
}

/** DOM reads happen at drag start and layout events, never during render. */
export function useDragGeometry(
    tileId: string,
    sourceRef: RefObject<HTMLDivElement | null>,
    boardRef?: RefObject<HTMLDivElement | null>,
    rackRef?: RefObject<HTMLDivElement | null>,
    gameAreaRef?: RefObject<HTMLDivElement | null>
) {
    const [geometry, setGeometry] = useState<DragGeometry | null>(null);
    const [dragging, setDragging] = useState(false);
    const measure = useCallback(() => {
        const source = sourceRef.current;
        if (!source) return;
        setGeometry({
            source: source.getBoundingClientRect(),
            container: gameAreaRef?.current?.getBoundingClientRect() ?? null,
            board: Array.from(boardRef?.current?.querySelectorAll<HTMLElement>('[data-board-cell]') ?? [],
                cell => cell.getBoundingClientRect()),
            rack: Array.from(rackRef?.current?.querySelectorAll<HTMLElement>('[data-rack-cell]') ?? [],
                cell => cell.getBoundingClientRect()),
        });
    }, [sourceRef, boardRef, rackRef, gameAreaRef]);

    useDndMonitor({
        onDragStart({ active }) {
            if (active.id !== tileId) return;
            measure();
            setDragging(true);
        },
        onDragEnd({ active }) {
            if (active.id === tileId) setDragging(false);
        },
        onDragCancel({ active }) {
            if (active.id === tileId) setDragging(false);
        },
    });

    useLayoutEffect(() => {
        if (!dragging) return;
        const observer = new ResizeObserver(measure);
        for (const node of [sourceRef.current, boardRef?.current, rackRef?.current, gameAreaRef?.current]) {
            if (node) observer.observe(node);
        }
        window.addEventListener('resize', measure);
        window.addEventListener('scroll', measure, true);
        return () => {
            observer.disconnect();
            window.removeEventListener('resize', measure);
            window.removeEventListener('scroll', measure, true);
        };
    }, [dragging, measure, sourceRef, boardRef, rackRef, gameAreaRef]);

    return geometry;
}
