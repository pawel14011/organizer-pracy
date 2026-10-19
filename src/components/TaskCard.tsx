import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Flag, Pencil, Trash2, RotateCcw, AlertCircle, CalendarDays } from 'lucide-react';
import type { Task, Priority, DayOfWeek, Weekday } from '../types';
import { WEEKDAYS, DAY_LABELS } from '../constants';

export interface TaskCardProps {
  /** Obiekt zadania do wyrenderowania */
  task: Task;
  /** Callback przełączający status realizacji zadania między 'todo' a 'done' */
  onToggleStatus?: (id: string) => void;
  /** Callback cyklicznie zmieniający priorytet zadania */
  onCyclePriority?: (id: string) => void;
  /** Callback usuwający zadanie */
  onDelete?: (id: string) => void;
  /** Callback aktualizujący treść (tytuł) zadania po zakończeniu edycji */
  onUpdateTitle?: (id: string, newTitle: string) => void;
  /** Callback przywracający zadanie z kolumny dnia z powrotem do Backlogu */
  onReturnToBacklog?: (id: string) => void;
  /** Callback szybkiego przeniesienia zadania do wybranego dnia lub Backlogu (optymalizacja mobilna) */
  onMoveToDay?: (id: string, targetDay: DayOfWeek) => void;
  /** Flaga wskazująca, czy zadanie jest zaległe (przeterminowane z przeszłego dnia) */
  isOverdue?: boolean;
  /** Flaga wskazująca, czy kafelek jest w trakcie przeciągania (dla DragOverlay / dnd-kit) */
  isDragging?: boolean;
  /** Opcjonalne dodatkowe klasy CSS */
  className?: string;
  /** Opcjonalny styl inline (np. dla transformacji dnd-kit) */
  style?: React.CSSProperties;
}

/**
 * Etykiety tekstowe priorytetów zadań (dla ułatwień dostępu a11y i tooltipów).
 */
export const PRIORITY_LABELS: Record<Priority, string> = {
  low: 'niski',
  medium: 'średni',
  high: 'wysoki',
};

/**
 * Konfiguracja stylów wizualnych dla poszczególnych priorytetów zadań.
 * Zawiera akcenty obramowania (border-l-4) oraz kolory flagi priorytetu.
 */
export const PRIORITY_STYLES: Record<
  Priority,
  {
    border: string;
    flag: string;
    hoverFlag: string;
  }
> = {
  low: {
    border: 'border-l-emerald-500',
    flag: 'text-emerald-600',
    hoverFlag: 'hover:text-emerald-700',
  },
  medium: {
    border: 'border-l-amber-500',
    flag: 'text-amber-600',
    hoverFlag: 'hover:text-amber-700',
  },
  high: {
    border: 'border-l-rose-500',
    flag: 'text-rose-600',
    hoverFlag: 'hover:text-rose-700',
  },
};

/**
 * Komponent kafelka zadania (TaskCard).
 *
 * Funkcjonalności:
 * - Styl zależny od priorytetu (akcenty kolorystyczne dla low, medium, high).
 * - Checkbox oznaczający stan 'done' (przekreślenie tytułu, stonowane tło).
 * - Przełącznik priorytetu z ikoną flagi (zmiana 1-klikiem: low -> medium -> high -> low).
 * - Przycisk usuwania z ikoną kosza.
 * - Szybka edycja tytułu inline (po dwukrotnym kliknięciu lub ikonie ołówka; Enter/onBlur zatwierdza, Escape anuluje).
 * - Obsługa zaległości i przycisk przywracania do Backlogu.
 * - Izolacja zdarzeń interaktywnych (stopPropagation) pod kątem integracji z dnd-kit.
 * - Pełne wsparcie dostępności (atrybuty aria-label na przyciskach ikonowych).
 */
export const TaskCard = React.memo(
  React.forwardRef<HTMLDivElement, TaskCardProps>(function TaskCard(
    {
      task,
      onToggleStatus,
      onCyclePriority,
      onDelete,
      onUpdateTitle,
      onReturnToBacklog,
      onMoveToDay,
      isOverdue = false,
      isDragging = false,
      className = '',
      style,
      ...rest
    },
    ref
  ) {
    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState(task.title);
    const inputRef = useRef<HTMLInputElement>(null);
    const isCanceledRef = useRef(false);

    const handleMoveSelect = useCallback(
      (e: React.ChangeEvent<HTMLSelectElement>) => {
        e.stopPropagation();
        const val = e.target.value;
        if (!val) return;
        const targetDay: DayOfWeek = val === 'backlog' ? null : (val as Weekday);
        onMoveToDay?.(task.id, targetDay);
        e.target.value = '';
      },
      [onMoveToDay, task.id]
    );

    // Synchronizacja lokalnego stanu edycji z właściwością task.title
    useEffect(() => {
      if (!isEditing) {
        setEditTitle(task.title);
      }
    }, [task.title, isEditing]);

    // Automatyczne ustawienie fokusu i zaznaczenie tekstu po wejściu w tryb edycji
    useEffect(() => {
      if (isEditing && inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }, [isEditing]);

    const isDone = task.status === 'done';
    const priorityConfig = PRIORITY_STYLES[task.priority];

    const startEditing = useCallback(() => {
      isCanceledRef.current = false;
      setEditTitle(task.title);
      setIsEditing(true);
    }, [task.title]);

    const handleCommitEdit = useCallback(() => {
      if (isCanceledRef.current) {
        isCanceledRef.current = false;
        return;
      }

      const trimmed = editTitle.trim();
      if (trimmed.length > 0 && trimmed !== task.title) {
        onUpdateTitle?.(task.id, trimmed);
      } else if (trimmed.length === 0) {
        // Blokada pustych ciągów: przywrócenie pierwotnego tytułu
        setEditTitle(task.title);
      }
      setIsEditing(false);
    }, [editTitle, task.id, task.title, onUpdateTitle]);

    const handleCancelEdit = useCallback(() => {
      isCanceledRef.current = true;
      setEditTitle(task.title);
      setIsEditing(false);
    }, [task.title]);

    const handleInputKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        // Izolacja zdarzeń klawiatury od kontenera dnd-kit
        e.stopPropagation();

        if (e.key === 'Enter') {
          e.preventDefault();
          handleCommitEdit();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          handleCancelEdit();
        }
      },
      [handleCommitEdit, handleCancelEdit]
    );

    const handleToggleStatus = (e: React.ChangeEvent<HTMLInputElement>) => {
      e.stopPropagation();
      onToggleStatus?.(task.id);
    };

    const handleCyclePriority = (e: React.MouseEvent) => {
      e.stopPropagation();
      onCyclePriority?.(task.id);
    };

    const handleDelete = (e: React.MouseEvent) => {
      e.stopPropagation();
      onDelete?.(task.id);
    };

    const handleReturnToBacklog = (e: React.MouseEvent) => {
      e.stopPropagation();
      onReturnToBacklog?.(task.id);
    };

    // Budowanie klas kontenera w zależności od stanu zadania
    let cardStateClasses = '';
    if (isDone) {
      cardStateClasses = `border-slate-200 ${priorityConfig.border} bg-slate-100/70 opacity-70`;
    } else if (isOverdue) {
      cardStateClasses = `border-amber-400 ${priorityConfig.border} bg-amber-50/40 shadow-sm hover:border-amber-500 hover:shadow`;
    } else {
      cardStateClasses = `border-slate-200 ${priorityConfig.border} bg-white shadow-sm hover:border-slate-300 hover:shadow`;
    }

    if (isDragging) {
      cardStateClasses += ' opacity-90 shadow-lg ring-2 ring-blue-400 rotate-1 cursor-grabbing';
    }

    // Płynna obsługa interakcji dnd-kit i ekranów dotykowych
    const cursorClass = isEditing ? '' : isDragging ? 'cursor-grabbing' : 'cursor-grab';
    const touchClass = isEditing ? '' : 'touch-manipulation';

    return (
      <div
        ref={ref}
        style={style}
        data-testid="task-card"
        data-task-id={task.id}
        data-priority={task.priority}
        data-status={task.status}
        data-overdue={isOverdue ? 'true' : 'false'}
        aria-label={`Zadanie: ${task.title}`}
        className={`group relative flex flex-col gap-2 rounded-lg border border-l-4 p-3 transition-all select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${touchClass} ${cursorClass} ${cardStateClasses} ${className}`.trim()}
        {...rest}
      >
        {/* Górny wiersz: checkbox oraz treść zadania / pole edycji inline */}
        <div className="flex items-start gap-2.5">
          <input
            type="checkbox"
            data-testid="task-checkbox"
            checked={isDone}
            onChange={handleToggleStatus}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            aria-label={`Oznacz jako ${isDone ? 'nieukończone' : 'ukończone'}: ${task.title}`}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer"
          />

          <div className="flex-1 min-w-0">
            {isEditing ? (
              <input
                ref={inputRef}
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={handleInputKeyDown}
                onBlur={handleCommitEdit}
                maxLength={500}
                aria-label="Edycja nazwy zadania"
                data-testid="task-edit-input"
                className="w-full rounded border border-blue-400 bg-white px-2 py-0.5 text-base sm:text-sm font-medium text-slate-900 shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-500"
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              />
            ) : (
              <span
                data-testid="task-title"
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  startEditing();
                }}
                title="Kliknij dwukrotnie, aby edytować"
                className={`block break-words text-sm font-medium cursor-pointer transition-colors ${
                  isDone
                    ? 'line-through text-slate-400'
                    : 'text-slate-800 hover:text-slate-900'
                }`}
              >
                {task.title}
              </span>
            )}
          </div>
        </div>

        {/* Dolny pasek akcji i wskaźników */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 text-xs">
          {/* Lewa strona stopki: plakietka zaległości */}
          <div className="flex items-center gap-1.5 min-w-0">
            {isOverdue && !isDone && (
              <span
                data-testid="task-overdue-badge"
                className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800"
              >
                <AlertCircle className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span>Zaległe</span>
              </span>
            )}
          </div>

          {/* Prawa strona stopki: przyciski akcji kafelka */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Przycisk przywracania do Backlogu (dla zadań zaległych) */}
            {isOverdue && onReturnToBacklog && !isDone && (
              <button
                type="button"
                onClick={handleReturnToBacklog}
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                data-testid="task-return-btn"
                aria-label="Przywróć do backlogu"
                title="Przywróć zadanie do Backlogu"
                className="inline-flex items-center justify-center rounded p-1 text-amber-600 transition-colors hover:bg-amber-100 hover:text-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}

            {/* Przełącznik priorytetu */}
            <button
              type="button"
              onClick={handleCyclePriority}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              data-testid="task-priority-btn"
              aria-label={`Priorytet: ${PRIORITY_LABELS[task.priority]}. Kliknij, aby zmienić`}
              title={`Priorytet: ${PRIORITY_LABELS[task.priority]} (kliknij, aby zmienić)`}
              className={`inline-flex items-center justify-center rounded p-1 transition-colors hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 ${priorityConfig.flag} ${priorityConfig.hoverFlag}`}
            >
              <Flag className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
            </button>

            {/* Szybkie przeniesienie zadania (Quick Move dla mobile/tablet) */}
            {onMoveToDay && (
              <div
                className="relative inline-flex items-center justify-center rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-blue-600 focus-within:ring-2 focus-within:ring-blue-500"
                title="Przenieś do innego dnia"
              >
                <CalendarDays className="h-3.5 w-3.5 shrink-0 pointer-events-none" aria-hidden="true" />
                <select
                  defaultValue=""
                  onChange={handleMoveSelect}
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  data-testid="task-move-select"
                  aria-label={`Przenieś zadanie "${task.title}" do innego dnia`}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer text-xs"
                >
                  <option value="" disabled>
                    Przenieś do...
                  </option>
                  {task.day !== null && <option value="backlog">Backlog</option>}
                  {WEEKDAYS.map((wd) =>
                    wd !== task.day ? (
                      <option key={wd} value={wd}>
                        {DAY_LABELS[wd]}
                      </option>
                    ) : null
                  )}
                </select>
              </div>
            )}

            {/* Przycisk edycji tekstu */}
            {!isEditing && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  startEditing();
                }}
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                data-testid="task-edit-btn"
                aria-label="Edytuj zadanie"
                title="Edytuj treść zadania"
                className="inline-flex items-center justify-center rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}

            {/* Przycisk usunięcia zadania */}
            <button
              type="button"
              onClick={handleDelete}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              data-testid="task-delete-btn"
              aria-label="Usuń zadanie"
              title="Usuń zadanie"
              className="inline-flex items-center justify-center rounded p-1 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-500"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    );
  })
);

TaskCard.displayName = 'TaskCard';

export default TaskCard;
