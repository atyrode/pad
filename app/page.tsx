"use client";

import { Activity } from 'react';
import { DndContext } from '@dnd-kit/core';
import DebugMenu from "../src/components/DebugMenu";
import { GameProvider } from "../src/state/GameContext";
import Board from "../src/components/Board";
import DraftBoard from "../src/components/DraftBoard";
import Rack from "../src/components/Rack";
import DiscardSlot from "../src/components/DiscardSlot";
import { TileData } from '../src/types/tile';
import { Position } from '../src/types/board';
import { Shuffle, Play } from 'lucide-react';
import LetterSelectionPopup from '../src/components/LetterSelectionPopup';
import { useGameController } from "../src/hooks/useGameController";
import { findTileInRack } from "../src/utils/rackUtils";

function HomeContent() {
    const {
        // render flags and state
        mounted,
        state: {
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
        },
        // setters
        setBoard,
        setRack,
        setBag,
        setDiscard,
        setStickers,
        setTotalScore,
        setTileOpacity,
        setShowCoordinates,
        setIsDraftMode,
        setDraftBoard,
        setDraftRerollCount,
        setDraftEnded,
        setHasSeededFromDraft,
        // ui state
        boardCellSize,
        setBoardCellSize,
        boardRef,
        rackRef,
        gameAreaRef,
        discardRef,
        exitingDraft,
        setExitingDraft,
        // dnd
        sensors,
        handleDragStart,
        handleDragOver,
        handleDragEnd,
        overBoardPos,
        overRackIndex,
        activeId,
        collisionDetection,
        // keyboard
        selectedCell,
        selectorDirection,
        advanceSelector,
        // actions
        handleRightClick,
        handleDraftSuggestionRightClick,
        handleRackRightClick,
        handleShuffle,
        handlePlay,
        canPlay,
        canShuffle,
        // popup
        blankTilePopup,
        handleLetterSelection,
        handlePopupCancel,
        getAllAvailableLetters,
        // debug menu consolidated
        debugActions,
        // discard animation
        discardAnim,
    } = useGameController();

    return (
        <div id="main" className="h-screen w-screen bg-zinc-500 flex">
            {mounted ? (
                <DndContext
                    sensors={sensors}
                    collisionDetection={collisionDetection}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragEnd={handleDragEnd}
                >
                    <DebugMenu bag={bag} rack={rack} board={board} setRack={setRack} setBag={setBag} setBoard={setBoard} draftBoard={draftBoard} setDraftBoard={setDraftBoard} totalScore={totalScore} setTotalScore={setTotalScore} stickers={stickers} setStickers={setStickers} tileOpacity={tileOpacity} setTileOpacity={setTileOpacity} showCoordinates={showCoordinates} setShowCoordinates={setShowCoordinates} isDraftMode={isDraftMode} setIsDraftMode={setIsDraftMode} discard={discard} setDiscard={setDiscard}
                        onDraw={debugActions.onDraw}
                        onDrawAll={debugActions.onDrawAll}
                        onRedraw={debugActions.onRedraw}
                        onClearRack={debugActions.onClearRack}
                        onResetBoard={debugActions.onResetBoard}
                        onResetScore={debugActions.onResetScore}
                        onResetStickers={debugActions.onResetStickers}
                        onResetBag={debugActions.onResetBag}
                        onResetGame={debugActions.onResetGame}
                        onShuffleBag={debugActions.onShuffleBag}
                        onResetDraft={debugActions.onResetDraft}
                        onRerollSuggestions={debugActions.onRerollSuggestions} />
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
