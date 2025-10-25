/**
 * Board styling constants
 * Centralized values for consistent board layout calculations
 */
export const BOARD_CONSTANTS = {
  // Grid gap between cells (in pixels)
  GAP: 3,
  
  // Board padding (in pixels)
  BOARD_PADDING: 3,
  
  // Board margin (in pixels)
  BOARD_MARGIN: 10,
  
  // Board border width (in pixels)
  BORDER_WIDTH: 10,
  
  // Default cell size (fallback value)
  DEFAULT_CELL_SIZE: 60,

  // Default board width
  DEFAULT_WIDTH: 11,

  // Default board height
  DEFAULT_HEIGHT: 11,
} as const;


/**
 * Get the gap value as a CSS string
 */
export const getGapCSS = (): string => `${BOARD_CONSTANTS.GAP}px`;

/**
 * Get the total padding value for calculations (padding + margin) × 2 sides
 */
export const getTotalPadding = (): number => (BOARD_CONSTANTS.BOARD_PADDING + BOARD_CONSTANTS.BOARD_MARGIN) * 2;

/**
 * Get the total margin value for calculations (margin) × 2 sides
 */
export const getTotalMargin = (): number => BOARD_CONSTANTS.BOARD_MARGIN * 2;

/**
 * Get the padding value as a CSS string
 */
export const getPaddingCSS = (): string => `${BOARD_CONSTANTS.BOARD_PADDING}px`;

/**
 * Get the margin value as a CSS string
 */
export const getMarginCSS = (): string => `${BOARD_CONSTANTS.BOARD_MARGIN}px`;

/**
 * Calculate optimal cell size for given container dimensions and board size
 * This can be used to pre-compute the cell size before rendering
 */
export const calculateOptimalCellSize = (
  containerWidth: number,
  containerHeight: number,
  boardWidth: number,
  boardHeight: number
): number => {
  const padding = getTotalPadding();
  const margin = getTotalMargin();
  const gap = BOARD_CONSTANTS.GAP;
  
  const availableWidth = containerWidth - padding - margin;
  const availableHeight = containerHeight - padding - margin;
  
  // Calculate maximum cell size that fits both dimensions
  const maxCellWidth = (availableWidth - (gap * (boardWidth - 1))) / boardWidth;
  const maxCellHeight = (availableHeight - (gap * (boardHeight - 1))) / boardHeight;
  
  // Use the smaller dimension to ensure board always fits
  return Math.floor(Math.min(maxCellWidth, maxCellHeight));
};
