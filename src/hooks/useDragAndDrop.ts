import { useCallback, useRef, useState } from 'react';
import {
    DragEndEvent,
    DragStartEvent,
    DragOverEvent,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import type { Position } from '../game/generated';
import type { GameState, TileTarget } from '../game/runtime';
import { DRAG_ACTIVATION_DISTANCE } from '../constants/board';
import { findTilePosition, parseEmptySlotId } from '../utils/boardUtils';
import { findTileInRack, parseRackSlotId } from '../utils/rackUtils';

export type DropTarget = TileTarget | { zone: 'discard' };

interface UseDragAndDropProps {
    getState: () => GameState;
    isEnabled: () => boolean;
    onDrop: (tileId: string, target: DropTarget) => void;
}

export function useDragAndDrop({ getState, isEnabled, onDrop }: UseDragAndDropProps) {
    const [overBoardPos, setOverBoardPos] = useState<Position | null>(null);
    const [overRackIndex, setOverRackIndex] = useState<number | null>(null);
    const [activeId, setActiveId] = useState<string | null>(null);
    const draggingId = useRef<string | null>(null);
    const sensors = useSensors(useSensor(PointerSensor, {
        activationConstraint: { distance: DRAG_ACTIVATION_DISTANCE },
    }));

    const clearDrag = useCallback(() => {
        draggingId.current = null;
        setActiveId(null);
        setOverBoardPos(null);
        setOverRackIndex(null);
    }, []);

    const resolveTarget = (id: string): DropTarget | null => {
        const state = getState();
        if (state.mode === 'game') {
            if (id === 'discard-slot') return { zone: 'discard' };
            const index = parseRackSlotId(id) ?? findTileInRack(state.rack, id);
            if (index !== null) return { zone: 'rack', index };
        }
        const board = state.mode === 'draft' ? state.draft.board : state.board;
        const position = findTilePosition(board, id) ?? parseEmptySlotId(id);
        return position ? { zone: state.mode === 'draft' ? 'draft' : 'board', ...position } : null;
    };

    const handleDragStart = (event: DragStartEvent) => {
        clearDrag();
        if (!isEnabled()) return;
        draggingId.current = String(event.active.id);
        setActiveId(draggingId.current);
    };

    const handleDragOver = (event: DragOverEvent) => {
        if (!draggingId.current || !isEnabled()) {
            clearDrag();
            return;
        }
        const target = event.over ? resolveTarget(String(event.over.id)) : null;
        setOverBoardPos(target?.zone === 'board' || target?.zone === 'draft'
            ? { row: target.row, col: target.col } : null);
        setOverRackIndex(target?.zone === 'rack' ? target.index : null);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const tileId = draggingId.current;
        const target = event.over ? resolveTarget(String(event.over.id)) : null;
        // Clear even when the page intercepts a discard or opens the blank chooser.
        clearDrag();
        if (tileId === String(event.active.id) && target && isEnabled()) onDrop(tileId, target);
    };

    return { sensors, handleDragStart, handleDragOver, handleDragEnd,
        handleDragCancel: clearDrag, clearDrag, overBoardPos, overRackIndex, activeId };
}
