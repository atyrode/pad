/**
 * Rack styling constants
 * Centralized values for consistent rack layout calculations
 */
export const RACK_CONSTANTS = {
  // Rack container padding (in pixels)
  RACK_PADDING: 8,
  
  // Minimum cell size for rack tiles (in pixels)
  MIN_CELL_SIZE: 30,
  
  // Rack container margin (in pixels)
  RACK_MARGIN: 0,
  
} as const;

/**
 * Get the rack padding value as a CSS string
 */
export const getRackPaddingCSS = (): string => `${RACK_CONSTANTS.RACK_PADDING}px`;

/**
 * Get the rack margin value as a CSS string
 */
export const getRackMarginCSS = (): string => `${RACK_CONSTANTS.RACK_MARGIN}px`;

/**
 * Get the total padding value for calculations (padding + margin) × 2 sides
 */
export const getTotalRackPadding = (): number => (RACK_CONSTANTS.RACK_PADDING + RACK_CONSTANTS.RACK_MARGIN) * 2;
