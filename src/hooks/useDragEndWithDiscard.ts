import { useState } from 'react';
import { BoardState, Position, PlacementHistoryEntry } from '../types/board';
import { RackState } from '../types/rack';
import { TileData } from '../types/tile';
import { parseEmptySlotId } from '../utils/boardUtils';
import { findTileInRack } from '../utils/rackUtils';
import * as TileOperations from '../engine/TileOperations';
import * as DiscardOperations from '../engine/DiscardOperations';
import * as TileSupply from '../engine/TileSupply';

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
    placementHistory: PlacementHistoryEntry[];
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
        placementHistory,
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

            // Use DiscardOperations to remove tile from source immediately
            const removeResult = DiscardOperations.removeForDiscard(
                rack,
                board,
                placementHistory,
                activeId
            );

            if (!removeResult) {
                return;
            }

            // Update state immediately for visual feedback
            setRack(() => removeResult.rack);
            setBoard(() => removeResult.board);

            // Update placement history if it was modified (when discarding from board)
            if (removeResult.placementHistoryUpdates.length !== placementHistory.length) {
                setPlacementHistory(() => removeResult.placementHistoryUpdates);
            }

            setIsDiscarding(true);
            setDiscardAnim({ tile: removeResult.removedTile });

            // Determine source rack index before removal for TileSupply
            const sourceRackIndex = findTileInRack(rack, activeId);

            window.setTimeout(() => {
                // Perform discard+draw operation using TileSupply with already-removed state
                const result = TileSupply.discardAndDraw(
                    removeResult.removedTile,
                    sourceRackIndex,
                    {
                        rack: removeResult.rack,
                        bag,
                        discard,
                    }
                );

                if (!result) {
                    // Just add to discard if operation fails
                    setDiscard(prev => [...prev, removeResult.removedTile]);
                    setDiscardAnim(null);
                    setIsDiscarding(false);
                    return;
                }

                // Update all states with the result
                setRack(() => result.rack);
                setBag(result.bag);
                if (typeof setDiscard === 'function') {
                    // Always use updater form since it's compatible with both types
                    setDiscard(() => result.discard);
                }

                setDiscardAnim(null);
                setIsDiscarding(false);
            }, 180);

            return;
        }

        // Blank tile interception when moving from rack to board
        const activeRackIndex = findTileInRack(rack, activeId);
        const overBoardPos = TileOperations.findTilePosition(board, overId);
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


