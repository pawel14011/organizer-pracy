import React from 'react';

export interface WeekGridProps {
  /** Kolumny dni tygodnia (DayColumn) renderowane wewnątrz siatki */
  children?: React.ReactNode;
  /** Dodatkowe klasy CSS */
  className?: string;
}

/**
 * Prawy panel aplikacji zawierający 7 kolumn stałego tygodnia.
 * Obsługuje horyzontalne przewijanie (overflow-x-auto) przy mniejszych szerokościach ekranu.
 */
export const WeekGrid = React.memo(function WeekGrid({ children, className = '' }: WeekGridProps) {
  return (
    <section
      data-testid="week-grid"
      aria-label="Stały tydzień (7 kolumn)"
      className={`flex flex-1 min-w-0 flex-col overflow-visible lg:overflow-hidden ${className}`.trim()}
    >
      <div className="flex flex-1 overflow-x-visible lg:overflow-x-auto pb-1">
        <div className="flex h-full gap-3 flex-1 lg:min-w-[1260px]">
          {children}
        </div>
      </div>
    </section>
  );
});

WeekGrid.displayName = 'WeekGrid';

export default WeekGrid;
