"use client";

import { useState, useRef, useEffect } from 'react';
import {
    DndContext,
    closestCenter,
} from '@dnd-kit/core';
import DebugMenu from "../src/components/DebugMenu";
import Board from "../src/components/Board";
import Rack from "../src/components/Rack";
import { BoardState, PlacementHistoryEntry } from '../src/types/board';
import { RackState } from '../src/types/rack';
import { Bag } from '../src/types/bag';
import { StickerState } from '../src/types/sticker';
import { createInitialBoard, removeTileFromBoard, findAllWords, areUnlockedTilesInSingleLine, findTilePosition, parseEmptySlotId } from '../src/utils/boardUtils';
import { createInitialRack, findTileInRack, findFirstEmptySlot, moveTileToRack, shuffleRack } from '../src/utils/rackUtils';
import { createTileBag } from '../src/utils/bagUtils';
import { getAllAvailableLetters } from '../src/utils/tileDefinitions';
import { preloadDictionary, isValidWordSync } from '../src/utils/dictionaryUtils';
import { calculateCurrentPlayScore, calculateTotalScore } from '../src/utils/scoreUtils';
import { createInitialStickers, consumeSticker, isStartStickerConsumed, doesWordCoverStartSticker } from '../src/utils/stickerUtils';
import { useDragAndDrop } from '../src/hooks/useDragAndDrop';
import { useKeyboardSelector } from '../src/hooks/useKeyboardSelector';
import { TileData } from '../src/types/tile';
import { Position } from '../src/types/board';
import { Shuffle, Play } from 'lucide-react';
import LetterSelectionPopup from '../src/components/LetterSelectionPopup';

export default function Home() {
    // Track client-side mount to prevent hydration mismatch
    const [mounted, setMounted] = useState(false);

    // Initialize board with sample tiles
    const [board, setBoard] = useState<BoardState>(createInitialBoard);

    // Initialize rack
    const [rack, setRack] = useState<RackState>(createInitialRack);

    // Initialize tile bag as empty array initially
    const [bag, setBag] = useState<Bag>([]);

    // Initialize stickers
    const [stickers, setStickers] = useState<StickerState>(createInitialStickers());

    // Dictionary loading state
    const [isDictionaryLoaded, setIsDictionaryLoaded] = useState(false);

    // Score tracking
    const [totalScore, setTotalScore] = useState(0);

    // Visual settings
    const [tileOpacity, setTileOpacity] = useState(100);
    const [showCoordinates, setShowCoordinates] = useState(false);

    // Placement history for backspace functionality
    const [placementHistory, setPlacementHistory] = useState<PlacementHistoryEntry[]>([]);

    // Blank tile popup state
    const [blankTilePopup, setBlankTilePopup] = useState<{
        show: boolean;
        blankTile: TileData | null;
        targetPosition: Position | null;
        sourceRackIndex: number | null;
    } | null>(null);

    const [boardCellSize, setBoardCellSize] = useState(44);
    const boardRef = useRef<HTMLDivElement>(null);
    const rackRef = useRef<HTMLDivElement>(null);
    const gameAreaRef = useRef<HTMLDivElement>(null);

    const handleDragAndDropPlacement = (tileId: string, position: Position, wasBlank: boolean) => {
        setPlacementHistory(prev => [...prev, { tileId, position, wasBlank }]);
    };

    const {
        sensors,
        handleDragStart,
        handleDragOver,
        handleDragEnd: originalHandleDragEnd,
        overBoardPos,
        overRackIndex,
        activeId,
    } = useDragAndDrop({ board, setBoard, rack, setRack, gameAreaRef, onTilePlaced: handleDragAndDropPlacement });

    // Wrapper to intercept blank tile drops
    const handleDragEnd = (event: any) => {
        const { active, over } = event;

        if (!over) {
            originalHandleDragEnd(event);
            return;
        }

        const activeId = active.id as string;
        const overId = over.id as string;

        // Check if we're dragging a blank tile from rack to board
        const activeRackIndex = findTileInRack(rack, activeId);
        const overBoardPos = findTilePosition(board, overId);
        const overEmptyPos = parseEmptySlotId(overId);

        if (activeRackIndex !== null && (overBoardPos || overEmptyPos)) {
            const tile = rack[activeRackIndex];
            if (tile && tile.value === "*") {
                // This is a blank tile being dropped on the board
                // Show popup instead of placing
                const targetPos = overBoardPos || overEmptyPos;
                if (targetPos) {
                    setBlankTilePopup({
                        show: true,
                        blankTile: tile,
                        targetPosition: targetPos,
                        sourceRackIndex: activeRackIndex
                    });
                }
                return; // Don't call original handler
            }
        }

        // For all other cases, use the original handler
        originalHandleDragEnd(event);
    };

    const handleKeyboardTilePlacement = (letter: string): boolean => {
        // Check if selector is visible
        if (!selectedCell) {
            return false;
        }

        // First, try to find exact letter match in rack
        let rackIndex = rack.findIndex(tile => 
            tile && tile.value.toUpperCase() === letter.toUpperCase()
        );

        let tile = rack[rackIndex];
        let wasBlank = false;

        // If no exact match found, look for a blank tile ("*")
        if (rackIndex === -1) {
            rackIndex = rack.findIndex(tile => 
                tile && tile.value === "*"
            );
            
            if (rackIndex !== -1) {
                const blankTile = rack[rackIndex];
                if (blankTile) {
                    // Create transformed blank tile
                    tile = {
                        ...blankTile,
                        value: letter.toUpperCase(), // For word validation
                        originalValue: "*", // Track that this was originally a blank
                        displayValue: letter.toUpperCase() // What to display
                    };
                    wasBlank = true;
                }
            }
        }

        if (rackIndex === -1 || !tile) {
            return false; // No matching tile or blank in rack
        }

        // Check if target board cell is valid (empty or has unlocked tile)
        const targetCell = board[selectedCell.row][selectedCell.col];
        if (targetCell.tile && targetCell.locked) {
            return false; // Can't place on locked tile
        }

        // Mimic Rack → Board logic from useDragAndDrop
        if (targetCell.tile && !targetCell.locked) {
            // Swap: move existing tile back to rack, place new tile on board
            setRack((prevRack: RackState) => {
                const newRack = [...prevRack];
                newRack[rackIndex] = targetCell.tile; // Put existing tile in rack
                return newRack;
            });
        } else {
            // Simple placement: remove tile from rack
            setRack((prevRack: RackState) => {
                const newRack = [...prevRack];
                newRack[rackIndex] = null;
                return newRack;
            });
        }

        // Place tile on board
        setBoard((prevBoard: BoardState) => {
            const newBoard = prevBoard.map(row => [...row]);
            newBoard[selectedCell.row][selectedCell.col] = { tile, locked: false };
            return newBoard;
        });

        // Add to placement history
        setPlacementHistory(prev => [...prev, { tileId: tile.id, position: selectedCell, wasBlank }]);

        return true;
    };

    const handleKeyboardTileRemoval = (): { success: boolean; position?: { row: number; col: number } } => {
        // Check if there's any history
        if (placementHistory.length === 0) {
            return { success: false };
        }

        // Find first empty rack slot
        const emptySlotIndex = findFirstEmptySlot(rack);
        if (emptySlotIndex === null) {
            return { success: false }; // Rack is full, don't modify history
        }

        // Keep trying to remove tiles from history until we find a valid one
        let newHistory = [...placementHistory];
        let removedPosition: Position | null = null;

        while (newHistory.length > 0) {
            const lastPlacement = newHistory[newHistory.length - 1];
            const { tileId, position, wasBlank } = lastPlacement;

            // Verify tile still exists at that position with matching ID
            const cell = board[position.row][position.col];
            if (!cell.tile || cell.tile.id !== tileId || cell.locked) {
                // Tile was moved/removed/locked, skip this entry
                newHistory = newHistory.slice(0, -1);
                continue;
            }

            // Found a valid tile to remove
            // Remove tile from board
            setBoard((prevBoard: BoardState) => removeTileFromBoard(prevBoard, position));

            // Add tile back to rack - revert blank if it was originally a blank
            if (wasBlank && cell.tile) {
                // Revert blank tile back to "*"
                const revertedTile = {
                    ...cell.tile,
                    value: "*",
                    originalValue: undefined,
                    displayValue: undefined
                };
                setRack((prevRack: RackState) => moveTileToRack(prevRack, revertedTile, emptySlotIndex));
            } else {
                // Return tile as-is
                setRack((prevRack: RackState) => moveTileToRack(prevRack, cell.tile!, emptySlotIndex));
            }

            // Remove this entry from history
            newHistory = newHistory.slice(0, -1);
            removedPosition = position;
            break;
        }

        // Update history with all invalid entries removed
        setPlacementHistory(newHistory);

        // Return success with position for selector movement if we removed something
        if (removedPosition) {
            return { success: true, position: removedPosition };
        } else {
            return { success: false };
        }
    };



    const handleShuffle = () => {
        setRack((prevRack: RackState) => shuffleRack(prevRack));
    };

    const handlePlay = () => {
        // Calculate current play score before locking tiles
        const currentPlayScore = calculateCurrentPlayScore(board, stickers);
        
        // Add current play score to total
        setTotalScore(prevTotal => prevTotal + currentPlayScore.totalScore);
        
        // Lock the tiles and consume stickers
        setBoard((prevBoard: BoardState) => 
            prevBoard.map(row => 
                row.map(cell => 
                    cell.tile && !cell.locked 
                        ? { ...cell, locked: true } 
                        : cell
                )
            )
        );
        
        // Consume stickers where tiles were locked
        setStickers((prevStickers: StickerState) => {
            let newStickers = prevStickers;
            for (let row = 0; row < board.length; row++) {
                for (let col = 0; col < board[row].length; col++) {
                    const cell = board[row][col];
                    if (cell.tile && !cell.locked) {
                        // This tile will be locked, so consume the sticker if it exists
                        newStickers = consumeSticker(newStickers, { row, col });
                    }
                }
            }
            return newStickers;
        });

        // Clear placement history after locking tiles
        setPlacementHistory([]);
    };

    const handleKeyboardPlay = () => {
        if (canPlay) {
            handlePlay();
        }
    };

    const { selectedCell, selectorDirection, advanceSelector } = useKeyboardSelector({
        onLetterInput: handleKeyboardTilePlacement,
        onBackspace: handleKeyboardTileRemoval,
        onShuffle: handleShuffle,
        onPlay: handleKeyboardPlay,
        board: board,
    });

    const handleRightClick = (tile: TileData, position: Position): boolean => {
        // Find first empty slot in rack
        const emptySlotIndex = findFirstEmptySlot(rack);
        
        if (emptySlotIndex !== null) {
            // Remove tile from board
            setBoard((prevBoard: BoardState) => removeTileFromBoard(prevBoard, position));
            
            // Add tile to rack - revert blank if it was originally a blank
            if (tile.originalValue === "*") {
                // Revert blank tile back to "*"
                const revertedTile = {
                    ...tile,
                    value: "*",
                    originalValue: undefined,
                    displayValue: undefined
                };
                setRack((prevRack: RackState) => moveTileToRack(prevRack, revertedTile, emptySlotIndex));
            } else {
                // Return tile as-is
                setRack((prevRack: RackState) => moveTileToRack(prevRack, tile, emptySlotIndex));
            }
            return true; // Success
        }
        
        return false; // Rack is full
    };

    const handleRackRightClick = (tile: TileData, rackIndex: number): boolean => {
        // Check if selector is visible and we have a selected cell
        if (!selectedCell) {
            return false;
        }

        // Check if target board cell can accept the tile (empty or has non-locked tile)
        const targetCell = board[selectedCell.row][selectedCell.col];
        if (targetCell.tile && targetCell.locked) {
            return false; // Can't place on locked tile
        }

        // For blank tiles, we need to prompt for a letter or use a default
        // For now, we'll place blank tiles as "*" without transformation
        // (transformation only happens via keyboard input)
        let tileToPlace = tile;
        let wasBlank = false;

        // If target has non-locked tile, swap it back to the rack position where the clicked tile was
        if (targetCell.tile && !targetCell.locked) {
            setRack((prevRack: RackState) => {
                const newRack = [...prevRack];
                newRack[rackIndex] = targetCell.tile; // Put existing tile in rack
                return newRack;
            });
        } else {
            // Simple placement: remove tile from rack
            setRack((prevRack: RackState) => {
                const newRack = [...prevRack];
                newRack[rackIndex] = null;
                return newRack;
            });
        }

        // Place tile on board
        setBoard((prevBoard: BoardState) => {
            const newBoard = prevBoard.map(row => [...row]);
            newBoard[selectedCell.row][selectedCell.col] = { tile: tileToPlace, locked: false };
            return newBoard;
        });

        // Add to placement history
        setPlacementHistory(prev => [...prev, { tileId: tileToPlace.id, position: selectedCell, wasBlank }]);

        // Move selector forward after successful placement (same logic as typing)
        advanceSelector();
        
        return true;
    };



    // Set mounted to true after client-side hydration and initialize bag
    useEffect(() => {
        setMounted(true);
        // Initialize the bag only on the client side
        setBag(createTileBag());
        // Load dictionary
        preloadDictionary().then(() => {
            setIsDictionaryLoaded(true);
        });
    }, []);

    // Helper function to check if all current words are valid
    const areAllCurrentWordsValid = (): boolean => {
        if (!isDictionaryLoaded) {
            return false; // Disable if dictionary not loaded
        }

        const words = findAllWords(board);
        const currentWords = words.filter(w => !w.isLocked);
        
        // Disable if no current words (nothing to play)
        if (currentWords.length === 0) {
            return false;
        }

        // Check if all unlocked tiles form a single contiguous line (Scrabble rule)
        if (!areUnlockedTilesInSingleLine(board)) {
            return false;
        }

        // Check if all current words are valid dictionary words
        const allWordsValid = currentWords.every(wordInfo => {
            const isValid = isValidWordSync(wordInfo.word);
            return isValid === true; // Only true if explicitly valid
        });

        if (!allWordsValid) {
            return false;
        }

        // Check starting tile constraint: if start sticker is not consumed,
        // ALL current words must pass through the start position (5,5)
        const startStickerConsumed = isStartStickerConsumed(stickers);
        if (!startStickerConsumed) {
            const allWordsCoverStart = currentWords.every(wordInfo => 
                doesWordCoverStartSticker(wordInfo, stickers)
            );
            if (!allWordsCoverStart) {
                return false;
            }
        }

        return true;
    };

    const canPlay = areAllCurrentWordsValid();


    // Popup handlers
    const handleLetterSelection = (letter: string) => {
        if (!blankTilePopup) return;

        const { blankTile, targetPosition, sourceRackIndex } = blankTilePopup;
        if (!blankTile || !targetPosition || sourceRackIndex === null) return;

        // Create transformed blank tile
        const transformedTile = {
            ...blankTile,
            value: letter.toUpperCase(), // For word validation
            originalValue: "*", // Track that this was originally a blank
            displayValue: letter.toUpperCase() // What to display
        };

        // Check if target board cell can accept the tile
        const targetCell = board[targetPosition.row][targetPosition.col];
        if (targetCell.tile && targetCell.locked) {
            // Can't place on locked tile, just close popup
            setBlankTilePopup(null);
            return;
        }

        // Handle tile placement (swap or simple)
        if (targetCell.tile && !targetCell.locked) {
            // Swap: move existing tile back to rack
            setRack((prevRack: RackState) => {
                const newRack = [...prevRack];
                newRack[sourceRackIndex] = targetCell.tile; // Put existing tile in rack
                return newRack;
            });
        } else {
            // Simple placement: remove tile from rack
            setRack((prevRack: RackState) => {
                const newRack = [...prevRack];
                newRack[sourceRackIndex] = null;
                return newRack;
            });
        }

        // Place transformed tile on board
        setBoard((prevBoard: BoardState) => {
            const newBoard = prevBoard.map(row => [...row]);
            newBoard[targetPosition.row][targetPosition.col] = { tile: transformedTile, locked: false };
            return newBoard;
        });

        // Add to placement history
        setPlacementHistory(prev => [...prev, { tileId: transformedTile.id, position: targetPosition, wasBlank: true }]);

        // Close popup
        setBlankTilePopup(null);
    };

    const handlePopupCancel = () => {
        setBlankTilePopup(null);
        // Tile automatically returns to rack (no action needed)
    };

    return (
        <div id="main" className="h-screen w-screen bg-zinc-500 flex">
            {mounted ? (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragEnd={handleDragEnd}
                >
                    <DebugMenu bag={bag} rack={rack} board={board} setRack={setRack} setBag={setBag} setBoard={setBoard} totalScore={totalScore} setTotalScore={setTotalScore} stickers={stickers} setStickers={setStickers} tileOpacity={tileOpacity} setTileOpacity={setTileOpacity} showCoordinates={showCoordinates} setShowCoordinates={setShowCoordinates} />
                    <div 
                        ref={gameAreaRef}
                        id="game-area" 
                        className="grow bg-zinc-500 flex flex-col items-center justify-center gap-4"
                        style={{ animation: 'fadeIn 0.3s ease-in-out' }}
                    >
                        <Board 
                            board={board}
                            boardCellSize={boardCellSize}
                            overBoardPos={overBoardPos}
                            onCellSizeChange={setBoardCellSize}
                            overRackIndex={overRackIndex}
                            boardRef={boardRef}
                            rackRef={rackRef}
                            gameAreaRef={gameAreaRef}
                            onRightClick={handleRightClick}
                            stickers={stickers}
                            tileOpacity={tileOpacity}
                            showCoordinates={showCoordinates}
                            selectedCell={selectedCell}
                            selectorDirection={selectorDirection}
                        />
                        <div className="relative">
                            <Rack 
                                rack={rack} 
                                setRack={setRack}
                                boardCellSize={boardCellSize}
                                overBoardPos={activeId && findTileInRack(rack, activeId) !== null ? overBoardPos : null}
                                overRackIndex={overRackIndex}
                                boardRef={boardRef}
                                rackRef={rackRef}
                                gameAreaRef={gameAreaRef}
                                selectedCell={selectedCell}
                                onRackRightClick={handleRackRightClick}
                            />
                            <button 
                                onClick={handleShuffle}
                                className="absolute left-full ml-2 top-1/2 -translate-y-1/2 p-2 bg-zinc-600 hover:bg-zinc-500 border border-zinc-500 rounded-lg transition-colors duration-200 flex items-center justify-center"
                                title="Shuffle rack"
                            >
                                <Shuffle className="w-5 h-5 text-white" />
                            </button>
                            <button 
                                onClick={handlePlay}
                                disabled={!canPlay}
                                className={`absolute left-full ml-14 top-1/2 -translate-y-1/2 p-2 border rounded-lg transition-colors duration-200 flex items-center justify-center ${
                                    canPlay 
                                        ? 'bg-green-600 hover:bg-green-500 border-green-500 cursor-pointer' 
                                        : 'bg-zinc-600 border-zinc-500 cursor-not-allowed opacity-50'
                                }`}
                                title={
                                    canPlay 
                                        ? "Play - lock placed tiles" 
                                        : isDictionaryLoaded 
                                            ? "Play - no valid words to lock" 
                                            : "Play - loading dictionary..."
                                }
                            >
                                <Play className="w-5 h-5 text-white" />
                            </button>
                        </div>
                    </div>
                </DndContext>
            ) : (
                <>
                    <DebugMenu bag={bag} rack={rack} board={board} setRack={setRack} setBag={setBag} setBoard={setBoard} totalScore={totalScore} setTotalScore={setTotalScore} stickers={stickers} setStickers={setStickers} tileOpacity={tileOpacity} setTileOpacity={setTileOpacity} showCoordinates={showCoordinates} setShowCoordinates={setShowCoordinates} />
                    <div id="game-area" className="grow bg-zinc-500 flex flex-col items-center justify-center gap-4" />
                </>
            )}

            {/* Blank tile letter selection popup */}
            {blankTilePopup?.show && (
                <LetterSelectionPopup
                    availableLetters={getAllAvailableLetters()}
                    onSelect={handleLetterSelection}
                    onCancel={handlePopupCancel}
                />
            )}
        </div>
    );
}
