import React from 'react';
import { Sticker } from '../types/sticker';

interface StickerOverlayProps {
    sticker: Sticker | null;
}

export default function StickerOverlay({ sticker }: StickerOverlayProps) {
    if (!sticker) return null;

    // Get sticker background color and opacity
    const getStickerStyle = () => {
        let baseColor;
        if (sticker.type === 'multi') {
            baseColor = '#e9d5ff'; // purple-200
        } else if (sticker.type === 'points') {
            baseColor = '#dbeafe'; // blue-200
        } else if (sticker.type === 'start') {
            baseColor = '#fef9c3'; // yellow-100 (light greenish-yellow)
        } else {
            baseColor = '#dbeafe'; // fallback
        }
        
        const opacity = sticker.consumed ? 0.4 : 1;
        
        return {
            backgroundColor: baseColor,
            opacity: opacity
        };
    };

    // Get display text based on sticker type
    const getDisplayText = () => {
        if (sticker.type === 'multi') {
            return `x${sticker.value}`;
        } else if (sticker.type === 'points') {
            return `+${sticker.value}`;
        } else if (sticker.type === 'start') {
            return '★'; // Star symbol for start sticker
        } else {
            return '';
        }
    };

    return (
        <div 
            className="absolute inset-0 rounded-sm pointer-events-none flex items-center justify-center"
            style={getStickerStyle()}
        >
            {/* Sticker effect text */}
            <span className="text-zinc-500 text-xs font-bold opacity-50 pointer-events-none">
                {getDisplayText()}
            </span>
        </div>
    );
}
