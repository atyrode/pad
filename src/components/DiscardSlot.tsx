"use client";

import React, { forwardRef } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Trash2 } from 'lucide-react';

interface DiscardSlotProps {
  tileSize: number;
  hidden?: boolean;
}

// A simple droppable discard slot. Forward ref so parent can measure position for animations.
const DiscardSlot = forwardRef<HTMLDivElement, DiscardSlotProps>(function DiscardSlot(
  { tileSize, hidden },
  ref
) {
  const { isOver, setNodeRef } = useDroppable({ id: 'discard-slot' });

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
        `flex items-center justify-center rounded-lg border transition-colors duration-150 ` +
        `${isOver ? 'bg-zinc-600 border-zinc-400' : 'bg-zinc-700 border-zinc-600'}`
      }
      style={{ width: tileSize - 2, height: tileSize - 2 }}
      title="Discard tile"
    >
      <Trash2 className={`w-5 h-5 ${isOver ? 'text-white' : 'text-zinc-300'}`} />
    </div>
  );
});

export default DiscardSlot;


