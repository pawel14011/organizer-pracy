import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Download, Upload, AlertCircle, CheckCircle2, X } from 'lucide-react';
import type { Task } from '../types';
import { exportTasksToJson, validateAndSanitizeImport } from '../utils';

/**
 * Struktura powiadomienia o statusie operacji na kopii zapasowej.
 */
export interface BackupNotification {
  message: string;
  type: 'success' | 'error' | 'info';
}

/**
 * Właściwości komponentu Header.
 */
export interface HeaderProps {
  /** Lista zadań do wyeksportowania (domyślnie pusta tablica []) */
  tasks?: Task[];
  /** Callback wywoływany po pomyślnym zaimportowaniu i zweryfikowaniu zadań */
  onImportTasks?: (tasks: Task[]) => void;
  /** Opcjonalny własny callback do obsługi eksportu (domyślnie wywołuje exportTasksToJson) */
  onExport?: (tasks: Task[]) => void;
  /** Opcjonalna funkcja potwierdzenia nadpisania bazy zadań (domyślnie window.confirm) */
  confirmDialog?: (message: string) => boolean | Promise<boolean>;
  /** Opcjonalne dodatkowe elementy akcji w prawej części nagłówka */
  actions?: React.ReactNode;
  /** Dodatkowe klasy CSS */
  className?: string;
}

/**
 * Bezpiecznie odczytuje zawartość tekstową wskazanego pliku File.
 * Obsługuje zarówno natywną metodę file.text(), jak i standardowy obiekt FileReader.
 */
async function readFileAsText(file: File): Promise<string> {
  if (typeof file.text === 'function') {
    return await file.text();
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Nieprawidłowy odczyt zawartości pliku kopii zapasowej.'));
      }
    };
    reader.onerror = () => {
      reject(new Error('Nie udało się odczytać wybranego pliku kopii zapasowej.'));
    };
    reader.readAsText(file);
  });
}

/**
 * Główny nagłówek aplikacji z tytułem, zintegrowanym panelem akcji kopii zapasowej (Eksport / Import)
 * oraz powiadomieniami o statusie operacji.
 */
export function Header({
  tasks = [],
  onImportTasks,
  onExport,
  confirmDialog,
  actions,
  className = '',
}: HeaderProps) {
  const [notification, setNotification] = useState<BackupNotification | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const notificationTimerRef = useRef<number | null>(null);

  // Bezpieczne czyszczenie timera powiadomienia
  const clearNotificationTimer = useCallback(() => {
    if (notificationTimerRef.current !== null) {
      window.clearTimeout(notificationTimerRef.current);
      notificationTimerRef.current = null;
    }
  }, []);

  // Wyświetlanie powiadomienia z automatycznym zamknięciem po 5 sekundach
  const showNotification = useCallback(
    (message: string, type: 'success' | 'error' | 'info') => {
      clearNotificationTimer();
      setNotification({ message, type });
      notificationTimerRef.current = window.setTimeout(() => {
        setNotification(null);
        notificationTimerRef.current = null;
      }, 5000);
    },
    [clearNotificationTimer]
  );

  // Ręczne zamknięcie powiadomienia przez użytkownika
  const dismissNotification = useCallback(() => {
    clearNotificationTimer();
    setNotification(null);
  }, [clearNotificationTimer]);

  useEffect(() => {
    return () => {
      clearNotificationTimer();
    };
  }, [clearNotificationTimer]);

  // Obsługa eksportu zadań do pliku JSON
  const handleExport = useCallback(() => {
    try {
      if (onExport) {
        onExport(tasks);
      } else {
        exportTasksToJson(tasks);
      }
      showNotification(
        `Pomyślnie wyeksportowano kopię zapasową (${tasks.length} ${
          tasks.length === 1 ? 'zadanie' : 'zadań'
        }).`,
        'success'
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Wystąpił nieoczekiwany błąd podczas eksportu.';
      showNotification(`Błąd eksportu: ${errorMessage}`, 'error');
    }
  }, [tasks, onExport, showNotification]);

  // Kliknięcie przycisku "Importuj" otwiera ukryte okno wyboru pliku
  const handleImportButtonClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Obsługa wyboru pliku kopii zapasowej i bezpieczna aktualizacja bazy zadań
  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }

      try {
        const fileContent = await readFileAsText(file);
        const validatedTasks = validateAndSanitizeImport(fileContent);

        // Zabezpieczenie przed przypadkowym nadpisaniem: prośba o potwierdzenie akcji
        const confirmMessage =
          'Czy na pewno chcesz zastąpić obecną bazę zadań danymi z pliku kopii zapasowej? Dotychczasowe zadania zostaną nadpisane.';
        const isConfirmed = await Promise.resolve(
          confirmDialog
            ? confirmDialog(confirmMessage)
            : typeof window !== 'undefined' && typeof window.confirm === 'function'
              ? window.confirm(confirmMessage)
              : true
        );

        if (isConfirmed) {
          onImportTasks?.(validatedTasks);
          showNotification(
            `Pomyślnie zaimportowano ${validatedTasks.length} ${
              validatedTasks.length === 1 ? 'zadanie' : 'zadań'
            }.`,
            'success'
          );
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Nieprawidłowy plik kopii zapasowej.';
        showNotification(`Błąd importu: ${errorMessage}`, 'error');
      } finally {
        // Resetowanie wartości inputu umożliwia ponowne wybranie tego samego pliku
        if (event.target) {
          event.target.value = '';
        }
      }
    },
    [confirmDialog, onImportTasks, showNotification]
  );

  return (
    <>
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
          {/* Przycisk eksportu bazy zadań do pliku JSON */}
          <button
            type="button"
            data-testid="export-backup-btn"
            onClick={handleExport}
            aria-label="Eksportuj kopię zapasową zadań do pliku JSON"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
          >
            <Download className="h-4 w-4 text-slate-500" aria-hidden="true" />
            <span>Eksportuj</span>
          </button>

          {/* Przycisk importu otwierający okno wyboru pliku JSON */}
          <button
            type="button"
            data-testid="import-backup-btn"
            onClick={handleImportButtonClick}
            aria-label="Importuj zadania z pliku JSON kopii zapasowej"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
          >
            <Upload className="h-4 w-4 text-slate-500" aria-hidden="true" />
            <span>Importuj</span>
          </button>

          {/* Niewidoczne pole wyboru pliku JSON */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            data-testid="import-file-input"
            className="sr-only"
            tabIndex={-1}
            aria-label="Wybierz plik kopii zapasowej JSON"
            onChange={handleFileChange}
          />

          {actions ?? null}
        </div>
      </header>

      {/* Komunikat informacyjny lub błąd operacji kopii zapasowej */}
      {notification && (
        <div
          data-testid="backup-notification"
          role={notification.type === 'error' ? 'alert' : 'status'}
          aria-live="polite"
          className={`fixed top-4 right-4 z-50 flex max-w-md items-center gap-3 rounded-lg border p-3 shadow-lg transition-all duration-200 animate-in fade-in slide-in-from-top-2 ${
            notification.type === 'error'
              ? 'border-rose-300 bg-rose-50 text-rose-900'
              : 'border-emerald-300 bg-emerald-50 text-emerald-900'
          }`}
        >
          {notification.type === 'error' ? (
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
          )}
          <span
            data-testid="backup-notification-message"
            className="text-sm font-medium"
          >
            {notification.message}
          </span>
          <button
            type="button"
            data-testid="close-notification-btn"
            onClick={dismissNotification}
            aria-label="Zamknij powiadomienie"
            className="ml-auto rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </>
  );
}

export default Header;
