import { useState, useEffect, RefObject } from 'react';
import { CELL_GAP } from '../constants/board';

export function useCellSize(cellRef: RefObject<HTMLDivElement | null>) {
    const [cellSize, setCellSize] = useState(44); // Default fallback
    
    useEffect(() => {
        const measureCellSize = () => {
            if (cellRef.current) {
                // offsetWidth gives us the cell width, but we need cell + gap for snapping
                const cellWidth = cellRef.current.offsetWidth;
                setCellSize(cellWidth + CELL_GAP);
            }
        };

        measureCellSize();
        
        // Re-measure on window resize
        window.addEventListener('resize', measureCellSize);
        return () => window.removeEventListener('resize', measureCellSize);
    }, [cellRef]);

    return cellSize;
}
