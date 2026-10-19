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
export function WeekGrid({ children, className = '' }: WeekGridProps) {
  return (
    <section
      data-testid="week-grid"
      aria-label="Stały tydzień (7 kolumn)"
      className={`flex flex-1 min-w-0 flex-col overflow-hidden ${className}`.trim()}
    >
      <div className="flex flex-1 overflow-x-auto pb-1">
        <div className="flex h-full min-w-[1260px] flex-1 gap-3">
          {children}
        </div>
      </div>
    </section>
  );
}

export default WeekGrid;
