"use client";

import { useState, useRef, useEffect, Activity } from 'react';
import {
    DndContext,
    closestCenter,
} from '@dnd-kit/core';
import DebugMenu from "../src/components/DebugMenu";
import { GameProvider } from "../src/state/GameContext";
import { useGame, useGameDispatch } from "../src/state/GameContext";
import { useGameSetters } from "../src/hooks/useGameSetters";
import { useDraftSuggestionsReroll } from "../src/hooks/useDraftSuggestionsReroll";
import { useSeedBagFromDraft } from "../src/hooks/useSeedBagFromDraft";
import Board from "../src/components/Board";
import DraftBoard from "../src/components/DraftBoard";
import Rack from "../src/components/Rack";
import DiscardSlot from "../src/components/DiscardSlot";
import { BoardState, PlacementHistoryEntry } from '../src/types/board';
import { RackState } from '../src/types/rack';
import { Bag } from '../src/types/bag';
import { StickerState } from '../src/types/sticker';
import { removeTileFromBoard, findTilePosition, parseEmptySlotId } from '../src/utils/boardUtils';
import { createInitialDraftBoard, generateUniqueTiles, createBlankTile } from '../src/utils/draftBoardUtils';
import { findTileInRack, findFirstEmptySlot, moveTileToRack, shuffleRack } from '../src/utils/rackUtils';
import { getAllAvailableLetters } from '../src/utils/tileDefinitions';
import { preloadDictionary } from '../src/utils/dictionaryUtils';
import { useDragAndDrop } from '../src/hooks/useDragAndDrop';
import { useKeyboardSelector } from '../src/hooks/useKeyboardSelector';
import { TileData } from '../src/types/tile';
import { Position } from '../src/types/board';
import { Shuffle, Play } from 'lucide-react';
import LetterSelectionPopup from '../src/components/LetterSelectionPopup';
import { fillRackAfterPlayAction, handlePlayAction, computeDrawWithRefill, handleKeyboardTilePlacementAction, handleKeyboardTileRemovalAction, drawOneAction, drawAllAction, redrawAction, shuffleBagAction, resetBoardAction, resetRackAction, resetScoreAction, resetStickersAction, resetBagFromDraftAction } from "../src/state/gameActions";
import { areAllCurrentWordsValidSelector, canPlaySelector, canShuffleSelector } from "../src/state/selectors";
import { useBlankTilePlacement } from "../src/hooks/useBlankTilePlacement";

function HomeContent() {
    // Track client-side mount to prevent hydration mismatch
    const [mounted, setMounted] = useState(false);

    // Centralized game state via context
    const {
        board,
        rack,
        bag,
        discard,
        stickers,
        isDictionaryLoaded,
        totalScore,
        tileOpacity,
        showCoordinates,
        isDraftMode,
        draftBoard,
        draftRerollCount,
        draftEnded,
        hasSeededFromDraft,
        placementHistory,
    } = useGame();
    const dispatch = useGameDispatch();

    // Centralized simple setters
    const {
        setBoard,
        setRack,
        setBag,
        setDiscard,
        setStickers,
        setIsDictionaryLoaded,
        setTotalScore,
        setTileOpacity,
        setShowCoordinates,
        setIsDraftMode,
        setDraftBoard,
        setDraftRerollCount,
        setDraftEnded,
        setHasSeededFromDraft,
        setPlacementHistory,
    } = useGameSetters();

    const {
        blankTilePopup,
        openBlankTilePopup,
        handleLetterSelection,
        handlePopupCancel,
    } = useBlankTilePlacement({ board, setBoard, rack, setRack, setPlacementHistory });

    const [boardCellSize, setBoardCellSize] = useState(44);
    const boardRef = useRef<HTMLDivElement>(null);
    const rackRef = useRef<HTMLDivElement>(null);
    const gameAreaRef = useRef<HTMLDivElement>(null);
    const discardRef = useRef<HTMLDivElement>(null);
    const [exitingDraft, setExitingDraft] = useState(false);

    const handleDragAndDropPlacement = (tileId: string, position: Position, wasBlank: boolean) => {
        setPlacementHistory(prev => [...prev, { tileId, position, wasBlank }]);
    };

    // After a valid play, fill the rack with discard->bag refill
    const fillRackAfterPlay = () => fillRackAfterPlayAction({ isDraftMode, rack, bag, discard }, dispatch);

    const {
        sensors,
        handleDragStart,
        handleDragOver,
        handleDragEnd: originalHandleDragEnd,
        overBoardPos,
        overRackIndex,
        activeId,
    } = useDragAndDrop({ 
        board: isDraftMode ? draftBoard : board, 
        setBoard: isDraftMode ? setDraftBoard : setBoard, 
        rack, 
        setRack, 
        gameAreaRef, 
        onTilePlaced: handleDragAndDropPlacement 
    });

    // Transient discard animation state
    const [discardAnim, setDiscardAnim] = useState<{ tile: TileData } | null>(null);
    const [isDiscarding, setIsDiscarding] = useState(false);

    // Draw helper moved to actions (computeDrawWithRefill)

    // Wrapper to intercept blank tile drops and handle discards
    const handleDragEnd = (event: any) => {
        const { active, over } = event;

        if (!over) {
            originalHandleDragEnd(event);
            return;
        }

        const activeId = active.id as string;
        const overId = over.id as string;

        // Handle drop into discard slot (before any special blank handling)
        if (overId === 'discard-slot') {
            if (isDiscarding) {
                return;
            }
            // Determine source of tile (rack or board)
            const sourceRackIndex = findTileInRack(rack, activeId);
            const sourceBoardPos = findTilePosition(board, activeId);

            let tileToDiscard: TileData | null = null;

            if (sourceRackIndex !== null) {
                tileToDiscard = rack[sourceRackIndex];
            } else if (sourceBoardPos) {
                const cell = board[sourceBoardPos.row][sourceBoardPos.col];
                if (cell.canTake) {
                    tileToDiscard = cell.tile;
                }
            }

            if (!tileToDiscard) {
                return; // nothing to do
            }

            // Remove from source immediately to prevent duplication
            if (sourceRackIndex !== null) {
                setRack(prevRack => {
                    const next = [...prevRack];
                    next[sourceRackIndex] = null;
                    return next;
                });
            } else if (sourceBoardPos) {
                setBoard(prevBoard => removeTileFromBoard(prevBoard, sourceBoardPos));
                setPlacementHistory(prev => prev.filter(e => !(e.tileId === tileToDiscard!.id && e.position.row === sourceBoardPos.row && e.position.col === sourceBoardPos.col)));
            }

            // Play a quick fade animation at the discard slot
            setIsDiscarding(true);
            setDiscardAnim({ tile: tileToDiscard });

            window.setTimeout(() => {
                // Compose discard used for potential refill to include this tile
                const discardForRefill = [...discard, tileToDiscard!];
                const bagForRefill = bag;

                // Add to discard pile
                setDiscard(prev => [...prev, tileToDiscard!]);

                // Perform atomic draw using composed snapshots
                setRack(prevRack => {
                    const { newRack, newBag, didRefill } = computeDrawWithRefill(
                        prevRack,
                        bagForRefill,
                        discardForRefill,
                        sourceRackIndex !== null ? sourceRackIndex : undefined
                    );
                    if (didRefill) {
                        setDiscard([]);
                    }
                    setBag(newBag);
                    return newRack;
                });

                // Clear animation proxy and guard
                setDiscardAnim(null);
                setIsDiscarding(false);
            }, 180); // ~200ms fade

            return; // handled
        }

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
                    openBlankTilePopup({ blankTile: tile, targetPosition: targetPos, sourceRackIndex: activeRackIndex });
                }
                return; // Don't call original handler
            }
        }

        // For all other cases, use the original handler
        originalHandleDragEnd(event);
    };

    const handleKeyboardTilePlacement = (letter: string): boolean => {
        return handleKeyboardTilePlacementAction({ letter, selectedCell, board, rack, placementHistory }, dispatch);
    };

    const handleKeyboardTileRemoval = () => handleKeyboardTileRemovalAction({ placementHistory, board, rack }, dispatch);



    const handleShuffle = () => {
        setRack((prevRack: RackState) => shuffleRack(prevRack));
    };

    const handlePlay = () => handlePlayAction({ board, stickers, rack, bag, discard, currentTotalScore: totalScore }, dispatch);

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
        // Disable right-click behavior in draft mode (no rack, board-to-board only)
        if (isDraftMode) {
            return false;
        }
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

    // Draft mode: right-click a suggested tile to place it into the first available placement zone cell
    const handleDraftSuggestionRightClick = (tile: TileData, position: Position): boolean => {
        if (!isDraftMode) return false;

        // Only handle right-clicks from the three suggested positions
        const suggestedPositions = [
            { row: 4, col: 2 },
            { row: 4, col: 5 },
            { row: 4, col: 8 }
        ];
        const isFromSuggested = suggestedPositions.some(pos => pos.row === position.row && pos.col === position.col);
        if (!isFromSuggested) return false;

        // Find first empty placement zone cell (rows 7 and 8, center 7 columns)
        const centerCount = 7;
        const centerStart = Math.floor((11 - centerCount) / 2); // BOARD_SIZE is 11
        const centerEnd = centerStart + centerCount - 1;
        const placementCells: Position[] = [];
        [7, 8].forEach(r => {
            for (let c = centerStart; c <= centerEnd; c++) {
                placementCells.push({ row: r, col: c });
            }
        });

        const target = placementCells.find(pos => !draftBoard[pos.row][pos.col].tile);
        if (!target) {
            return false; // No available placement cell
        }

        // Move tile from suggested position to target placement cell
        setDraftBoard((prevBoard: BoardState) => {
            const newBoard = prevBoard.map(row => row.map(cell => ({ ...cell })));
            // Remove from suggested position (preserve flags)
            newBoard[position.row][position.col] = { ...newBoard[position.row][position.col], tile: null };
            // Place onto target (preserve flags)
            newBoard[target.row][target.col] = { ...newBoard[target.row][target.col], tile };
            return newBoard;
        });

        // If we just picked the final blank from the middle, clear suggestions entirely
        if (tile.value === '*') {
            setDraftBoard((prevBoard: BoardState) => {
                const newBoard = prevBoard.map(row => [...row]);
                newBoard[4][2] = { ...newBoard[4][2], tile: null };
                newBoard[4][5] = { ...newBoard[4][5], tile: null };
                newBoard[4][8] = { ...newBoard[4][8], tile: null };
                return newBoard;
            });
        }

        // Returning true triggers success feedback in the cell (prevents shake)
        return true;
    };

    const handleRackRightClick = (tile: TileData, rackIndex: number): boolean => {
        // Check if selector is visible and we have a selected cell
        if (!selectedCell) {
            return false;
        }

        // Check if target board cell can accept the tile
        const targetCell = board[selectedCell.row][selectedCell.col];
        if (!targetCell.canPlace) {
            return false; // Can't place on non-placeable cell
        }

        // For blank tiles, we need to prompt for a letter or use a default
        // For now, we'll place blank tiles as "*" without transformation
        // (transformation only happens via keyboard input)
        let tileToPlace = tile;
        let wasBlank = false;

        // If target has takeable tile, swap it back to the rack position where the clicked tile was
        if (targetCell.tile && targetCell.canTake) {
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
            newBoard[selectedCell.row][selectedCell.col] = { tile: tileToPlace, canPlace: true, canTake: true };
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
        // Load dictionary
        preloadDictionary().then(() => {
            setIsDictionaryLoaded(true);
        });
    }, []);

    // In draft mode, whenever any suggested slot becomes empty, reroll all three
    const suggestedOccupancyRef = useRef<[boolean, boolean, boolean] | null>(null);

    const { rerollSuggestions } = useDraftSuggestionsReroll({
        isDraftMode,
        draftBoard,
        draftEnded,
        draftRerollCount,
        setDraftBoard,
        setDraftRerollCount,
        setDraftEnded,
        suggestedOccupancyRef,
    });

    // On draft completion: when draft ends and 14 tiles are placed, seed the game bag from draft (shuffled) exactly once
    useSeedBagFromDraft({
        isDraftMode,
        draftBoard,
        draftEnded,
        hasSeededFromDraft,
        setBag,
        setHasSeededFromDraft,
    });

    const canPlay = canPlaySelector({ board, stickers, isDictionaryLoaded });
    const canShuffle = canShuffleSelector(rack);
    

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
                    <DebugMenu bag={bag} rack={rack} board={board} setRack={setRack} setBag={setBag} setBoard={setBoard} draftBoard={draftBoard} setDraftBoard={setDraftBoard} totalScore={totalScore} setTotalScore={setTotalScore} stickers={stickers} setStickers={setStickers} tileOpacity={tileOpacity} setTileOpacity={setTileOpacity} showCoordinates={showCoordinates} setShowCoordinates={setShowCoordinates} isDraftMode={isDraftMode} setIsDraftMode={setIsDraftMode} discard={discard} setDiscard={setDiscard}
                        onDraw={() => drawOneAction({ rack, bag, discard }, dispatch)}
                        onDrawAll={() => drawAllAction({ rack, bag, discard }, dispatch)}
                        onRedraw={() => redrawAction({ rack, bag, discard }, dispatch)}
                        onClearRack={() => resetRackAction({ rackSize: rack.length }, dispatch)}
                        onResetBoard={() => resetBoardAction(dispatch)}
                        onResetScore={() => resetScoreAction(dispatch)}
                        onResetStickers={() => resetStickersAction({ board }, dispatch)}
                        onResetBag={() => resetBagFromDraftAction({ draftBoard }, dispatch)}
                        onResetGame={() => { resetBoardAction(dispatch); resetRackAction({ rackSize: rack.length }, dispatch); resetScoreAction(dispatch); resetStickersAction({ board }, dispatch); resetBagFromDraftAction({ draftBoard }, dispatch); }}
                        onShuffleBag={() => shuffleBagAction({ bag }, dispatch)}
                        onResetDraft={() => { setDraftBoard(createInitialDraftBoard()); setDraftRerollCount(0); setDraftEnded(false); setHasSeededFromDraft(false); suggestedOccupancyRef.current = null; }} onRerollSuggestions={() => rerollSuggestions()} />
                    <div 
                        ref={gameAreaRef}
                        id="game-area" 
                        className="grow bg-zinc-500 flex flex-col items-center justify-center gap-4"
                        style={{ animation: 'fadeIn 0.3s ease-in-out' }}
                    >
                        <Activity mode={!isDraftMode && !exitingDraft ? "visible" : "hidden"}>
                            <div className={`transition-opacity duration-300 ${!isDraftMode && !exitingDraft ? 'opacity-100' : 'opacity-0'}`}>
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
                            </div>
                        </Activity>
                        <Activity mode={isDraftMode || exitingDraft ? "visible" : "hidden"}>
                            <div className={`transition-opacity duration-300 ${exitingDraft ? 'opacity-0' : (isDraftMode ? 'opacity-100' : 'opacity-0')}`}>
                            <DraftBoard 
                                board={draftBoard}
                                boardCellSize={boardCellSize}
                                overBoardPos={overBoardPos}
                                onCellSizeChange={setBoardCellSize}
                                overRackIndex={overRackIndex}
                                boardRef={boardRef}
                                rackRef={rackRef}
                                gameAreaRef={gameAreaRef}
                                onRightClick={handleDraftSuggestionRightClick}
                                tileOpacity={tileOpacity}
                                showCoordinates={showCoordinates}
                                selectedCell={selectedCell}
                                selectorDirection={selectorDirection}
                            />
                            </div>
                        </Activity>
                        {/* Only show rack and controls in Game mode */}
                        <Activity mode={isDraftMode ? "hidden" : "visible"}>
                            <div className="relative">
                                <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2">
                                    <DiscardSlot ref={discardRef} tileSize={boardCellSize} hidden={isDraftMode} />
                                </div>

                                {discardAnim && (
                                    <div
                                        className="pointer-events-none absolute"
                                        style={{
                                            left: -boardCellSize - 8,
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            width: boardCellSize - 2,
                                            height: boardCellSize - 2,
                                            transition: 'opacity 180ms ease, transform 180ms ease',
                                            opacity: 0,
                                        }}
                                    >
                                        <div className="w-full h-full bg-zinc-800 border border-zinc-600 rounded-lg flex items-center justify-center text-white font-bold">
                                            {discardAnim.tile.displayValue || discardAnim.tile.value}
                                        </div>
                                    </div>
                                )}
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
                                    disabled={!canShuffle}
                                    className={`absolute left-full ml-2 top-1/2 -translate-y-1/2 p-2 border rounded-lg transition-colors duration-200 flex items-center justify-center ${
                                        canShuffle
                                            ? 'bg-zinc-600 hover:bg-zinc-500 border-zinc-500 cursor-pointer'
                                            : 'bg-zinc-600 border-zinc-500 cursor-not-allowed opacity-50'
                                    }`}
                                    title={canShuffle ? "Shuffle rack" : "Shuffle disabled - need at least 2 tiles"}
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
                        </Activity>
                    </div>
                </DndContext>
            ) : (
                <></>
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

export default function Home() {
    return (
        <GameProvider>
            <HomeContent />
        </GameProvider>
    );
}
