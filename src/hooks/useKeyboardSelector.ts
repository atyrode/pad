import { KeyboardEvent, useRef, useState } from 'react';
import { BOARD_SIZE } from '../constants/board';
import { BoardState, Direction, Position } from '../types/board';

interface SelectorState {
    position: Position;
    direction: Direction | null;
    visible: boolean;
}

interface UseKeyboardSelectorProps {
    isEnabled: () => boolean;
    getBoard: () => BoardState;
    onLetterInput: (letter: string, position: Position) => boolean;
    onBackspace: () => { success: boolean; position?: Position };
    onShuffle: () => void;
    onPlay: () => void;
    onDiscard: (position: Position | null) => void;
}

const initialSelector: SelectorState = {
    position: { row: 5, col: 5 }, direction: null, visible: false,
};

export function useKeyboardSelector(props: UseKeyboardSelectorProps) {
    const [selector, setSelector] = useState(initialSelector);
    const latest = useRef(selector);
    const update = (next: SelectorState) => {
        latest.current = next;
        setSelector(next);
    };
    const resetSelector = () => update(initialSelector);
    const getSelectedCell = () => latest.current.visible ? latest.current.position : null;

    const advanceSelector = () => {
        const current = latest.current;
        if (!current.visible || !current.direction) return;
        const board = props.getBoard();
        for (let step = 1; step < BOARD_SIZE; step++) {
            const row = (current.position.row + (current.direction === 'down' ? step : 0)) % BOARD_SIZE;
            const col = (current.position.col + (current.direction === 'right' ? step : 0)) % BOARD_SIZE;
            if (board[row][col].canPlace) {
                update({ ...current, position: { row, col } });
                return;
            }
        }
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (!props.isEnabled() || event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.nativeEvent.isComposing) return;
        if (!(event.target instanceof HTMLElement) || event.target.closest('input, textarea, select, button, a, summary, [contenteditable]:not([contenteditable="false"])')) return;
        const isLetter = /^[a-zA-Z]$/.test(event.key);
        // Shift-letter still types capitals; Shift+Tab and other modified keys stay native.
        if (event.shiftKey && !isLetter) return;
        const current = latest.current;
        if (event.key === 'Tab') {
            if (!current.visible) return;
            event.preventDefault();
            update({ ...current, direction: current.direction === 'right' ? 'down' : 'right' });
        } else if (event.key.startsWith('Arrow')) {
            const delta = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[event.key];
            if (!delta) return;
            event.preventDefault();
            update({
                position: {
                    row: (current.position.row + delta[0] + BOARD_SIZE) % BOARD_SIZE,
                    col: (current.position.col + delta[1] + BOARD_SIZE) % BOARD_SIZE,
                },
                direction: current.direction ?? 'right', visible: true,
            });
        } else if (isLetter) {
            event.preventDefault();
            if (current.visible && props.onLetterInput(event.key.toUpperCase(), current.position)) advanceSelector();
        } else if (event.key === 'Backspace') {
            event.preventDefault();
            const result = props.onBackspace();
            update({ ...current, position: result.position ?? current.position,
                direction: current.direction ?? 'right', visible: true });
        } else if (event.key === ' ') {
            event.preventDefault();
            props.onShuffle();
        } else if (event.key === 'Enter') {
            event.preventDefault();
            props.onPlay();
        } else if (event.key === 'Delete') {
            event.preventDefault();
            props.onDiscard(getSelectedCell());
        } else if (event.key === 'Escape') {
            event.preventDefault();
            resetSelector();
            event.currentTarget.blur();
        }
    };

    return { selectedCell: selector.visible ? selector.position : null,
        selectorDirection: selector.direction, getSelectedCell, advanceSelector, resetSelector, handleKeyDown };
}
