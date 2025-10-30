import { TileData } from './tile';
import { Position } from './board';

export type DraftSlotState = (TileData | null)[];

export interface DraftState {
    suggestedTiles: TileData[];
    draftSlots: DraftSlotState;
    selectedSlotIndex: number | null;
}

export interface DraftSlotInfo {
    position: Position;
    slotIndex: number;
    tile: TileData | null;
    isSelected: boolean;
}
