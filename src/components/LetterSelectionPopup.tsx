"use client";

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface LetterSelectionPopupProps {
    availableLetters: { letter: string; score: number }[];
    onSelect: (letter: string) => void;
    onCancel: () => void;
    returnFocusRef: React.RefObject<HTMLElement | null>;
}

export default function LetterSelectionPopup({ availableLetters, onSelect, onCancel, returnFocusRef }: LetterSelectionPopupProps) {
    const dialogRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const dialog = dialogRef.current;
        const returnFocus = returnFocusRef.current;
        dialog?.querySelector<HTMLButtonElement>('[data-letter]')?.focus();
        return () => {
            // Passive cleanup runs after the closing commit removes background inertness.
            returnFocus?.focus({ preventScroll: true });
        };
    }, [returnFocusRef]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
            if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                onCancel();
            } else if (/^[a-zA-Z]$/.test(event.key)) {
                event.preventDefault();
                event.stopPropagation();
                const letter = event.key.toUpperCase();
                if (availableLetters.some(option => option.letter === letter)) onSelect(letter);
            } else if (event.key === 'Tab') {
                const buttons = dialogRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');
                if (!buttons?.length) return;
                const first = buttons[0];
                const last = buttons[buttons.length - 1];
                if (event.shiftKey && document.activeElement === first) {
                    event.preventDefault();
                    last.focus();
                } else if (!event.shiftKey && document.activeElement === last) {
                    event.preventDefault();
                    first.focus();
                } else if (!dialogRef.current?.contains(document.activeElement)) {
                    event.preventDefault();
                    first.focus();
                }
                event.stopPropagation();
            }
        };
        document.addEventListener('keydown', handleKeyDown, true);
        return () => document.removeEventListener('keydown', handleKeyDown, true);
    }, [availableLetters, onSelect, onCancel]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={event => { if (event.target === event.currentTarget) onCancel(); }}>
            <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="blank-title" aria-describedby="blank-help"
                className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h3 id="blank-title" className="text-lg font-semibold text-gray-900">Select Letter for Blank Tile</h3>
                    <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600 transition-colors" aria-label="Close">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="grid grid-cols-5 gap-2 mb-4">
                    {availableLetters.map(({ letter }) => (
                        <button type="button" key={letter} data-letter={letter} onClick={() => onSelect(letter)}
                            aria-label={`${letter}, zero points`}
                            className="aspect-square flex flex-col items-center justify-center bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                            <span className="text-2xl font-bold text-blue-900">{letter}</span>
                            <span className="text-xs text-blue-600 font-medium">0</span>
                        </button>
                    ))}
                </div>
                <p id="blank-help" className="text-sm text-gray-600 text-center">
                    Type A–Z or choose a letter. Blanks score 0. Escape cancels; Tab moves between choices.
                </p>
            </div>
        </div>
    );
}
