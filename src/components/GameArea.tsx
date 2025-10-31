"use client";

import { Activity } from 'react';
import Board from "./Board";
import DraftBoard from "./DraftBoard";
import Rack from "./Rack";
import DiscardSlot from "./DiscardSlot";
import { BoardState } from '../types/board';
import { RackState } from '../types/rack';
import { StickerState } from '../types/sticker';
import { TileData } from '../types/tile';
import { Position, Direction } from '../types/board';
import { Shuffle, Play } from 'lucide-react';
import * as RackDomain from '../domain/rack/Rack';
import * as TileOperations from '../engine/TileOperations';

interface GameAreaProps {
    // State
    board: BoardState;
    rack: RackState;
    draftBoard: BoardState;
    stickers: StickerState;
    isDraftMode: boolean;
    isDictionaryLoaded: boolean;
    exitingDraft: boolean;
    
    // UI State
    boardCellSize: number;
    tileOpacity: number;
    showCoordinates: boolean;
    selectedCell: Position | null;
    selectorDirection: Direction | null;
    
    // Setters
    setRack: React.Dispatch<React.SetStateAction<RackState>>;
    setBoardCellSize: (size: number) => void;
    
    // Refs
    boardRef: React.RefObject<HTMLDivElement | null>;
    rackRef: React.RefObject<HTMLDivElement | null>;
    gameAreaRef: React.RefObject<HTMLDivElement | null>;
    discardRef: React.RefObject<HTMLDivElement | null>;
    
    // DnD
    overBoardPos: Position | null;
    overRackIndex: number | null;
    activeId: string | null;
    
    // Handlers
    handleRightClick: (tile: TileData, position: Position) => boolean;
    handleDraftSuggestionRightClick: (tile: TileData, position: Position) => boolean;
    handleRackRightClick: (tile: TileData, rackIndex: number) => boolean;
    handleShuffle: () => void;
    handlePlay: () => void;
    canPlay: boolean;
    canShuffle: boolean;
    
    // Discard animation
    discardAnim: { tile: TileData } | null;
}

export default function GameArea({
    board,
    rack,
    draftBoard,
    stickers,
    isDraftMode,
    isDictionaryLoaded,
    exitingDraft,
    boardCellSize,
    tileOpacity,
    showCoordinates,
    selectedCell,
    selectorDirection,
    setRack,
    setBoardCellSize,
    boardRef,
    rackRef,
    gameAreaRef,
    discardRef,
    overBoardPos,
    overRackIndex,
    activeId,
    handleRightClick,
    handleDraftSuggestionRightClick,
    handleRackRightClick,
    handleShuffle,
    handlePlay,
    canPlay,
    canShuffle,
    discardAnim,
}: GameAreaProps) {
    return (
        <div 
            ref={gameAreaRef}
            id="game-area" 
            className="grow bg-zinc-500 flex flex-col items-center justify-center gap-4"
            style={{ animation: 'fadeIn 0.3s ease-in-out' }}
        >
            {/* Game Board (shown when not in draft mode) */}
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
            
            {/* Draft Board (shown when in draft mode) */}
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
            
            {/* Rack and Controls (only shown in Game mode) */}
            <Activity mode={isDraftMode ? "hidden" : "visible"}>
                <div className="relative">
                    {/* Discard Slot */}
                    <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2">
                        <DiscardSlot ref={discardRef} tileSize={boardCellSize} hidden={isDraftMode} />
                    </div>

                    {/* Discard Animation */}
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
                    
                    {/* Rack */}
                    <Rack 
                        rack={rack} 
                        setRack={setRack}
                        boardCellSize={boardCellSize}
                        overBoardPos={activeId && RackDomain.findById(rack, activeId) !== null ? overBoardPos : null}
                        overRackIndex={overRackIndex}
                        boardRef={boardRef}
                        rackRef={rackRef}
                        gameAreaRef={gameAreaRef}
                        selectedCell={selectedCell}
                        onRackRightClick={handleRackRightClick}
                    />
                    
                    {/* Shuffle Button */}
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
                    
                    {/* Play Button */}
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
    );
}

