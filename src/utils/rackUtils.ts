import type { RackState } from '../game/generated';

export function findTileInRack(rack: RackState, tileId: string): number | null {
    for (let i = 0; i < rack.length; i++) {
        if (rack[i]?.id === tileId) {
            return i;
        }
    }
    return null;
}

export function isRackSlotId(id: string): boolean {
    return id.startsWith('rack-');
}

export function parseRackSlotId(id: string): number | null {
    if (!isRackSlotId(id)) return null;
    
    const [, indexStr] = id.split('-');
    const index = parseInt(indexStr);
    return isNaN(index) ? null : index;
}

export function findFirstEmptySlot(rack: RackState): number | null {
    for (let i = 0; i < rack.length; i++) {
        if (rack[i] === null) {
            return i;
        }
    }
    return null;
}

