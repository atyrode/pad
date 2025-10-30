import { BoardState, PlacementHistoryEntry, Position } from "../types/board";
import { RackState } from "../types/rack";
import { Bag } from "../types/bag";
import { StickerState } from "../types/sticker";
import { TileData } from "../types/tile";
import { GameAction } from "./gameTypes";
import { findFirstEmptySlot, shuffleRack } from "../utils/rackUtils";
import { shuffleBag } from "../utils/bagUtils";
import { createInitialBoard } from "../utils/boardUtils";
import { calculateCurrentPlayScore } from "../utils/scoreUtils";
import { consumeSticker, createInitialStickers } from "../utils/stickerUtils";
import { TileSupplyService } from "../services/TileSupplyService";
import { TileMovementService } from "../services/TileMovementService";
import { resolvePlay } from "../services/PlayService";

export type GameDispatch = React.Dispatch<GameAction>;

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

    const result = TileSupplyService.drawToFill({
        rack: args.rack,
        bag: args.bag,
        discard: args.discard,
    });

    dispatch({ type: 'batchUpdate', payload: { discard: result.discard, bag: result.bag, rack: result.rack } });
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
    const result = resolvePlay(args);

    dispatch({
        type: 'batchUpdate',
        payload: {
            totalScore: result.totalScore,
            board: result.board,
            stickers: result.stickers,
            placementHistory: result.placementHistory,
            rack: result.rack,
            bag: result.bag,
            discard: result.discard,
        }
    });
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

    // Handle blank tile transformation before placement
    if (wasBlank) {
        // Transform blank tile for placement
        const transformedTile: TileData = {
            ...tile,
            value: args.letter.toUpperCase(),
            originalValue: '*',
            displayValue: args.letter.toUpperCase(),
        } as TileData;
        
        // Update rack with transformed tile temporarily
        const tempRack = [...args.rack];
        tempRack[rackIndex] = transformedTile;
        
        // Use TileMovementService to place the transformed tile
        const result = TileMovementService.placeTileOnBoard(
            tempRack,
            rackIndex,
            args.board,
            args.selectedCell,
            true // track history
        );
        
        if (result && result.placementHistoryEntry) {
            dispatch({ type: 'setRack', payload: { rack: result.rack } });
            dispatch({ type: 'setBoard', payload: { board: result.board } });
            dispatch({ 
                type: 'setPlacementHistory', 
                payload: { placementHistory: [...args.placementHistory, result.placementHistoryEntry] } 
            });
            return true;
        }
        return false;
    }

    // Place regular tile using TileMovementService
    const result = TileMovementService.placeTileOnBoard(
        args.rack,
        rackIndex,
        args.board,
        args.selectedCell,
        true // track history
    );
    
    if (result && result.placementHistoryEntry) {
        dispatch({ type: 'setRack', payload: { rack: result.rack } });
        dispatch({ type: 'setBoard', payload: { board: result.board } });
        dispatch({ 
            type: 'setPlacementHistory', 
            payload: { placementHistory: [...args.placementHistory, result.placementHistoryEntry] } 
        });
        return true;
    }
    
    return false;
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

        // Use TileMovementService which handles blank tile reversion automatically
        const result = TileMovementService.removeTileFromBoard(
            args.board,
            position,
            args.rack,
            emptySlotIndex
        );
        
        if (result) {
            dispatch({ type: 'setBoard', payload: { board: result.board } });
            dispatch({ type: 'setRack', payload: { rack: result.rack } });
            
            newHistory = newHistory.slice(0, -1);
            removedPosition = position;
            break;
        } else {
            // If removal failed, skip this history entry
            newHistory = newHistory.slice(0, -1);
            continue;
        }
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
    const result = TileSupplyService.drawOne({
        rack: args.rack,
        bag: args.bag,
        discard: args.discard,
    });

    if (!result) return;

    dispatch({ type: 'batchUpdate', payload: { discard: result.discard, bag: result.bag, rack: result.rack } });
}

export function drawAllAction(
    args: { rack: RackState; bag: Bag; discard: TileData[] },
    dispatch: GameDispatch
) {
    const result = TileSupplyService.drawToFill({
        rack: args.rack,
        bag: args.bag,
        discard: args.discard,
    });

    dispatch({ type: 'batchUpdate', payload: { discard: result.discard, bag: result.bag, rack: result.rack } });
}

export function redrawAction(
    args: { rack: RackState; bag: Bag; discard: TileData[] },
    dispatch: GameDispatch
) {
    const result = TileSupplyService.redraw({
        rack: args.rack,
        bag: args.bag,
        discard: args.discard,
    });

    dispatch({ type: 'batchUpdate', payload: { discard: result.discard, bag: result.bag, rack: result.rack } });
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


