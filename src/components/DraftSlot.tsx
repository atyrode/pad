import React from 'react';
import { TileData } from '../types/tile';

interface DraftSlotProps {
    slotIndex: number;
    tile: TileData | null;
    isSelected?: boolean;
}

export default function DraftSlot({ slotIndex, tile, isSelected = false }: DraftSlotProps) {
    // Get slot position info for display
    const getSlotInfo = () => {
        const row = slotIndex < 7 ? 8 : 9;
        const col = slotIndex < 7 ? slotIndex + 2 : slotIndex - 5;
        return { row, col };
    };

    const { row, col } = getSlotInfo();

    // Get slot styling based on state
    const getSlotStyle = () => {
        if (tile) {
            // Slot is filled with a tile
            return {
                backgroundColor: '#f3f4f6', // gray-100
                border: '2px solid #10b981', // green-500
                opacity: 1
            };
        } else if (isSelected) {
            // Slot is selected but empty
            return {
                backgroundColor: '#dbeafe', // blue-100
                border: '2px dashed #3b82f6', // blue-500
                opacity: 1
            };
        } else {
            // Slot is empty and not selected
            return {
                backgroundColor: '#f9fafb', // gray-50
                border: '2px dashed #9ca3af', // gray-400
                opacity: 0.7
            };
        }
    };

    return (
        <div 
            className="absolute inset-0 rounded-sm pointer-events-none flex items-center justify-center"
            style={getSlotStyle()}
        >
            {tile ? (
                // Show the tile that's placed in this slot
                <div className="w-8 h-8 bg-white rounded-sm border border-gray-300 flex items-center justify-center">
                    <span className="text-gray-800 text-sm font-bold">
                        {tile.value}
                    </span>
                </div>
            ) : (
                // Show slot number for empty slots
                <span className="text-gray-400 text-xs font-medium">
                    {slotIndex + 1}
                </span>
            )}
        </div>
    );
}
