export interface TileData {
    id: string;
    value: string;
    score: number;
    originalValue?: string; // stores "*" when a blank is transformed
    displayValue?: string; // the letter the blank is representing
}
