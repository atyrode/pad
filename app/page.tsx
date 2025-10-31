"use client";

import React, { useEffect } from 'react';
import { DndContext } from '@dnd-kit/core';
import DebugMenu from "../src/components/DebugMenu";
import GameArea from "../src/components/GameArea";
import LetterSelectionPopup from '../src/components/LetterSelectionPopup';
import { useGameController } from "../src/hooks/useGameController";
import { useGameStore } from "../src/state/store";
import * as Dictionary from "../src/domain/dictionary/Dictionary";

function HomeContent() {
    const setDictionaryLoaded = useGameStore((state) => state.setDictionaryLoaded);

    // Preload dictionary on app startup
    useEffect(() => {
        Dictionary.preload().finally(() => setDictionaryLoaded(true));
    }, [setDictionaryLoaded]);

    const {
        // render flags and state
        mounted,
        // ui state
        boardCellSize,
        setBoardCellSize,
        boardRef,
        rackRef,
        gameAreaRef,
        discardRef,
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
        // actions
        handleRightClick,
        handleDraftSuggestionRightClick,
        handleRackRightClick,
        handleShuffle,
        handlePlay,
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
                    <DebugMenu />
                    <GameArea
                        boardCellSize={boardCellSize}
                        selectedCell={selectedCell}
                        selectorDirection={selectorDirection}
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
    return <HomeContent />;
}
