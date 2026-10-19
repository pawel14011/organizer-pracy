import React from 'react';
import type { Weekday } from '../types';
import { WEEK_DAYS_CONFIG, BACKLOG_DROPPABLE_ID } from '../constants';

export interface MobileNavProps {
  /** Identyfikator aktualnie aktywnej / widocznej kolumny ('backlog' | Weekday) */
  activeColumnId?: string;
  /** Liczba zadań w Backlogu */
  backlogCount?: number;
  /** Identyfikator bieżącego dnia tygodnia (dzisiaj) */
  todayWeekday?: Weekday;
  /** Callback wywoływany po kliknięciu wybranej kolumny */
  onSelectColumn?: (columnId: string) => void;
  /** Dodatkowe klasy CSS */
  className?: string;
}

/**
 * Komponent responsywnego paska nawigacji (MobileNav / Pills) dla smartfonów i tabletów.
 * Renderowany u góry na ekranach poniżej `lg:` (< 1024px).
 *
 * Umożliwia użytkownikom urządzeń mobilnych błyskawiczne przełączanie i płynne przewijanie
 * widoku do wybranej kolumny (Backlog lub 7 dni tygodnia) bez konieczności uciążliwego
 * manualnego przewijania całego horyzontalnego ekranu.
 */
export const MobileNav = React.memo(function MobileNav({
  activeColumnId = BACKLOG_DROPPABLE_ID,
  backlogCount = 0,
  todayWeekday,
  onSelectColumn,
  className = '',
}: MobileNavProps) {
  const isBacklogActive = activeColumnId === BACKLOG_DROPPABLE_ID;

  return (
    <nav
      data-testid="mobile-nav"
      aria-label="Wybór kolumny kalendarza"
      className={`flex items-center gap-1.5 overflow-x-auto py-2 px-3 bg-white border-b border-slate-200/90 shadow-2xs lg:hidden shrink-0 select-none scrollbar-none ${className}`.trim()}
      role="tablist"
    >
      {/* Pigułka Backlogu */}
      <button
        type="button"
        role="tab"
        id="tab-backlog"
        aria-controls={BACKLOG_DROPPABLE_ID}
        aria-selected={isBacklogActive}
        data-testid="mobile-nav-pill-backlog"
        onClick={() => onSelectColumn?.(BACKLOG_DROPPABLE_ID)}
        className={`flex items-center gap-1.5 shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
          isBacklogActive
            ? 'bg-blue-600 text-white shadow-xs ring-2 ring-blue-600/30'
            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
        }`}
      >
        <span>Backlog</span>
        <span
          className={`inline-flex items-center justify-center rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
            isBacklogActive ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-600'
          }`}
        >
          {backlogCount}
        </span>
      </button>

      {/* Pigułki 7 dni tygodnia */}
      {WEEK_DAYS_CONFIG.map(({ key, shortLabel }) => {
        const isActive = activeColumnId === key;
        const isToday = todayWeekday === key;

        let buttonClasses = '';
        if (isActive) {
          buttonClasses = 'bg-blue-600 text-white shadow-xs ring-2 ring-blue-600/30 font-bold';
        } else if (isToday) {
          buttonClasses = 'bg-blue-50 text-blue-700 border border-blue-300 font-semibold hover:bg-blue-100';
        } else {
          buttonClasses = 'bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium';
        }

        return (
          <button
            key={key}
            type="button"
            role="tab"
            id={`tab-${key}`}
            aria-controls={key}
            aria-selected={isActive}
            data-testid={`mobile-nav-pill-${key}`}
            onClick={() => onSelectColumn?.(key)}
            className={`flex items-center gap-1 shrink-0 rounded-full px-3 py-1 text-xs transition-all cursor-pointer ${buttonClasses}`}
          >
            <span>{shortLabel}</span>
            {isToday ? (
              <span
                data-testid={`mobile-nav-today-indicator-${key}`}
                className={`rounded-sm px-1 py-0.2 text-[9px] uppercase font-bold tracking-wider ${
                  isActive ? 'bg-blue-700 text-white' : 'bg-blue-600 text-white'
                }`}
              >
                DZIŚ
              </span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
});

MobileNav.displayName = 'MobileNav';

export default MobileNav;
