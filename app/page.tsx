"use client";

import { DndContext } from '@dnd-kit/core';
import DebugMenu from "../src/components/DebugMenu";
import { GameProvider } from "../src/state/GameContext";
import GameArea from "../src/components/GameArea";
import LetterSelectionPopup from '../src/components/LetterSelectionPopup';
import { useGameController } from "../src/hooks/useGameController";

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
                    <GameArea
                        board={board}
                        rack={rack}
                        draftBoard={draftBoard}
                        stickers={stickers}
                        isDraftMode={isDraftMode}
                        isDictionaryLoaded={isDictionaryLoaded}
                        exitingDraft={exitingDraft}
                        boardCellSize={boardCellSize}
                        tileOpacity={tileOpacity}
                        showCoordinates={showCoordinates}
                        selectedCell={selectedCell}
                        selectorDirection={selectorDirection}
                        setRack={setRack}
                        setBoardCellSize={setBoardCellSize}
                        boardRef={boardRef}
                        rackRef={rackRef}
                        gameAreaRef={gameAreaRef}
                        discardRef={discardRef}
                        overBoardPos={overBoardPos}
                        overRackIndex={overRackIndex}
                        activeId={activeId}
                        handleRightClick={handleRightClick}
                        handleDraftSuggestionRightClick={handleDraftSuggestionRightClick}
                        handleRackRightClick={handleRackRightClick}
                        handleShuffle={handleShuffle}
                        handlePlay={handlePlay}
                        canPlay={canPlay}
                        canShuffle={canShuffle}
                        discardAnim={discardAnim}
                    />
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
