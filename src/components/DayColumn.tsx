import React from 'react';
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
  /** Elementy kafelków zadań renderowane wewnątrz kolumny */
  children?: React.ReactNode;
  /** Opcjonalny element akcji w nagłówku kolumny */
  headerAction?: React.ReactNode;
  /** Dodatkowe klasy CSS */
  className?: string;
}

/**
 * Kolumna pojedynczego dnia tygodnia w panelu stałego tygodnia.
 */
export function DayColumn({
  day,
  tasks,
  taskCount,
  isToday = false,
  isPast = false,
  children,
  headerAction,
  className = '',
}: DayColumnProps) {
  const count = taskCount ?? tasks?.length ?? 0;
  const fullLabel = DAY_LABELS[day];
  const shortLabel = DAY_SHORT_LABELS[day];

  // Stylizacja zależna od stanu dnia (dzisiejszy vs przeszły vs standardowy)
  const containerStateClasses = isToday
    ? 'border-blue-300 bg-blue-50/40 ring-1 ring-blue-300 shadow-blue-50'
    : isPast
      ? 'border-slate-200 bg-slate-50/60'
      : 'border-slate-200 bg-slate-50/80';

  const headerBgClasses = isToday
    ? 'border-b border-blue-200/80 bg-blue-100/50'
    : 'border-b border-slate-200/80 bg-white/70';

  return (
    <div
      data-testid={`column-day-${day}`}
      data-day={day}
      aria-label={`${fullLabel}${isToday ? ' (Dzisiaj)' : ''}`}
      className={`flex min-w-[180px] flex-1 flex-col rounded-xl border shadow-sm transition-colors ${containerStateClasses} ${className}`.trim()}
    >
      {/* Nagłówek kolumny dnia */}
      <div className={`p-3 rounded-t-xl ${headerBgClasses}`}>
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="truncate text-xs font-bold uppercase tracking-wider text-slate-800" title={fullLabel}>
              <span className="hidden xl:inline">{fullLabel}</span>
              <span className="xl:hidden">{shortLabel}</span>
            </span>

            {isToday ? (
              <span
                data-testid={`badge-today-${day}`}
                className="shrink-0 rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
              >
                DZISIAJ
              </span>
            ) : null}
          </div>

          <span
            data-testid={`day-count-${day}`}
            className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-slate-200/70 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600"
            aria-label={`Liczba zadań w: ${fullLabel}: ${count}`}
          >
            {count}
          </span>
        </div>

        {headerAction ? <div className="mt-2">{headerAction}</div> : null}
      </div>

      {/* Kontener listy zadań (obszar zrzutu dla dnd-kit) */}
      <div
        id={day}
        data-testid={`droppable-${day}`}
        className="flex flex-1 flex-col gap-2 overflow-y-auto p-2 min-h-[160px]"
      >
        {children ? (
          children
        ) : (
          <div
            data-testid={`day-empty-state-${day}`}
            className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-slate-200/80 p-4 text-center text-xs text-slate-400"
          >
            Brak zadań
          </div>
        )}
      </div>
    </div>
  );
}

export default DayColumn;
