import { useState } from 'react';
import { BoardState, Position, PlacementHistoryEntry } from '../types/board';
import { RackState } from '../types/rack';
import { TileData } from '../types/tile';
import { removeTileFromBoard } from '../utils/boardUtils';
import { findTileInRack } from '../utils/rackUtils';
import { findTilePosition, parseEmptySlotId } from '../utils/boardUtils';

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
    computeDrawWithRefill: (
        rack: RackState,
        bag: TileData[],
        discard: TileData[],
        preferredIndex?: number
    ) => { newRack: RackState; newBag: TileData[]; didRefill: boolean };
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
        computeDrawWithRefill,
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

            const sourceRackIndex = findTileInRack(rack, activeId);
            const sourceBoardPos = findTilePosition(board, activeId);

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
                setBoard(prevBoard => removeTileFromBoard(prevBoard, sourceBoardPos));
                setPlacementHistory(prev => prev.filter(e => !(e.tileId === tileToDiscard!.id && e.position.row === sourceBoardPos.row && e.position.col === sourceBoardPos.col)));
            }

            setIsDiscarding(true);
            setDiscardAnim({ tile: tileToDiscard });

            window.setTimeout(() => {
                const discardForRefill = [...discard, tileToDiscard!];
                const bagForRefill = bag;

                // Add to discard pile
                setDiscard(prev => [...prev, tileToDiscard!]);

                // Perform atomic draw using composed snapshots
                setRack(prevRack => {
                    const { newRack, newBag, didRefill } = computeDrawWithRefill(
                        prevRack,
                        bagForRefill,
                        discardForRefill,
                        sourceRackIndex !== null ? sourceRackIndex : undefined
                    );
                    if (didRefill) {
                        // Clear discard if we refilled from it
                        typeof setDiscard === 'function' && (setDiscard as any)([]);
                    }
                    setBag(newBag);
                    return newRack;
                });

                setDiscardAnim(null);
                setIsDiscarding(false);
            }, 180);

            return;
        }

        // Blank tile interception when moving from rack to board
        const activeRackIndex = findTileInRack(rack, activeId);
        const overBoardPos = findTilePosition(board, overId);
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


