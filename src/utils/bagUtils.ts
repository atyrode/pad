import { TileData } from '../types/tile';
import { Bag } from '../types/bag';

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

export function shuffleBag(bag: Bag): Bag {
    const shuffled = [...bag];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

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
    
    return shuffleBag(bag);
}

export function drawTileFromBag(bag: Bag): { tile: TileData | null; newBag: Bag } {
    if (bag.length === 0) {
        return { tile: null, newBag: bag };
    }
    
    // Draw the first tile from the bag
    const drawnTile = bag[0];
    
    // Create new bag without the first tile
    const newBag = bag.slice(1);
    
    return { tile: drawnTile, newBag };
}

export function getFullBagSize(): number {
    return TILE_DISTRIBUTION.reduce((total, tile) => total + tile.count, 0);
}

