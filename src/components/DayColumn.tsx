import React, { useMemo } from 'react';
import { useDroppable, useDndContext } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { RotateCcw } from 'lucide-react';
import type { Task, Weekday } from '../types';
import { DAY_LABELS, DAY_SHORT_LABELS } from '../constants';

export interface DayColumnProps {
  /** Identyfikator dnia tygodnia ('mon' | ... | 'sun') */
  day: Weekday;
  /** Lista zadań przypisanych do tego dnia */
  tasks?: Task[];
  /** Opcjonalna bezpośrednia liczba zadań (domyślnie tasks.length) */
  taskCount?: number;
  /** Czy ten dzień jest bieżącym dniem tygodnia */
  isToday?: boolean;
  /** Czy ten dzień już minął w bieżącym tygodniu */
  isPast?: boolean;
  /** Opcjonalne jawne wymuszenie stanu najechania (np. w testach) */
  isOver?: boolean;
  /** Elementy kafelków zadań renderowane wewnątrz kolumny */
  children?: React.ReactNode;
  /** Opcjonalny element akcji w nagłówku kolumny */
  headerAction?: React.ReactNode;
  /** Callback przenoszący wszystkie zaległe zadania z tego dnia do Backlogu */
  onReturnOverdue?: (day: Weekday) => void;
  /** Opcjonalna flaga jawnie wskazująca obecność zadań zaległych */
  hasOverdue?: boolean;
  /** Dodatkowe klasy CSS */
  className?: string;
}

/**
 * Kolumna pojedynczego dnia tygodnia w panelu stałego tygodnia.
 * Integruje się z @dnd-kit jako kontener zrzutu (Droppable) o identyfikatorze odpowiadającym
 * dniowi tygodnia ('mon'..'sun') oraz SortableContext o pionowej strategii sortowania (verticalListSortingStrategy).
 */
export const DayColumn = React.memo(function DayColumn({
  day,
  tasks,
  taskCount,
  isToday = false,
  isPast = false,
  isOver: isOverProp,
  children,
  headerAction,
  onReturnOverdue,
  hasOverdue,
  className = '',
}: DayColumnProps) {
  const count = taskCount ?? tasks?.length ?? 0;
  const fullLabel = DAY_LABELS[day];
  const shortLabel = DAY_SHORT_LABELS[day];

  const { setNodeRef, isOver: isDroppableOver } = useDroppable({
    id: day,
    data: {
      type: 'DayColumn',
      day,
    },
  });

  const dndContext = useDndContext();
  const currentOverId = dndContext.over?.id ? String(dndContext.over.id) : null;

  // Kolumna jest podświetlana, gdy wskaźnik znajduje się nad jej kontenerem droppable
  // LUB nad dowolnym kafelkiem zadania znajdującym się w tej kolumnie
  const isTargetOver =
    isOverProp !== undefined
      ? isOverProp
      : isDroppableOver ||
        (currentOverId !== null &&
          (currentOverId === day || (tasks ? tasks.some((t) => t.id === currentOverId) : false)));

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

  // Stylizacja zależna od stanu dnia (dzisiejszy vs przeszły vs standardowy) z uwzględnieniem aktywnego podświetlenia
  const containerStateClasses = isTargetOver
    ? 'border-blue-400 bg-blue-50/90 ring-2 ring-blue-500 shadow-md'
    : isToday
      ? 'border-blue-300 bg-blue-50/50 ring-2 ring-blue-400/40 shadow-sm'
      : isPast
        ? 'border-slate-200 bg-slate-50/60'
        : 'border-slate-200 bg-slate-50/80';

  const headerBgClasses = isTargetOver
    ? 'border-b border-blue-300 bg-blue-100/90'
    : isToday
      ? 'border-b border-blue-200/90 bg-blue-100/60'
      : 'border-b border-slate-200/80 bg-white/70';

  const badgeCountClasses = isToday
    ? 'bg-blue-600 text-white font-bold'
    : 'bg-slate-200/70 text-slate-600 font-semibold';

  // Zadania zaległe występują wyłącznie w przeszłych dniach (isPast)
  // gdy istnieją zadania niewykonane (status !== 'done')
  const hasOverdueTasks =
    isPast &&
    (hasOverdue !== undefined
      ? hasOverdue
      : tasks
        ? tasks.some((t) => t.status !== 'done')
        : false);

  const showOverdueButton = Boolean(hasOverdueTasks && onReturnOverdue);

  return (
    <div
      ref={setNodeRef}
      id={`column-container-${day}`}
      data-testid={`column-day-${day}`}
      data-day={day}
      data-column-over={isTargetOver ? 'true' : 'false'}
      aria-label={`${fullLabel}${isToday ? ' (Dzisiaj)' : ''}`}
      className={`flex w-[86vw] max-w-[340px] sm:w-[280px] sm:flex-none lg:flex-1 lg:w-auto lg:min-w-[180px] shrink-0 snap-center flex-col rounded-xl border shadow-sm transition-all duration-150 ${containerStateClasses} ${className}`.trim()}
    >
      {/* Nagłówek kolumny dnia */}
      <div className={`p-3 rounded-t-xl transition-colors ${headerBgClasses}`}>
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="truncate text-xs font-bold uppercase tracking-wider text-slate-800" title={`${fullLabel} (${count})`}>
              <span className="hidden xl:inline">{fullLabel}</span>
              <span className="xl:hidden">{shortLabel}</span>
            </span>

            {isToday ? (
              <span
                data-testid={`badge-today-${day}`}
                className="shrink-0 rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-xs"
              >
                DZISIAJ
              </span>
            ) : null}
          </div>

          <span
            data-testid={`day-count-${day}`}
            className={`inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] ${badgeCountClasses}`}
            aria-label={`Liczba zadań w: ${fullLabel}: ${count}`}
          >
            {count}
          </span>
        </div>

        {showOverdueButton ? (
          <button
            type="button"
            onClick={() => onReturnOverdue?.(day)}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            data-testid={`day-return-overdue-btn-${day}`}
            aria-label="Przenieś zaległe do backlogu"
            title="Przenieś zaległe zadania do Backlogu"
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800 transition-colors hover:bg-amber-100 hover:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5 shrink-0 text-amber-700" aria-hidden="true" />
            <span className="truncate">Przenieś zaległe do backlogu</span>
          </button>
        ) : null}

        {headerAction ? <div className="mt-2">{headerAction}</div> : null}
      </div>

      {/* Kontener listy zadań (obszar zrzutu dla dnd-kit z SortableContext) */}
      <div
        id={day}
        data-testid={`droppable-${day}`}
        data-is-over={isTargetOver ? 'true' : 'false'}
        className={`flex flex-1 flex-col gap-2 overflow-y-auto p-2 min-h-[160px] rounded-b-xl transition-colors ${
          isTargetOver ? 'bg-blue-100/50 ring-2 ring-blue-400 ring-inset' : ''
        }`}
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {children ? (
            children
          ) : (
            <div
              data-testid={`day-empty-state-${day}`}
              className={`flex flex-1 flex-col items-center justify-center gap-1 rounded-lg border border-dashed p-4 text-center text-xs transition-colors ${
                isTargetOver
                  ? 'border-blue-400 bg-blue-50/60 text-blue-600 font-medium'
                  : 'border-slate-200/80 text-slate-400'
              }`}
            >
              <span className="font-medium text-slate-500">
                {isTargetOver ? 'Upuść tutaj' : 'Brak zadań'}
              </span>
              <span className="text-[11px] text-slate-400">
                {isTargetOver ? 'Zwolnij przycisk myszy' : 'Upuść zadanie tutaj'}
              </span>
            </div>
          )}
        </SortableContext>
      </div>
    </div>
  );
});

DayColumn.displayName = 'DayColumn';

export default DayColumn;
