"use client";

import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface LetterOption {
    letter: string;
    score: number;
}

interface LetterSelectionPopupProps {
    availableLetters: LetterOption[];
    onSelect: (letter: string) => void;
    onCancel: () => void;
    position?: { x: number; y: number };
}

export default function LetterSelectionPopup({ 
    availableLetters, 
    onSelect, 
    onCancel, 
    position 
}: LetterSelectionPopupProps) {
    // Handle ESC key to cancel
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onCancel();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onCancel]);

    // Handle backdrop click to cancel
    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onCancel();
        }
    };

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={handleBackdropClick}
        >
            <div 
                className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto"
                style={position ? { 
                    position: 'fixed', 
                    left: Math.min(position.x, window.innerWidth - 400), 
                    top: Math.min(position.y, window.innerHeight - 300) 
                } : {}}
            >
                {/* Header */}
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                        Select Letter for Blank Tile
                    </h3>
                    <button
                        onClick={onCancel}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        aria-label="Close"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Letter Grid */}
                <div className="grid grid-cols-5 gap-2 mb-4">
                    {availableLetters.map(({ letter, score }) => (
                        <button
                            key={letter}
                            onClick={() => onSelect(letter)}
                            className="aspect-square flex flex-col items-center justify-center bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        >
                            <span className="text-2xl font-bold text-blue-900">
                                {letter}
                            </span>
                            <span className="text-xs text-blue-600 font-medium">
                                {score}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Instructions */}
                <p className="text-sm text-gray-600 text-center">
                    Click a letter to transform your blank tile, or press ESC to cancel
                </p>
            </div>
        </div>
    );
}
