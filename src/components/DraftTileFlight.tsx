import { useEffect, useRef } from 'react';
import type { TileData } from '../game/generated';
import Tile from './Tile';

export interface DraftFlight {
    tile: TileData;
    from: { left: number; top: number; width: number; height: number };
    to: { left: number; top: number };
    delay: number;
    duration: number;
}

export default function DraftTileFlight({ flight, onFinish }: {
    flight: DraftFlight;
    onFinish: (tileId: string) => void;
}) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const element = ref.current;
        if (!element || !element.animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            onFinish(flight.tile.id);
            return;
        }
        const animation = element.animate([
            { transform: 'translate(0, 0)' },
            { transform: `translate(${flight.to.left - flight.from.left}px, ${flight.to.top - flight.from.top}px)` },
        ], { duration: flight.duration, delay: flight.delay, easing: 'cubic-bezier(0.2, 0.65, 0.3, 1)', fill: 'both' });
        animation.onfinish = () => onFinish(flight.tile.id);
        return () => {
            animation.onfinish = null;
            animation.cancel();
        };
    }, [flight, onFinish]);

    return (
        <div ref={ref} aria-hidden="true" data-draft-flight={flight.tile.id}
            className="pointer-events-none fixed z-40 rounded-sm shadow-sm"
            style={{ ...flight.from, willChange: 'transform' }}>
            <Tile value={flight.tile.value} score={flight.tile.score}
                originalValue={flight.tile.originalValue} displayValue={flight.tile.displayValue} />
        </div>
    );
}
