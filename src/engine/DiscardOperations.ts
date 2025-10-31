import { BoardState, PlacementHistoryEntry } from '../types/board';
import { RackState } from '../types/rack';
import { TileData } from '../types/tile';
import * as TileOperations from './TileOperations';
import * as TileSupply from './TileSupply';

/**
 * Result of removing a tile from its source (rack or board) for discarding
 */
export interface RemoveForDiscardResult {
    rack: RackState;
    board: BoardState;
    removedTile: TileData;
    placementHistoryUpdates: PlacementHistoryEntry[];
}

/**
 * Result of a complete discard operation (remove + optionally draw)
 */
export interface DiscardResult {
    rack: RackState;
    board: BoardState;
    bag: TileData[];
    discard: TileData[];
    placementHistoryUpdates: PlacementHistoryEntry[];
    drawnSlot: number | null;
}

/**
 * Removes a tile from its source (rack or board) for discarding.
 * Handles placement history cleanup when removing from board.
 * 
 * @param rack - Current rack state
 * @param board - Current board state
 * @param placementHistory - Current placement history
 * @param tileId - ID of the tile to remove
 * @returns New rack/board states, the removed tile, and placement history updates
 */
export function removeForDiscard(
    rack: RackState,
    board: BoardState,
    placementHistory: PlacementHistoryEntry[],
    tileId: string
): RemoveForDiscardResult | null {
    // Try to find tile in rack first
    const rackIndex = TileOperations.findTileInRack(rack, tileId);
    if (rackIndex !== null) {
        const tile = rack[rackIndex];
        if (!tile) {
            return null;
        }

        // Remove from rack
        const newRack = [...rack];
        newRack[rackIndex] = null;

        return {
            rack: newRack,
            board,
            removedTile: tile,
            placementHistoryUpdates: [],
        };
    }

    // Try to find tile on board
    const boardPos = TileOperations.findTilePosition(board, tileId);
    if (boardPos) {
        const cell = board[boardPos.row][boardPos.col];
        if (!cell.tile || !cell.canTake) {
            return null;
        }

        const tile = cell.tile;

        // Remove from board (without placing in rack - this is for discard)
        const newBoard = board.map(row => [...row]);
        newBoard[boardPos.row][boardPos.col] = {
            ...newBoard[boardPos.row][boardPos.col],
            tile: null,
        };

        // Clean up placement history - remove entries for this tile at this position
        const updatedHistory = placementHistory.filter(
            e => !(e.tileId === tileId && e.position.row === boardPos.row && e.position.col === boardPos.col)
        );

        return {
            rack,
            board: newBoard,
            removedTile: tile,
            placementHistoryUpdates: updatedHistory,
        };
    }

    // Tile not found
    return null;
}

/**
 * Performs a complete discard operation: removes tile from source and draws a replacement.
 * Handles placement history cleanup automatically.
 * 
 * @param rack - Current rack state
 * @param board - Current board state
 * @param placementHistory - Current placement history
 * @param supplyState - Current bag/rack/discard state
 * @param tileId - ID of the tile to discard
 * @returns Complete new state after discard and draw, or null if operation fails
 */
export function discardAndDraw(
    rack: RackState,
    board: BoardState,
    placementHistory: PlacementHistoryEntry[],
    supplyState: TileSupply.TileSupplyState,
    tileId: string
): DiscardResult | null {
    // Remove tile from source
    const removeResult = removeForDiscard(rack, board, placementHistory, tileId);
    if (!removeResult) {
        return null;
    }

    // Determine source rack index for TileSupply.discardAndDraw
    const sourceRackIndex = TileOperations.findTileInRack(rack, tileId);
    
    // Use updated rack from remove result for supply operation
    const updatedSupplyState: TileSupply.TileSupplyState = {
        ...supplyState,
        rack: removeResult.rack,
    };

    // Perform discard and draw operation
    const drawResult = TileSupply.discardAndDraw(
        removeResult.removedTile,
        sourceRackIndex,
        updatedSupplyState
    );

    if (!drawResult) {
        // If draw fails, just discard without drawing
        return {
            rack: removeResult.rack,
            board: removeResult.board,
            bag: supplyState.bag,
            discard: [...supplyState.discard, removeResult.removedTile],
            placementHistoryUpdates: removeResult.placementHistoryUpdates,
            drawnSlot: null,
        };
    }

    return {
        rack: drawResult.rack,
        board: removeResult.board,
        bag: drawResult.bag,
        discard: drawResult.discard,
        placementHistoryUpdates: removeResult.placementHistoryUpdates,
        drawnSlot: drawResult.drawnSlot,
    };
}

