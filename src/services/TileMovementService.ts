import { BoardState, Position, PlacementHistoryEntry } from '../types/board';
import { RackState } from '../types/rack';
import { TileData } from '../types/tile';
import { placeTileOnBoard, removeTileFromBoard, swapBoardTiles } from '../utils/boardUtils';
import { moveTileToRack, removeTileFromRack, swapRackTiles as swapRackTilesUtil, findFirstEmptySlot } from '../utils/rackUtils';

/**
 * Result of placing a tile on the board from a rack
 */
export interface PlaceTileOnBoardResult {
    board: BoardState;
    rack: RackState;
    placementHistoryEntry: PlacementHistoryEntry | null;
    swappedTile: TileData | null; // The tile that was swapped out (if any)
}

/**
 * Result of removing a tile from the board to a rack
 */
export interface RemoveTileFromBoardResult {
    board: BoardState;
    rack: RackState;
    removedTile: TileData | null;
    wasBlank: boolean; // Whether the removed tile was originally a blank
    revertedTile: TileData | null; // The reverted tile (if blank was reverted)
}

/**
 * Result of moving a tile between board positions
 */
export interface MoveTileBetweenBoardPositionsResult {
    board: BoardState;
}

/**
 * Result of swapping tiles
 */
export interface SwapTilesResult {
    board: BoardState;
    rack: RackState;
}

/**
 * Centralized service for managing tile movement operations (board, rack, placement history).
 * All methods are pure functions that take current state and return new state.
 */
export class TileMovementService {
    /**
     * Places a tile from a rack slot onto a board position.
     * Supports swapping if the target board position already has a tile.
     * 
     * @param rack - Current rack state
     * @param rackIndex - Index of the tile in the rack to place
     * @param board - Current board state
     * @param targetPosition - Board position to place the tile
     * @param trackHistory - Whether to create a placement history entry
     * @returns New board and rack states, with placement history entry and swapped tile info
     */
    static placeTileOnBoard(
        rack: RackState,
        rackIndex: number,
        board: BoardState,
        targetPosition: Position,
        trackHistory: boolean = true
    ): PlaceTileOnBoardResult | null {
        const tile = rack[rackIndex];
        if (!tile) {
            return null; // No tile at this rack index
        }

        const targetCell = board[targetPosition.row][targetPosition.col];
        if (!targetCell.canPlace) {
            return null; // Cannot place on this cell
        }

        const swappedTile: TileData | null = targetCell.tile && targetCell.canTake ? targetCell.tile : null;
        const wasBlank = tile.originalValue === '*';

        // Update rack: remove tile from source, add swapped tile if any
        let newRack = removeTileFromRack(rack, rackIndex);
        if (swappedTile) {
            newRack = moveTileToRack(newRack, swappedTile, rackIndex);
        }

        // Update board: place tile
        const newBoard = placeTileOnBoard(board, tile, targetPosition);

        // Create placement history entry if tracking
        const placementHistoryEntry: PlacementHistoryEntry | null = trackHistory
            ? { tileId: tile.id, position: targetPosition, wasBlank }
            : null;

        return {
            board: newBoard,
            rack: newRack,
            placementHistoryEntry,
            swappedTile,
        };
    }

    /**
     * Removes a tile from a board position and places it in a rack slot.
     * Handles blank tile reversion automatically.
     * 
     * @param board - Current board state
     * @param boardPosition - Board position to remove tile from
     * @param rack - Current rack state
     * @param targetRackIndex - Specific rack index to place tile (if null, finds first empty slot)
     * @returns New board and rack states, with removed tile info and blank reversion handling
     */
    static removeTileFromBoard(
        board: BoardState,
        boardPosition: Position,
        rack: RackState,
        targetRackIndex: number | null = null
    ): RemoveTileFromBoardResult | null {
        const sourceCell = board[boardPosition.row][boardPosition.col];
        if (!sourceCell.tile || !sourceCell.canTake) {
            return null; // No tile or cannot take from this cell
        }

        const removedTile = sourceCell.tile;
        const wasBlank = removedTile.originalValue === '*';

        // Determine target rack index
        let rackIndex = targetRackIndex;
        if (rackIndex === null) {
            rackIndex = findFirstEmptySlot(rack);
            if (rackIndex === null) {
                return null; // No empty slot available
            }
        }

        // Revert blank tile if needed
        let tileToAdd: TileData = removedTile;
        let revertedTile: TileData | null = null;
        if (wasBlank) {
            revertedTile = {
                ...removedTile,
                value: '*',
                originalValue: undefined,
                displayValue: undefined,
            } as TileData;
            tileToAdd = revertedTile;
        }

        // Update board: remove tile
        const newBoard = removeTileFromBoard(board, boardPosition);

        // Update rack: add tile
        const newRack = moveTileToRack(rack, tileToAdd, rackIndex);

        return {
            board: newBoard,
            rack: newRack,
            removedTile,
            wasBlank,
            revertedTile,
        };
    }

    /**
     * Moves a tile from one board position to another.
     * 
     * @param board - Current board state
     * @param sourcePosition - Source board position
     * @param targetPosition - Target board position
     * @returns New board state with tile moved, or null if move is invalid
     */
    static moveTileBetweenBoardPositions(
        board: BoardState,
        sourcePosition: Position,
        targetPosition: Position
    ): MoveTileBetweenBoardPositionsResult | null {
        const sourceCell = board[sourcePosition.row][sourcePosition.col];
        if (!sourceCell.tile || !sourceCell.canTake) {
            return null; // No tile or cannot take from source
        }

        const targetCell = board[targetPosition.row][targetPosition.col];
        const targetAllowsPlacement = !targetCell.tile
            ? targetCell.canPlace
            : targetCell.canPlace && targetCell.canTake;

        if (!targetAllowsPlacement) {
            return null; // Cannot place on target
        }

        // Swap tiles if target has a tile, otherwise just move
        const newBoard = swapBoardTiles(board, sourcePosition, targetPosition);

        return {
            board: newBoard,
        };
    }

    /**
     * Swaps two rack tiles.
     * 
     * @param rack - Current rack state
     * @param rackIndex1 - First rack index
     * @param rackIndex2 - Second rack index
     * @returns New rack state with tiles swapped
     */
    static swapRackTiles(
        rack: RackState,
        rackIndex1: number,
        rackIndex2: number
    ): RackState {
        return swapRackTilesUtil(rack, rackIndex1, rackIndex2);
    }

    /**
     * Swaps a tile between rack and board (bidirectional).
     * 
     * @param rack - Current rack state
     * @param rackIndex - Rack index
     * @param board - Current board state
     * @param boardPosition - Board position
     * @param trackHistory - Whether to track placement history for board placement
     * @returns New board and rack states, with placement history entry if applicable
     */
    static swapRackAndBoardTile(
        rack: RackState,
        rackIndex: number,
        board: BoardState,
        boardPosition: Position,
        trackHistory: boolean = true
    ): (SwapTilesResult & { placementHistoryEntry: PlacementHistoryEntry | null }) | null {
        const rackTile = rack[rackIndex];
        const boardCell = board[boardPosition.row][boardPosition.col];

        if (!rackTile) {
            return null; // No tile in rack at this index
        }

        if (!boardCell.canPlace || (boardCell.tile && !boardCell.canTake)) {
            return null; // Cannot place on board or cannot swap
        }

        const boardTile = boardCell.tile;
        const wasBlank = rackTile.originalValue === '*';

        // Update rack: replace with board tile (or null if board was empty)
        let newRack = [...rack];
        if (boardTile) {
            newRack[rackIndex] = boardTile;
        } else {
            newRack[rackIndex] = null;
        }

        // Update board: place rack tile
        const newBoard = placeTileOnBoard(board, rackTile, boardPosition);

        // Create placement history entry if tracking and placing a tile
        const placementHistoryEntry: PlacementHistoryEntry | null = trackHistory && rackTile
            ? { tileId: rackTile.id, position: boardPosition, wasBlank }
            : null;

        return {
            board: newBoard,
            rack: newRack,
            placementHistoryEntry,
        };
    }

    /**
     * Finds a tile in the rack by ID.
     * 
     * @param rack - Current rack state
     * @param tileId - Tile ID to find
     * @returns Rack index if found, null otherwise
     */
    static findTileInRack(rack: RackState, tileId: string): number | null {
        for (let i = 0; i < rack.length; i++) {
            if (rack[i]?.id === tileId) {
                return i;
            }
        }
        return null;
    }

    /**
     * Finds a tile position on the board by ID.
     * 
     * @param board - Current board state
     * @param tileId - Tile ID to find
     * @returns Position if found, null otherwise
     */
    static findTilePosition(board: BoardState, tileId: string): Position | null {
        for (let row = 0; row < board.length; row++) {
            for (let col = 0; col < board[row].length; col++) {
                if (board[row][col]?.tile?.id === tileId) {
                    return { row, col };
                }
            }
        }
        return null;
    }
}

