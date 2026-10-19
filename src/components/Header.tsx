import React from 'react';

export interface HeaderProps {
  /** Opcjonalne elementy akcji w prawej części nagłówka (np. przyciski eksportu/importu) */
  actions?: React.ReactNode;
  /** Dodatkowe klasy CSS */
  className?: string;
}

/**
 * Główny nagłówek aplikacji z tytułem i miejscem na przyciski akcji (kopia zapasowa).
 */
export function Header({ actions, className = '' }: HeaderProps) {
  return (
    <header
      data-testid="header"
      className={`flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6 shadow-sm ${className}`.trim()}
    >
      <div className="flex items-center gap-3">
        <h1
          data-testid="header-title"
          className="text-xl font-bold tracking-tight text-slate-900"
        >
          ORGANIZER PRACY
        </h1>
        <span className="hidden rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500 sm:inline-block">
          Planer Tygodniowy MVP
        </span>
      </div>

      <div
        data-testid="header-actions"
        className="flex items-center gap-2"
      >
        {actions ?? null}
      </div>
    </header>
  );
}

export default Header;
