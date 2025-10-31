import { BoardState, Position, PlacementHistoryEntry } from '../types/board';
import { RackState } from '../types/rack';
import { Bag } from '../types/bag';
import { StickerState } from '../types/sticker';
import { TileData } from '../types/tile';
import * as TileOperations from './TileOperations';
import * as TileSupply from './TileSupply';
import * as PlayResolution from './PlayResolution';
import * as DiscardOperations from './DiscardOperations';
import * as Board from '../domain/board/Board';
import * as Rack from '../domain/rack/Rack';
import * as BagDomain from '../domain/bag/Bag';
import * as Stickers from '../domain/stickers/Stickers';

/**
 * Game state snapshot for operations
 */
export interface GameStateSnapshot {
    board: BoardState;
    rack: RackState;
    bag: Bag;
    discard: TileData[];
    stickers: StickerState;
    totalScore: number;
    placementHistory: PlacementHistoryEntry[];
}

/**
 * Result of placing a tile from rack to board
 */
export interface PlaceFromRackResult {
    board: BoardState;
    rack: RackState;
    placementHistory: PlacementHistoryEntry[];
}

/**
 * Result of removing a tile from board to rack
 */
export interface RemoveToRackResult {
    board: BoardState;
    rack: RackState;
    placementHistory: PlacementHistoryEntry[];
}

/**
 * Result of moving a tile on the board
 */
export interface MoveOnBoardResult {
    board: BoardState;
}

/**
 * Result of swapping tiles between rack and board
 */
export interface SwapRackBoardResult {
    board: BoardState;
    rack: RackState;
    placementHistory: PlacementHistoryEntry[];
}

/**
 * Result of resolving a play
 */
export interface ResolvePlayResult {
    board: BoardState;
    rack: RackState;
    bag: Bag;
    discard: TileData[];
    stickers: StickerState;
    totalScore: number;
    placementHistory: PlacementHistoryEntry[];
}

/**
 * Result of discarding and drawing
 */
export interface DiscardAndDrawResult {
    board: BoardState;
    rack: RackState;
    bag: Bag;
    discard: TileData[];
    placementHistory: PlacementHistoryEntry[];
    drawnSlot: number | null;
}

/**
 * Result of drawing to fill rack
 */
export interface DrawToFillResult {
    rack: RackState;
    bag: Bag;
    discard: TileData[];
}

/**
 * Result of redrawing rack
 */
export interface RedrawResult {
    rack: RackState;
    bag: Bag;
    discard: TileData[];
}

/**
 * High-level game service for orchestrating complex game operations
 * Delegates to domain modules and existing engine functions
 */
class GameService {
    /**
     * Place a tile from rack onto the board
     */
    static placeFromRack(
        rack: RackState,
        rackIndex: number,
        board: BoardState,
        targetPosition: Position,
        placementHistory: PlacementHistoryEntry[]
    ): PlaceFromRackResult | null {
        const result = TileOperations.placeTileOnBoardFromRack(
            rack,
            rackIndex,
            board,
            targetPosition,
            true // track history
        );

        if (!result || !result.placementHistoryEntry) {
            return null;
        }

        return {
            board: result.board,
            rack: result.rack,
            placementHistory: [...placementHistory, result.placementHistoryEntry],
        };
    }

    /**
     * Remove a tile from board back to rack
     */
    static removeToRack(
        board: BoardState,
        boardPosition: Position,
        rack: RackState,
        placementHistory: PlacementHistoryEntry[]
    ): RemoveToRackResult | null {
        const result = TileOperations.removeTileFromBoardToRack(
            board,
            boardPosition,
            rack
        );

        if (!result) {
            return null;
        }

        // Remove from placement history
        if (!result.removedTile) {
            // This should never happen if the operation succeeded
            throw new Error('Removed tile is null despite successful operation');
        }

        const updatedHistory = placementHistory.filter(
            e => !(e.tileId === result.removedTile!.id &&
                   e.position.row === boardPosition.row &&
                   e.position.col === boardPosition.col)
        );

        return {
            board: result.board,
            rack: result.rack,
            placementHistory: updatedHistory,
        };
    }

    /**
     * Move a tile between board positions
     */
    static moveOnBoard(
        board: BoardState,
        sourcePosition: Position,
        targetPosition: Position
    ): MoveOnBoardResult | null {
        const result = TileOperations.moveTileBetweenBoardPositions(
            board,
            sourcePosition,
            targetPosition
        );

        if (!result) {
            return null;
        }

        return {
            board: result.board,
        };
    }

    /**
     * Swap a tile between rack and board
     */
    static swapRackBoard(
        rack: RackState,
        rackIndex: number,
        board: BoardState,
        boardPosition: Position,
        placementHistory: PlacementHistoryEntry[]
    ): SwapRackBoardResult | null {
        const result = TileOperations.swapRackAndBoardTile(
            rack,
            rackIndex,
            board,
            boardPosition,
            true // track history
        );

        if (!result || !result.placementHistoryEntry) {
            return null;
        }

        return {
            board: result.board,
            rack: result.rack,
            placementHistory: [...placementHistory, result.placementHistoryEntry],
        };
    }

    /**
     * Resolve a play: score, lock tiles, consume stickers, refill rack
     */
    static resolvePlay(state: GameStateSnapshot): ResolvePlayResult {
        const result = PlayResolution.resolvePlay({
            board: state.board,
            stickers: state.stickers,
            rack: state.rack,
            bag: state.bag,
            discard: state.discard,
            currentTotalScore: state.totalScore,
        });

        return {
            board: result.board,
            rack: result.rack,
            bag: result.bag,
            discard: result.discard,
            stickers: result.stickers,
            totalScore: result.totalScore,
            placementHistory: result.placementHistory,
        };
    }

    /**
     * Discard a tile and draw a replacement
     */
    static discardAndDraw(
        tileId: string,
        state: GameStateSnapshot
    ): DiscardAndDrawResult | null {
        const result = DiscardOperations.discardAndDraw(
            state.rack,
            state.board,
            state.placementHistory,
            {
                rack: state.rack,
                bag: state.bag,
                discard: state.discard,
            },
            tileId
        );

        if (!result) {
            return null;
        }

        return {
            board: result.board,
            rack: result.rack,
            bag: result.bag,
            discard: result.discard,
            placementHistory: result.placementHistoryUpdates,
            drawnSlot: result.drawnSlot,
        };
    }

    /**
     * Draw tiles to fill the rack
     */
    static drawToFill(state: GameStateSnapshot): DrawToFillResult {
        return TileSupply.drawToFill({
            rack: state.rack,
            bag: state.bag,
            discard: state.discard,
        });
    }

    /**
     * Redraw all tiles in the rack
     */
    static redraw(state: GameStateSnapshot): RedrawResult {
        return TileSupply.redraw({
            rack: state.rack,
            bag: state.bag,
            discard: state.discard,
        });
    }

    /**
     * Create a new tile bag with standard distribution
     */
    static createNewBag(): Bag {
        return BagDomain.createStandard();
    }

    /**
     * Shuffle the bag
     */
    static shuffleBag(bag: Bag): Bag {
        return BagDomain.shuffle(bag);
    }

    /**
     * Create initial game state
     */
    static createInitialState(): Omit<GameStateSnapshot, 'placementHistory'> {
        return {
            board: Board.createEmpty(),
            rack: Rack.createEmpty(),
            bag: [],
            discard: [],
            stickers: Stickers.createInitialStickers(),
            totalScore: 0,
        };
    }
}

export default GameService;
