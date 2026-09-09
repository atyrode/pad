import { ENGINE_META, type TileDefinition } from '../game/generated';

/** Alphabetical display choices; letter values are generated from Rust. */
export function getAllAvailableLetters(): Array<{ letter: string; score: number }> {
    return ENGINE_META.tiles
        .map(({ letter, score }) => ({ letter, score }))
        .sort((a, b) => a.letter.localeCompare(b.letter));
}

export function getTileDefinition(letter: string): TileDefinition | undefined {
    return letter === '*' ? ENGINE_META.blank : ENGINE_META.tiles.find(tile => tile.letter === letter);
}
