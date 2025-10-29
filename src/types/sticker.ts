export type StickerType = 'multi' | 'points' | 'start';

export interface Sticker {
    type: StickerType;
    value: number; // x2 for multi, +10 for points
    consumed: boolean;
}

export type StickerState = (Sticker | null)[][];

