import { TileData, Bag } from '../types/board';

interface TileDistribution {
    value: string;
    score: number;
    count: number;
}

const TILE_DISTRIBUTION: TileDistribution[] = [
    // Blank tiles
    { value: '*', score: 0, count: 2 },
    
    // 1 point tiles
    { value: 'E', score: 1, count: 15 },
    { value: 'A', score: 1, count: 9 },
    { value: 'I', score: 1, count: 8 },
    { value: 'N', score: 1, count: 6 },
    { value: 'O', score: 1, count: 6 },
    { value: 'R', score: 1, count: 6 },
    { value: 'S', score: 1, count: 6 },
    { value: 'T', score: 1, count: 6 },
    { value: 'U', score: 1, count: 6 },
    { value: 'L', score: 1, count: 5 },
    
    // 2 point tiles
    { value: 'D', score: 2, count: 3 },
    { value: 'M', score: 2, count: 3 },
    { value: 'G', score: 2, count: 2 },
    
    // 3 point tiles
    { value: 'B', score: 3, count: 2 },
    { value: 'C', score: 3, count: 2 },
    { value: 'P', score: 3, count: 2 },
    
    // 4 point tiles
    { value: 'F', score: 4, count: 2 },
    { value: 'H', score: 4, count: 2 },
    { value: 'V', score: 4, count: 2 },
    
    // 8 point tiles
    { value: 'J', score: 8, count: 1 },
    { value: 'Q', score: 8, count: 1 },
    
    // 10 point tiles
    { value: 'K', score: 10, count: 1 },
    { value: 'W', score: 10, count: 1 },
    { value: 'X', score: 10, count: 1 },
    { value: 'Y', score: 10, count: 1 },
    { value: 'Z', score: 10, count: 1 },
];

export function createTileBag(): Bag {
    const bag: Bag = [];
    
    for (const { value, score, count } of TILE_DISTRIBUTION) {
        for (let i = 0; i < count; i++) {
            bag.push({
                id: crypto.randomUUID(),
                value,
                score,
            });
        }
    }
    
    return bag;
}

