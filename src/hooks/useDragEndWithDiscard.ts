import { useState } from 'react';
import { BoardState, Position, PlacementHistoryEntry } from '../types/board';
import { RackState } from '../types/rack';
import { TileData } from '../types/tile';
import { parseEmptySlotId } from '../utils/boardUtils';
import { TileMovementService } from '../services/TileMovementService';
import { TileSupplyService } from '../services/TileSupplyService';

type SetState<T> = (updater: (prev: T) => T) => void;

export interface UseDragEndWithDiscardParams {
    board: BoardState;
    setBoard: SetState<BoardState>;
    rack: RackState;
    setRack: SetState<RackState>;
    bag: TileData[];
    setBag: (bag: TileData[]) => void;
    discard: TileData[];
    setDiscard: (updater: (prev: TileData[]) => TileData[]) => void | ((tiles: TileData[]) => void);
    setPlacementHistory: (updater: PlacementHistoryEntry[] | ((prev: PlacementHistoryEntry[]) => PlacementHistoryEntry[])) => void;
    openBlankTilePopup: (args: { blankTile: TileData; targetPosition: Position; sourceRackIndex: number }) => void;
    originalHandleDragEnd: (event: any) => void;
}

export function useDragEndWithDiscard(params: UseDragEndWithDiscardParams) {
    const {
        board,
        setBoard,
        rack,
        setRack,
        bag,
        setBag,
        discard,
        setDiscard,
        setPlacementHistory,
        openBlankTilePopup,
        originalHandleDragEnd,
    } = params;

    const [discardAnim, setDiscardAnim] = useState<{ tile: TileData } | null>(null);
    const [isDiscarding, setIsDiscarding] = useState(false);

    const handleDragEnd = (event: any) => {
        const { active, over } = event;

        if (!over) {
            originalHandleDragEnd(event);
            return;
        }

        const activeId = active.id as string;
        const overId = over.id as string;

        // Discard drop zone handling
        if (overId === 'discard-slot') {
            if (isDiscarding) {
                return;
            }

            const sourceRackIndex = TileMovementService.findTileInRack(rack, activeId);
            const sourceBoardPos = TileMovementService.findTilePosition(board, activeId);

            let tileToDiscard: TileData | null = null;
            if (sourceRackIndex !== null) {
                tileToDiscard = rack[sourceRackIndex];
            } else if (sourceBoardPos) {
                const cell = board[sourceBoardPos.row][sourceBoardPos.col];
                if (cell.canTake) {
                    tileToDiscard = cell.tile;
                }
            }

            if (!tileToDiscard) {
                return;
            }

            // Remove from source immediately
            if (sourceRackIndex !== null) {
                setRack(prevRack => {
                    const next = [...prevRack];
                    next[sourceRackIndex] = null;
                    return next;
                });
            } else if (sourceBoardPos) {
                // For discard, just remove from board (don't place in rack)
                setBoard(prevBoard => {
                    const newBoard = prevBoard.map(row => [...row]);
                    newBoard[sourceBoardPos.row][sourceBoardPos.col] = { 
                        ...newBoard[sourceBoardPos.row][sourceBoardPos.col], 
                        tile: null 
                    };
                    return newBoard;
                });
                setPlacementHistory(prev => prev.filter(e => !(e.tileId === tileToDiscard!.id && e.position.row === sourceBoardPos.row && e.position.col === sourceBoardPos.col)));
            }

            setIsDiscarding(true);
            setDiscardAnim({ tile: tileToDiscard });

            window.setTimeout(() => {
                // Get current state after tile removal for discard+draw operation
                setRack(prevRack => {
                    const result = TileSupplyService.discardAndDraw(
                        tileToDiscard!,
                        sourceRackIndex,
                        {
                            rack: prevRack,
                            bag,
                            discard,
                        }
                    );

                    if (!result) {
                        // Just add to discard if operation fails
                        setDiscard(prev => [...prev, tileToDiscard!]);
                        setDiscardAnim(null);
                        setIsDiscarding(false);
                        return prevRack;
                    }

                    // Update all states with the result
                    setBag(result.bag);
                    if (typeof setDiscard === 'function') {
                        // Always use updater form since it's compatible with both types
                        setDiscard(() => result.discard);
                    }

                    setDiscardAnim(null);
                    setIsDiscarding(false);
                    return result.rack;
                });
            }, 180);

            return;
        }

        // Blank tile interception when moving from rack to board
        const activeRackIndex = TileMovementService.findTileInRack(rack, activeId);
        const overBoardPos = TileMovementService.findTilePosition(board, overId);
        const overEmptyPos = parseEmptySlotId(overId);

        if (activeRackIndex !== null && (overBoardPos || overEmptyPos)) {
            const tile = rack[activeRackIndex];
            if (tile && tile.value === "*") {
                const targetPos = overBoardPos || overEmptyPos;
                if (targetPos) {
                    openBlankTilePopup({ blankTile: tile, targetPosition: targetPos, sourceRackIndex: activeRackIndex });
                }
                return;
            }
        }

        // Fallback to original handler
        originalHandleDragEnd(event);
    };

    return { handleDragEnd, discardAnim, isDiscarding } as const;
}


