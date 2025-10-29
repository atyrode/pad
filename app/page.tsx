"use client";

import { useState, useRef, useEffect } from 'react';
import {
    DndContext,
    closestCenter,
} from '@dnd-kit/core';
import DebugMenu from "../src/components/DebugMenu";
import Board from "../src/components/Board";
import Rack from "../src/components/Rack";
import { BoardState } from '../src/types/board';
import { RackState } from '../src/types/rack';
import { Bag } from '../src/types/bag';
import { StickerState } from '../src/types/sticker';
import { createInitialBoard, removeTileFromBoard, findAllWords, areUnlockedTilesInSingleLine } from '../src/utils/boardUtils';
import { createInitialRack, findTileInRack, findFirstEmptySlot, moveTileToRack, shuffleRack } from '../src/utils/rackUtils';
import { createTileBag } from '../src/utils/bagUtils';
import { preloadDictionary, isValidWordSync } from '../src/utils/dictionaryUtils';
import { calculateCurrentPlayScore, calculateTotalScore } from '../src/utils/scoreUtils';
import { createInitialStickers, consumeSticker, isStartStickerConsumed, doesWordCoverStartSticker } from '../src/utils/stickerUtils';
import { useDragAndDrop } from '../src/hooks/useDragAndDrop';
import { TileData } from '../src/types/tile';
import { Position } from '../src/types/board';
import { Shuffle, Play } from 'lucide-react';

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

    const [boardCellSize, setBoardCellSize] = useState(44);
    const boardRef = useRef<HTMLDivElement>(null);
    const rackRef = useRef<HTMLDivElement>(null);
    const gameAreaRef = useRef<HTMLDivElement>(null);

    const {
        sensors,
        handleDragStart,
        handleDragOver,
        handleDragEnd,
        overBoardPos,
        overRackIndex,
        activeId,
    } = useDragAndDrop({ board, setBoard, rack, setRack, gameAreaRef });

    const handleRightClick = (tile: TileData, position: Position): boolean => {
        // Find first empty slot in rack
        const emptySlotIndex = findFirstEmptySlot(rack);
        
        if (emptySlotIndex !== null) {
            // Remove tile from board and add to rack
            setBoard((prevBoard: BoardState) => removeTileFromBoard(prevBoard, position));
            setRack((prevRack: RackState) => moveTileToRack(prevRack, tile, emptySlotIndex));
            return true; // Success
        }
        
        return false; // Rack is full
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
        </div>
    );
}
