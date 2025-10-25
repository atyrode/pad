/**
 * Board styling constants
 * Centralized values for consistent board layout calculations
 */
export const BOARD_CONSTANTS = {
  // Grid gap between cells (in pixels)
  GAP: 3,
  
  // Board padding (in pixels)
  BOARD_PADDING: 8,
  
  // Board margin (in pixels)
  BOARD_MARGIN: 10,
  
  // Default cell size (fallback value)
  DEFAULT_CELL_SIZE: 60,
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
 * Get the padding value as a CSS string
 */
export const getPaddingCSS = (): string => `${BOARD_CONSTANTS.BOARD_PADDING}px`;

/**
 * Get the margin value as a CSS string
 */
export const getMarginCSS = (): string => `${BOARD_CONSTANTS.BOARD_MARGIN}px`;
