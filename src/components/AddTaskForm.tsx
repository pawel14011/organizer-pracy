import React, { useState, useRef, useCallback } from 'react';
import { Plus } from 'lucide-react';

export interface AddTaskFormProps {
  /** Callback wywoływany z oczyszczonym tytułem zadania po naciśnięciu Enter lub kliknięciu przycisku */
  onAddTask: (title: string) => void;
  /** Opcjonalny placeholder dla pola tekstowego */
  placeholder?: string;
  /** Opcjonalne dodatkowe klasy kontenera formularza */
  className?: string;
  /** Flaga automatycznego ustawienia fokusu po zamontowaniu */
  autoFocus?: boolean;
  /** Flaga zablokowania formularza */
  disabled?: boolean;
}

/**
 * Komponent pola szybkiego dodawania zadania w panelu Backlogu.
 *
 * Funkcjonalności:
 * - Pole tekstowe z placeholderem (np. "Wpisz treść zadania i naciśnij Enter...").
 * - Obsługa klawisza Enter oraz przycisku "+" - natychmiastowe utworzenie zadania i wyczyszczenie pola.
 * - Walidacja: blokada dodawania pustych zadań lub zawierających wyłącznie białe znaki (`trim()`).
 * - Ochrona przed wielokrotnym dodaniem przy szybkich powtórzeniach (natychmiastowe czyszczenie stanu).
 * - Zachowanie fokusu w polu po zatwierdzeniu zadania.
 */
export const AddTaskForm = React.memo(function AddTaskForm({
  onAddTask,
  placeholder = 'Wpisz treść zadania i naciśnij Enter...',
  className = '',
  autoFocus = false,
  disabled = false,
}: AddTaskFormProps) {
  const [title, setTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(
    (e?: React.FormEvent) => {
      if (e) {
        e.preventDefault();
      }

      if (disabled) {
        return;
      }

      const trimmedTitle = title.trim();
      if (!trimmedTitle) {
        return;
      }

      // Czyścimy pole przed wywołaniem callbacku, zapobiegając wielokrotnemu dodaniu tego samego zadania
      setTitle('');
      onAddTask(trimmedTitle);

      // Zapewniamy zachowanie fokusu dla sprawnego wprowadzania kolejnych zadań
      inputRef.current?.focus();
    },
    [title, disabled, onAddTask]
  );

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setTitle('');
    }
  }, []);

  const isSubmitDisabled = disabled || !title.trim();

  return (
    <form
      data-testid="add-task-form"
      onSubmit={handleSubmit}
      className={`relative flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 shadow-sm transition-all focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 ${className}`.trim()}
      role="form"
      aria-label="Formularz szybkiego dodawania zadania"
    >
      <input
        ref={inputRef}
        type="text"
        data-testid="add-task-input"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        aria-label="Treść nowego zadania"
        maxLength={500}
        disabled={disabled}
        autoFocus={autoFocus}
        className="w-full bg-transparent text-base sm:text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none disabled:opacity-50"
      />

      <button
        type="submit"
        data-testid="add-task-submit"
        disabled={isSubmitDisabled}
        aria-label="Dodaj zadanie"
        title="Dodaj zadanie (Enter)"
        className="inline-flex h-7 w-7 sm:h-6 sm:w-6 shrink-0 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
      </button>
    </form>
  );
});

AddTaskForm.displayName = 'AddTaskForm';

export default AddTaskForm;
