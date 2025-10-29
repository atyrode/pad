import { useState, useEffect, useCallback } from 'react';
import { BOARD_SIZE } from '../constants/board';

export type Direction = 'right' | 'down';

export interface SelectorState {
  position: { row: number; col: number };
  direction: Direction | null;
  visible: boolean;
}

interface UseKeyboardSelectorProps {
  onLetterInput?: (letter: string) => boolean;
  onBackspace?: () => { success: boolean; position?: { row: number; col: number } };
}

export const useKeyboardSelector = (props?: UseKeyboardSelectorProps) => {
  const [selectorState, setSelectorState] = useState<SelectorState>({
    position: { row: 5, col: 5 }, // Center of 11x11 board
    direction: null,
    visible: false,
  });

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
      // Move selector forward in current direction after successful placement
      setSelectorState(prevState => {
        const { row, col } = prevState.position;
        let newRow = row;
        let newCol = col;

        if (prevState.direction === 'right') {
          newCol = (col + 1) % BOARD_SIZE;
        } else if (prevState.direction === 'down') {
          newRow = (row + 1) % BOARD_SIZE;
        }

        return {
          ...prevState,
          position: { row: newRow, col: newCol },
        };
      });
    }
    return success;
  }, [props?.onLetterInput, selectorState.visible, selectorState.direction]);

  const handleBackspace = useCallback(() => {
    if (!props?.onBackspace || !selectorState.visible) {
      return false;
    }

    // Call the removal handler and get result with position
    const result = props.onBackspace();
    if (result.success && result.position) {
      // Move selector to where the tile was removed
      setSelectorState(prevState => ({
        ...prevState,
        position: result.position!,
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
  }, [moveSelector, toggleDirection, handleLetterInput, handleBackspace]);

  useEffect(() => {
    // Add keyboard event listener
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup on unmount
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return {
    selectedCell: selectorState.visible ? selectorState.position : null,
    selectorDirection: selectorState.direction,
    isSelectorVisible: selectorState.visible,
  };
};
