"use client";

import React, { forwardRef } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { RefreshCw, Trash2 } from 'lucide-react';

interface DiscardSlotProps {
  tileSize: number;
  hidden?: boolean;
  redraw?: boolean;
  disabled?: boolean;
  selecting?: boolean;
  onActivate?: () => void;
}

// A simple droppable discard slot. Forward ref so parent can measure position for animations.
const DiscardSlot = forwardRef<HTMLDivElement, DiscardSlotProps>(function DiscardSlot(
  { tileSize, hidden, redraw = false, disabled = false, selecting = false, onActivate },
  ref
) {
  const { isOver, setNodeRef } = useDroppable({ id: 'discard-slot', disabled });

  const combineRef = (node: HTMLDivElement | null) => {
    setNodeRef(node);
    if (typeof ref === 'function') ref(node);
    else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
  };

  if (hidden) return null;

  return (
    <div
      ref={combineRef}
      className={
        `relative flex items-center justify-center rounded-lg border transition-colors duration-150 ${disabled ? 'opacity-50' : ''} ` +
        `${isOver || selecting ? 'bg-zinc-600 border-zinc-400' : 'bg-zinc-700 border-zinc-600'}`
      }
      style={{ width: tileSize - 2, height: tileSize - 2 }}
      title={redraw ? selecting ? 'Redraw selected tiles; Escape cancels' : 'Redraw tiles' : 'Discard tile'}
    >
      {redraw ? <RefreshCw className="w-5 h-5 text-zinc-300" /> : <Trash2 className={`w-5 h-5 ${isOver ? 'text-white' : 'text-zinc-300'}`} />}
      {onActivate && <button type="button" disabled={disabled} onClick={onActivate}
        aria-label={selecting ? 'Confirm redraw; cancel if empty' : 'Select tiles for redraw'}
        aria-pressed={selecting}
        className="absolute inset-0 rounded-lg cursor-pointer disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white" />}
    </div>
  );
});

export default DiscardSlot;


