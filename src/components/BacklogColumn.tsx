import React, { useMemo } from 'react';
import { useDroppable, useDndContext } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Task } from '../types';
import { BACKLOG_DROPPABLE_ID } from '../constants';
import { AddTaskForm } from './AddTaskForm';

export interface BacklogColumnProps {
  /** Lista zadań znajdujących się w Backlogu */
  tasks?: Task[];
  /** Opcjonalna bezpośrednia liczba zadań (domyślnie tasks.length) */
  taskCount?: number;
  /** Opcjonalne jawne wymuszenie stanu najechania (np. w testach) */
  isOver?: boolean;
  /** Zawartość kafelków zadań (lub formularza) renderowana w kolumnie */
  children?: React.ReactNode;
  /** Opcjonalny element akcji w nagłówku (np. formularz szybkiego dodawania zadania AddTaskForm) */
  headerAction?: React.ReactNode;
  /** Opcjonalny callback szybkiego dodawania zadania (automatycznie renderuje AddTaskForm, jeśli brak headerAction) */
  onAddTask?: (title: string) => void;
  /** Dodatkowe klasy CSS */
  className?: string;
}

/**
 * Lewy stały panel aplikacji prezentujący Backlog (skrzynkę zadań nieprzypisanych).
 * Integruje się z @dnd-kit jako kontener zrzutu (Droppable) o identyfikatorze 'backlog'
 * oraz SortableContext o pionowej strategii sortowania (verticalListSortingStrategy).
 */
export const BacklogColumn = React.memo(function BacklogColumn({
  tasks,
  taskCount,
  isOver: isOverProp,
  children,
  headerAction,
  onAddTask,
  className = '',
}: BacklogColumnProps) {
  const count = taskCount ?? tasks?.length ?? 0;
  const actionContent = headerAction !== undefined ? headerAction : onAddTask ? <AddTaskForm onAddTask={onAddTask} /> : null;

  const { setNodeRef, isOver: isDroppableOver } = useDroppable({
    id: BACKLOG_DROPPABLE_ID,
    data: {
      type: 'Column',
      day: null,
    },
  });

  const dndContext = useDndContext();
  const currentOverId = dndContext.over?.id ? String(dndContext.over.id) : null;

  // Panel Backlogu jest podświetlany, gdy wskaźnik znajduje się nad jego kontenerem droppable
  // LUB nad dowolnym kafelkiem zadania znajdującym się w Backlogu
  const isTargetOver =
    isOverProp !== undefined
      ? isOverProp
      : isDroppableOver ||
        (currentOverId !== null &&
          (currentOverId === BACKLOG_DROPPABLE_ID ||
            (tasks ? tasks.some((t) => t.id === currentOverId) : false)));

  const taskIds = useMemo(() => {
    if (tasks && tasks.length > 0) {
      return tasks.map((t) => t.id);
    }
    const ids: string[] = [];
    React.Children.forEach(children, (child) => {
      if (React.isValidElement(child)) {
        const childTask = (child.props as { task?: Task })?.task;
        if (childTask?.id) {
          ids.push(childTask.id);
        } else if (child.key) {
          ids.push(String(child.key).replace(/^\.\$/g, ''));
        }
      }
    });
    return ids;
  }, [tasks, children]);

  const asideClasses = isTargetOver
    ? 'border-blue-400 bg-blue-50/90 ring-2 ring-blue-500 shadow-md'
    : 'border-slate-200 bg-slate-50/80 shadow-sm';

  const headerBgClasses = isTargetOver
    ? 'border-b border-blue-300 bg-blue-100/70'
    : 'border-b border-slate-200/80';

  return (
    <aside
      ref={setNodeRef}
      data-testid="column-backlog"
      data-column-over={isTargetOver ? 'true' : 'false'}
      aria-label="Backlog"
      className={`flex w-72 lg:w-80 shrink-0 flex-col rounded-xl border transition-all duration-150 ${asideClasses} ${className}`.trim()}
    >
      {/* Nagłówek panelu Backlog */}
      <div className={`p-4 transition-colors ${headerBgClasses}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              Backlog
            </h2>
            <span className="text-xs text-slate-500">(Inbox)</span>
          </div>

          <span
            data-testid="backlog-count"
            className="inline-flex min-w-[1.5rem] items-center justify-center rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700"
            aria-label={`Liczba zadań w Backlogu: ${count}`}
          >
            {count}
          </span>
        </div>

        {/* Opcjonalny slot na formularz dodawania zadań (AddTaskForm) */}
        {actionContent ? <div className="mt-3">{actionContent}</div> : null}
      </div>

      {/* Kontener listy zadań (obszar zrzutu dla dnd-kit z SortableContext) */}
      <div
        id={BACKLOG_DROPPABLE_ID}
        data-testid="droppable-backlog"
        data-is-over={isTargetOver ? 'true' : 'false'}
        className={`flex flex-1 flex-col gap-2 overflow-y-auto p-3 min-h-[160px] rounded-b-xl transition-colors ${
          isTargetOver ? 'bg-blue-100/40 ring-2 ring-blue-400 ring-inset' : ''
        }`}
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {children ? (
            children
          ) : (
            <div
              data-testid="backlog-empty-state"
              className={`flex flex-1 flex-col items-center justify-center gap-1 rounded-lg border border-dashed p-6 text-center text-xs transition-colors ${
                isTargetOver
                  ? 'border-blue-400 bg-blue-50/60 text-blue-600 font-medium'
                  : 'border-slate-200 text-slate-400'
              }`}
            >
              <span className="font-medium text-slate-500">
                {isTargetOver ? 'Upuść tutaj' : 'Brak zadań w Backlogu'}
              </span>
              <span className="text-[11px] text-slate-400">
                {isTargetOver ? 'Zwolnij przycisk myszy' : 'Wpisz zadanie powyżej'}
              </span>
            </div>
          )}
        </SortableContext>
      </div>
    </aside>
  );
});

BacklogColumn.displayName = 'BacklogColumn';

export default BacklogColumn;
