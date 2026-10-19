import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TaskCard, type TaskCardProps } from './TaskCard';
import { BACKLOG_DROPPABLE_ID } from '../constants';

export interface SortableTaskCardProps extends TaskCardProps {
  /** Opcjonalna flaga blokująca możliwość przeciągania danego kafelka */
  disabled?: boolean;
}

/**
 * Komponent kafelka zadania zintegrowany z mechanizmem Sortable biblioteki @dnd-kit.
 * Opakowuje prezentacyjny TaskCard w hook useSortable, zapewniając obsługę
 * transformacji przemieszczenia, nasłuchiwaczy zdarzeń przeciągania oraz atrybutów dostępności.
 */
export function SortableTaskCard({
  task,
  disabled = false,
  style: userStyle,
  className = '',
  ...props
}: SortableTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    disabled,
    data: {
      type: 'Task',
      task,
      columnId: task.day ?? BACKLOG_DROPPABLE_ID,
    },
  });

  const sortableStyle: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    ...userStyle,
  };

  return (
    <TaskCard
      ref={setNodeRef}
      task={task}
      style={sortableStyle}
      isDragging={isDragging || props.isDragging}
      className={className}
      data-sortable="true"
      {...attributes}
      {...listeners}
      {...props}
    />
  );
}

export default SortableTaskCard;
