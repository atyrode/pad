import { BoardState, PlacementHistoryEntry, Position } from "../types/board";
import { RackState } from "../types/rack";
import { Bag } from "../types/bag";
import { StickerState } from "../types/sticker";
import { TileData } from "../types/tile";
import { GameAction } from "./gameTypes";
import { findFirstEmptySlot, moveTileToRack, shuffleRack } from "../utils/rackUtils";
import { drawTileFromBag, shuffleBag } from "../utils/bagUtils";
import { removeTileFromBoard, createInitialBoard } from "../utils/boardUtils";
import { calculateCurrentPlayScore } from "../utils/scoreUtils";
import { consumeSticker, createInitialStickers } from "../utils/stickerUtils";

export type GameDispatch = React.Dispatch<GameAction>;

export function computeDrawWithRefill(
    currentRack: RackState,
    currentBag: Bag,
    currentDiscard: TileData[],
    targetSlotIndex?: number
): { newRack: RackState; newBag: Bag; didRefill: boolean } {
    let workingBag = currentBag;
    let didRefill = false;
    if (workingBag.length === 0 && currentDiscard.length > 0) {
        workingBag = shuffleBag([...currentDiscard]);
        didRefill = true;
    }
    const slotIndex = targetSlotIndex ?? findFirstEmptySlot(currentRack);
    if (slotIndex === null || slotIndex === undefined) {
        return { newRack: currentRack, newBag: workingBag, didRefill };
    }
    if (workingBag.length === 0) {
        return { newRack: currentRack, newBag: workingBag, didRefill };
    }
    const { tile, newBag } = drawTileFromBag(workingBag);
    if (!tile) {
        return { newRack: currentRack, newBag: workingBag, didRefill };
    }
    const newRack = [...currentRack];
    newRack[slotIndex] = tile;
    return { newRack, newBag, didRefill };
}

export function fillRackAfterPlayAction(
    args: {
        isDraftMode: boolean;
        rack: RackState;
        bag: Bag;
        discard: TileData[];
    },
    dispatch: GameDispatch
) {
    if (args.isDraftMode) return;
    let rackWork = [...args.rack];
    let bagWork = args.bag;
    let discardWork = args.discard;
    let usedRefill = false;

    while (true) {
        const slot = findFirstEmptySlot(rackWork);
        if (slot === null) break;
        if (bagWork.length === 0) {
            if (discardWork.length === 0) break;
            bagWork = shuffleBag([...discardWork]);
            discardWork = [];
            usedRefill = true;
        }
        const { tile, newBag } = drawTileFromBag(bagWork);
        if (!tile) break;
        rackWork[slot] = tile;
        bagWork = newBag;
    }

    if (usedRefill) dispatch({ type: 'setDiscard', payload: { discard: [] } });
    dispatch({ type: 'setBag', payload: { bag: bagWork } });
    dispatch({ type: 'setRack', payload: { rack: rackWork } });
}

export function handlePlayAction(
    args: {
        board: BoardState;
        stickers: StickerState;
        rack: RackState;
        bag: Bag;
        discard: TileData[];
        currentTotalScore: number;
    },
    dispatch: GameDispatch
) {
    const { totalScore } = calculateCurrentPlayScore(args.board, args.stickers);
    const newTotal = args.currentTotalScore + totalScore;
    dispatch({ type: 'setTotalScore', payload: { totalScore: newTotal } });

    // Lock tiles
    const lockedBoard = args.board.map(row =>
        row.map(cell => (cell.tile && cell.canTake ? { ...cell, canPlace: false, canTake: false } : cell))
    );
    dispatch({ type: 'setBoard', payload: { board: lockedBoard } });

    // Consume stickers where tiles were locked
    let newStickers = args.stickers;
    for (let row = 0; row < args.board.length; row++) {
        for (let col = 0; col < args.board[row].length; col++) {
            const cell = args.board[row][col];
            if (cell.tile && cell.canTake) {
                newStickers = consumeSticker(newStickers, { row, col });
            }
        }
    }
    dispatch({ type: 'setStickers', payload: { stickers: newStickers } });

    // Clear placement history
    dispatch({ type: 'setPlacementHistory', payload: { placementHistory: [] } });

    // Fill rack
    fillRackAfterPlayAction(
        { isDraftMode: false, rack: args.rack, bag: args.bag, discard: args.discard },
        dispatch
    );
}

export function handleKeyboardTilePlacementAction(
    args: {
        letter: string;
        selectedCell: Position | null;
        board: BoardState;
        rack: RackState;
        placementHistory: PlacementHistoryEntry[];
    },
    dispatch: GameDispatch
): boolean {
    if (!args.selectedCell) return false;

    let rackIndex = args.rack.findIndex(
        t => t && t.value.toUpperCase() === args.letter.toUpperCase()
    );

    let tile = args.rack[rackIndex];
    let wasBlank = false;
    if (rackIndex === -1) {
        rackIndex = args.rack.findIndex(t => t && t.value === '*');
        if (rackIndex !== -1) {
            const blankTile = args.rack[rackIndex]!;
            tile = {
                ...blankTile,
                value: args.letter.toUpperCase(),
                originalValue: '*',
                displayValue: args.letter.toUpperCase(),
            } as TileData;
            wasBlank = true;
        }
    }
    if (rackIndex === -1 || !tile) return false;

    const targetCell = args.board[args.selectedCell.row][args.selectedCell.col];
    if (!targetCell.canPlace) return false;

    // Rack updates
    let nextRack = [...args.rack];
    if (targetCell.tile && targetCell.canTake) {
        nextRack[rackIndex] = targetCell.tile;
    } else {
        nextRack[rackIndex] = null;
    }
    dispatch({ type: 'setRack', payload: { rack: nextRack } });

    // Board update
    const nextBoard = args.board.map(row => [...row]);
    nextBoard[args.selectedCell.row][args.selectedCell.col] = { tile, canPlace: true, canTake: true };
    dispatch({ type: 'setBoard', payload: { board: nextBoard } });

    const entry: PlacementHistoryEntry = { tileId: tile.id, position: args.selectedCell, wasBlank };
    dispatch({ type: 'setPlacementHistory', payload: { placementHistory: [...args.placementHistory, entry] } });

    return true;
}

export function handleKeyboardTileRemovalAction(
    args: {
        placementHistory: PlacementHistoryEntry[];
        board: BoardState;
        rack: RackState;
    },
    dispatch: GameDispatch
): { success: boolean; position?: Position } {
    if (args.placementHistory.length === 0) return { success: false };

    const emptySlotIndex = findFirstEmptySlot(args.rack);
    if (emptySlotIndex === null) return { success: false };

    let newHistory = [...args.placementHistory];
    let removedPosition: Position | null = null;

    while (newHistory.length > 0) {
        const lastPlacement = newHistory[newHistory.length - 1];
        const { tileId, position, wasBlank } = lastPlacement;
        const cell = args.board[position.row][position.col];
        if (!cell.tile || cell.tile.id !== tileId || !cell.canTake) {
            newHistory = newHistory.slice(0, -1);
            continue;
        }

        const nextBoard = removeTileFromBoard(args.board, position);
        dispatch({ type: 'setBoard', payload: { board: nextBoard } });

        if (wasBlank && cell.tile) {
            const revertedTile = {
                ...cell.tile,
                value: '*',
                originalValue: undefined,
                displayValue: undefined,
            } as TileData;
            const nextRack = moveTileToRack(args.rack, revertedTile, emptySlotIndex);
            dispatch({ type: 'setRack', payload: { rack: nextRack } });
        } else {
            const nextRack = moveTileToRack(args.rack, cell.tile!, emptySlotIndex);
            dispatch({ type: 'setRack', payload: { rack: nextRack } });
        }

        newHistory = newHistory.slice(0, -1);
        removedPosition = position;
        break;
    }

    dispatch({ type: 'setPlacementHistory', payload: { placementHistory: newHistory } });
    if (removedPosition) return { success: true, position: removedPosition };
    return { success: false };
}

// === Debug/Control actions ===

export function drawOneAction(
    args: { rack: RackState; bag: Bag; discard: TileData[] },
    dispatch: GameDispatch
) {
    const { newRack, newBag, didRefill } = computeDrawWithRefill(args.rack, args.bag, args.discard);
    if (didRefill) dispatch({ type: 'setDiscard', payload: { discard: [] } });
    dispatch({ type: 'setBag', payload: { bag: newBag } });
    dispatch({ type: 'setRack', payload: { rack: newRack } });
}

export function drawAllAction(
    args: { rack: RackState; bag: Bag; discard: TileData[] },
    dispatch: GameDispatch
) {
    let rackWork = [...args.rack];
    let bagWork = args.bag;
    let discardWork = args.discard;
    let usedRefill = false;

    for (let i = 0; i < rackWork.length; i++) {
        if (rackWork[i] !== null) continue;
        if (bagWork.length === 0) {
            if (discardWork.length === 0) break;
            bagWork = shuffleBag([...discardWork]);
            discardWork = [];
            usedRefill = true;
        }
        const { tile, newBag } = drawTileFromBag(bagWork);
        if (!tile) break;
        rackWork[i] = tile;
        bagWork = newBag;
    }

    if (usedRefill) dispatch({ type: 'setDiscard', payload: { discard: [] } });
    dispatch({ type: 'setBag', payload: { bag: bagWork } });
    dispatch({ type: 'setRack', payload: { rack: rackWork } });
}

export function redrawAction(
    args: { rack: RackState; bag: Bag; discard: TileData[] },
    dispatch: GameDispatch
) {
    const currentTileCount = args.rack.filter(t => t !== null).length;
    let bagWork = args.bag;
    let discardWork = args.discard;
    let usedRefill = false;
    const newRack: RackState = Array(args.rack.length).fill(null);

    for (let i = 0; i < currentTileCount; i++) {
        if (bagWork.length === 0) {
            if (discardWork.length === 0) break;
            bagWork = shuffleBag([...discardWork]);
            discardWork = [];
            usedRefill = true;
        }
        const { tile, newBag } = drawTileFromBag(bagWork);
        if (!tile) break;
        newRack[i] = tile;
        bagWork = newBag;
    }

    if (usedRefill) dispatch({ type: 'setDiscard', payload: { discard: [] } });
    dispatch({ type: 'setBag', payload: { bag: bagWork } });
    dispatch({ type: 'setRack', payload: { rack: newRack } });
}

export function shuffleBagAction(args: { bag: Bag }, dispatch: GameDispatch) {
    dispatch({ type: 'setBag', payload: { bag: shuffleBag(args.bag) } });
}

export function resetBoardAction(dispatch: GameDispatch) {
    dispatch({ type: 'setBoard', payload: { board: createInitialBoard() } });
}

export function resetRackAction(args: { rackSize: number }, dispatch: GameDispatch) {
    const emptyRack: RackState = Array(args.rackSize).fill(null);
    dispatch({ type: 'setRack', payload: { rack: emptyRack } });
}

export function resetScoreAction(dispatch: GameDispatch) {
    dispatch({ type: 'setTotalScore', payload: { totalScore: 0 } });
}

export function resetStickersAction(args: { board: BoardState }, dispatch: GameDispatch) {
    let stickers = createInitialStickers();
    for (let row = 0; row < args.board.length; row++) {
        for (let col = 0; col < args.board[row].length; col++) {
            const cell = args.board[row][col];
            if (cell.tile && !cell.canTake) {
                stickers = consumeSticker(stickers, { row, col });
            }
        }
    }
    dispatch({ type: 'setStickers', payload: { stickers } });
}

export function resetBagFromDraftAction(
    args: { draftBoard: BoardState },
    dispatch: GameDispatch
) {
    const centerCount = 7;
    const centerStart = Math.floor((11 - centerCount) / 2);
    const positions = [7, 8].flatMap(r => Array.from({ length: centerCount }, (_, i) => ({ row: r, col: centerStart + i })));
    const draftedTiles = positions
        .map(p => args.draftBoard[p.row][p.col].tile)
        .filter(Boolean) as TileData[];
    dispatch({ type: 'setBag', payload: { bag: shuffleBag([...draftedTiles]) } });
}


