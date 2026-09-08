import { useState, useEffect, useCallback } from 'react';
import { BOARD_SIZE } from '../constants/board';
import { BoardState } from '../types/board';

export type Direction = 'right' | 'down';

export interface SelectorState {
  position: { row: number; col: number };
  direction: Direction | null;
  visible: boolean;
}

interface UseKeyboardSelectorProps {
  onLetterInput?: (letter: string) => boolean;
  onBackspace?: () => { success: boolean; position?: { row: number; col: number } };
  onShuffle?: () => void;
  onPlay?: () => void;
  board?: BoardState;
}

export const useKeyboardSelector = (props?: UseKeyboardSelectorProps) => {
  const [selectorState, setSelectorState] = useState<SelectorState>({
    position: { row: 5, col: 5 }, // Center of 11x11 board
    direction: null,
    visible: false,
  });

  // Helper function to find the next placeable cell in the given direction
  const findNextNonLockedCell = useCallback((startRow: number, startCol: number, direction: Direction): { row: number; col: number } | null => {
    if (!props?.board) {
      // If no board provided, fall back to simple movement
      if (direction === 'right') {
        return { row: startRow, col: (startCol + 1) % BOARD_SIZE };
      } else {
        return { row: (startRow + 1) % BOARD_SIZE, col: startCol };
      }
    }

    let currentRow = startRow;
    let currentCol = startCol;
    const startPosition = { row: startRow, col: startCol };
    let attempts = 0;
    const maxAttempts = BOARD_SIZE; // Prevent infinite loop

    do {
      // Move in the specified direction
      if (direction === 'right') {
        currentCol = (currentCol + 1) % BOARD_SIZE;
      } else {
        currentRow = (currentRow + 1) % BOARD_SIZE;
      }

      // Check if we've wrapped around to the starting position
      if (currentRow === startPosition.row && currentCol === startPosition.col) {
        return null; // No non-locked cells found
      }

      // Check if current cell can accept a placement
      const cell = props.board[currentRow][currentCol];
      if (cell.canPlace) {
        return { row: currentRow, col: currentCol };
      }

      attempts++;
    } while (attempts < maxAttempts);

    return null; // No non-locked cells found
  }, [props?.board]);

  const moveSelector = useCallback((arrowDirection: 'up' | 'down' | 'left' | 'right') => {
    setSelectorState(prevState => {
      if (!prevState.visible) {
        // First arrow press - show selector at center and set direction to 'right'
        const { row, col } = prevState.position;
        let newRow = row;
        let newCol = col;

        // Move in the pressed arrow direction
        switch (arrowDirection) {
          case 'up':
            newRow = (row - 1 + BOARD_SIZE) % BOARD_SIZE;
            break;
          case 'down':
            newRow = (row + 1) % BOARD_SIZE;
            break;
          case 'left':
            newCol = (col - 1 + BOARD_SIZE) % BOARD_SIZE;
            break;
          case 'right':
            newCol = (col + 1) % BOARD_SIZE;
            break;
        }

        return {
          position: { row: newRow, col: newCol },
          direction: 'right', // Default direction
          visible: true,
        };
      }

      // Subsequent arrow presses - move in the pressed direction
      const { row, col } = prevState.position;
      let newRow = row;
      let newCol = col;

      switch (arrowDirection) {
        case 'up':
          newRow = (row - 1 + BOARD_SIZE) % BOARD_SIZE;
          break;
        case 'down':
          newRow = (row + 1) % BOARD_SIZE;
          break;
        case 'left':
          newCol = (col - 1 + BOARD_SIZE) % BOARD_SIZE;
          break;
        case 'right':
          newCol = (col + 1) % BOARD_SIZE;
          break;
      }

      return {
        ...prevState,
        position: { row: newRow, col: newCol },
      };
    });
  }, []);

  const toggleDirection = useCallback(() => {
    setSelectorState(prevState => {
      if (!prevState.visible) {
        return prevState; // Can't toggle if not visible
      }

      return {
        ...prevState,
        direction: prevState.direction === 'right' ? 'down' : 'right',
      };
    });
  }, []);

  const handleLetterInput = useCallback((letter: string) => {
    if (!props?.onLetterInput || !selectorState.visible) {
      return false;
    }

    const success = props.onLetterInput(letter);
    if (success && selectorState.direction) {
      // Move selector forward in current direction after successful placement, skipping non-placeable tiles
      setSelectorState(prevState => {
        if (!prevState.direction) return prevState;
        const { row, col } = prevState.position;
        const nextPosition = findNextNonLockedCell(row, col, prevState.direction);
        
        if (nextPosition) {
          return {
            ...prevState,
            position: nextPosition,
          };
        } else {
          // No placeable cells found, stay at current position
          return prevState;
        }
      });
    }
    return success;
  }, [props?.onLetterInput, selectorState.visible, selectorState.direction, findNextNonLockedCell]);

  const handleBackspace = useCallback(() => {
    if (!props?.onBackspace) {
      return false;
    }

    // If selector is not visible, make it visible first
    if (!selectorState.visible) {
      setSelectorState(prevState => ({
        ...prevState,
        visible: true,
        direction: 'right', // Default direction
      }));
    }

    // Call the removal handler and get result with position
    const result = props.onBackspace();
    if (result.success && result.position) {
      // Move selector to where the tile was removed
      setSelectorState(prevState => ({
        ...prevState,
        position: result.position!,
        visible: true, // Ensure it stays visible
      }));
    }
    return result.success;
  }, [props?.onBackspace, selectorState.visible]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Handle letter keys (A-Z)
    if (event.key.length === 1 && /[a-zA-Z]/.test(event.key)) {
      event.preventDefault();
      handleLetterInput(event.key.toUpperCase());
    }
    // Handle backspace
    else if (event.code === 'Backspace') {
      event.preventDefault();
      handleBackspace();
    }
    // Handle arrow keys for movement
    else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
      event.preventDefault();

      const keyToDirection: Record<string, 'up' | 'down' | 'left' | 'right'> = {
        'ArrowUp': 'up',
        'ArrowDown': 'down',
        'ArrowLeft': 'left',
        'ArrowRight': 'right',
      };

      const direction = keyToDirection[event.code];
      if (direction) {
        moveSelector(direction);
      }
    }
    // Handle TAB key for direction toggle
    else if (event.code === 'Tab') {
      event.preventDefault();
      toggleDirection();
    }
    // Handle Space key for shuffle
    else if (event.code === 'Space') {
      event.preventDefault();
      if (props?.onShuffle) {
        props.onShuffle();
      }
    }
    // Handle Enter key for play
    else if (event.code === 'Enter') {
      event.preventDefault();
      if (props?.onPlay) {
        props.onPlay();
      }
    }
  }, [moveSelector, toggleDirection, handleLetterInput, handleBackspace]);

  useEffect(() => {
    // Add keyboard event listener
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup on unmount
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Function to advance selector after manual tile placement (like right-click)
  const advanceSelector = useCallback(() => {
    if (!selectorState.visible || !selectorState.direction) {
      return;
    }

    setSelectorState(prevState => {
      if (!prevState.direction) return prevState;
      const { row, col } = prevState.position;
      const nextPosition = findNextNonLockedCell(row, col, prevState.direction);
      
      if (nextPosition) {
        return {
          ...prevState,
          position: nextPosition,
        };
      } else {
        // No non-locked cells found, stay at current position
        return prevState;
      }
    });
  }, [selectorState.visible, selectorState.direction, findNextNonLockedCell]);

  return {
    selectedCell: selectorState.visible ? selectorState.position : null,
    selectorDirection: selectorState.direction,
    isSelectorVisible: selectorState.visible,
    advanceSelector,
  };
};
