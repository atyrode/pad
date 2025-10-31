import { BoardState, Position, PlacementHistoryEntry } from '../types/board';
import { RackState } from '../types/rack';
import { TileData } from '../types/tile';
import { BOARD_SIZE } from '../constants/board';

/**
 * Result of placing a tile on the board from a rack
 */
export interface PlaceTileOnBoardResult {
    board: BoardState;
    rack: RackState;
    placementHistoryEntry: PlacementHistoryEntry | null;
    swappedTile: TileData | null;
}

/**
 * Result of removing a tile from the board to a rack
 */
export interface RemoveTileFromBoardResult {
    board: BoardState;
    rack: RackState;
    removedTile: TileData | null;
    wasBlank: boolean;
    revertedTile: TileData | null;
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

// ============================================================================
// RACK OPERATIONS
// ============================================================================

/**
 * Move a tile to a specific rack index
 */
export function moveTileToRack(rack: RackState, tile: TileData, index: number): RackState {
    const newRack = [...rack];
    if (index >= 0 && index < rack.length) {
        newRack[index] = tile;
    }
    return newRack;
}

/**
 * Remove a tile from a rack index
 */
export function removeTileFromRack(rack: RackState, index: number): RackState {
    const newRack = [...rack];
    if (index >= 0 && index < rack.length) {
        newRack[index] = null;
    }
    return newRack;
}

/**
 * Swap two tiles in the rack
 */
export function swapRackTiles(rack: RackState, index1: number, index2: number): RackState {
    const newRack = [...rack];
    if (index1 >= 0 && index1 < rack.length && index2 >= 0 && index2 < rack.length) {
        const tile1 = newRack[index1];
        const tile2 = newRack[index2];
        newRack[index1] = tile2;
        newRack[index2] = tile1;
    }
    return newRack;
}

/**
 * Find first empty slot in rack
 */
export function findFirstEmptySlot(rack: RackState): number | null {
    for (let i = 0; i < rack.length; i++) {
        if (rack[i] === null) {
            return i;
        }
    }
    return null;
}

// ============================================================================
// BOARD OPERATIONS
// ============================================================================

/**
 * Place a tile on the board at a specific position
 */
function placeTileOnBoard(board: BoardState, tile: TileData, pos: Position): BoardState {
    const newBoard = board.map(row => [...row]);
    const existing = newBoard[pos.row][pos.col];
    newBoard[pos.row][pos.col] = { ...existing, tile };
    return newBoard;
}

/**
 * Remove a tile from the board at a specific position
 */
function removeTileFromBoard(board: BoardState, pos: Position): BoardState {
    const newBoard = board.map(row => [...row]);
    const existing = newBoard[pos.row][pos.col];
    newBoard[pos.row][pos.col] = { ...existing, tile: null };
    return newBoard;
}

/**
 * Swap tiles at two board positions
 */
function swapBoardTiles(board: BoardState, pos1: Position, pos2: Position): BoardState {
    const newBoard = board.map(row => [...row]);

    const tile1 = newBoard[pos1.row][pos1.col].tile;
    const tile2 = newBoard[pos2.row][pos2.col].tile;

    newBoard[pos1.row][pos1.col] = {
        ...newBoard[pos1.row][pos1.col],
        tile: tile2,
    };

    newBoard[pos2.row][pos2.col] = {
        ...newBoard[pos2.row][pos2.col],
        tile: tile1,
    };

    return newBoard;
}

// ============================================================================
// SEARCH OPERATIONS
// ============================================================================

/**
 * Find a tile in the rack by ID
 */
export function findTileInRack(rack: RackState, tileId: string): number | null {
    for (let i = 0; i < rack.length; i++) {
        if (rack[i]?.id === tileId) {
            return i;
        }
    }
    return null;
}

/**
 * Find a tile position on the board by ID
 */
export function findTilePosition(board: BoardState, tileId: string): Position | null {
    for (let row = 0; row < board.length; row++) {
        for (let col = 0; col < board[row].length; col++) {
            if (board[row][col]?.tile?.id === tileId) {
                return { row, col };
            }
        }
    }
    return null;
}

// ============================================================================
// COMPOSITE OPERATIONS (Rack ↔ Board)
// ============================================================================

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
export function placeTileOnBoardFromRack(
    rack: RackState,
    rackIndex: number,
    board: BoardState,
    targetPosition: Position,
    trackHistory: boolean = true
): PlaceTileOnBoardResult | null {
    const tile = rack[rackIndex];
    if (!tile) {
        return null;
    }

    const targetCell = board[targetPosition.row][targetPosition.col];
    if (!targetCell.canPlace) {
        return null;
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
export function removeTileFromBoardToRack(
    board: BoardState,
    boardPosition: Position,
    rack: RackState,
    targetRackIndex: number | null = null
): RemoveTileFromBoardResult | null {
    const sourceCell = board[boardPosition.row][boardPosition.col];
    if (!sourceCell.tile || !sourceCell.canTake) {
        return null;
    }

    const removedTile = sourceCell.tile;
    const wasBlank = removedTile.originalValue === '*';

    // Determine target rack index
    let rackIndex = targetRackIndex;
    if (rackIndex === null) {
        rackIndex = findFirstEmptySlot(rack);
        if (rackIndex === null) {
            return null;
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
export function moveTileBetweenBoardPositions(
    board: BoardState,
    sourcePosition: Position,
    targetPosition: Position
): MoveTileBetweenBoardPositionsResult | null {
    const sourceCell = board[sourcePosition.row][sourcePosition.col];
    if (!sourceCell.tile || !sourceCell.canTake) {
        return null;
    }

    const targetCell = board[targetPosition.row][targetPosition.col];
    const targetAllowsPlacement = !targetCell.tile
        ? targetCell.canPlace
        : targetCell.canPlace && targetCell.canTake;

    if (!targetAllowsPlacement) {
        return null;
    }

    // Swap tiles if target has a tile, otherwise just move
    const newBoard = swapBoardTiles(board, sourcePosition, targetPosition);

    return {
        board: newBoard,
    };
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
export function swapRackAndBoardTile(
    rack: RackState,
    rackIndex: number,
    board: BoardState,
    boardPosition: Position,
    trackHistory: boolean = true
): (SwapTilesResult & { placementHistoryEntry: PlacementHistoryEntry | null }) | null {
    const rackTile = rack[rackIndex];
    const boardCell = board[boardPosition.row][boardPosition.col];

    if (!rackTile) {
        return null;
    }

    if (!boardCell.canPlace || (boardCell.tile && !boardCell.canTake)) {
        return null;
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

