/**
 * General utility functions
 */

/**
 * Check if a string ID represents a rack slot
 */
export function isRackSlotId(id: string): boolean {
    return id.startsWith('rack-');
}

/**
 * Parse a rack slot ID string to extract the index
 */
export function parseRackSlotId(id: string): number | null {
    if (!isRackSlotId(id)) return null;

    const [, indexStr] = id.split('-');
    const index = parseInt(indexStr);
    return isNaN(index) ? null : index;
}
