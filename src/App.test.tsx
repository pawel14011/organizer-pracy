import { render, screen, act, fireEvent } from '@testing-library/react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import App from './App';
import { DEFAULT_TASKS_STORAGE_KEY } from './utils/storage';
import * as backupUtils from './utils/backup';
import type { Task } from './types';

describe('App Layout Integration', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders the main layout with Header, Backlog and WeekGrid', () => {
    render(<App />);

    // Header
    const heading = screen.getByRole('heading', {
      level: 1,
      name: /organizer pracy/i,
    });
    expect(heading).toBeInTheDocument();
    expect(screen.getByTestId('header')).toBeInTheDocument();

    // Backlog
    expect(screen.getByTestId('column-backlog')).toBeInTheDocument();
    expect(screen.getByText('Backlog')).toBeInTheDocument();
    expect(screen.getByTestId('backlog-count')).toHaveTextContent('0');

    // Week Grid
    expect(screen.getByTestId('week-grid')).toBeInTheDocument();

    // All 7 weekday columns
    const expectedDays = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
    for (const day of expectedDays) {
      expect(screen.getByTestId(`column-day-${day}`)).toBeInTheDocument();
    }
  });

  it('renders all Polish day names across the 7 columns', () => {
    render(<App />);

    expect(screen.getByText('Poniedziałek')).toBeInTheDocument();
    expect(screen.getByText('Wtorek')).toBeInTheDocument();
    expect(screen.getByText('Środa')).toBeInTheDocument();
    expect(screen.getByText('Czwartek')).toBeInTheDocument();
    expect(screen.getByText('Piątek')).toBeInTheDocument();
    expect(screen.getByText('Sobota')).toBeInTheDocument();
    expect(screen.getByText('Niedziela')).toBeInTheDocument();
  });

  it('identifies today and renders the DZISIAJ badge on the current day', () => {
    // Ustawienie stałej daty: środa, 21 października 2026, 12:00 czasu lokalnego
    const mockWednesday = new Date(2026, 9, 21, 12, 0, 0);
    vi.useFakeTimers();
    vi.setSystemTime(mockWednesday);

    render(<App />);

    // W środy ('wed') powinien być widoczny badge "DZISIAJ"
    expect(screen.getByTestId('badge-today-wed')).toBeInTheDocument();
    expect(screen.queryByTestId('badge-today-mon')).not.toBeInTheDocument();
    expect(screen.queryByTestId('badge-today-tue')).not.toBeInTheDocument();

    vi.useRealTimers();
  });

  it('displays tasks loaded from localStorage in corresponding column counters', () => {
    const initialTasks: Task[] = [
      {
        id: '1',
        title: 'Zadanie Backlog',
        status: 'todo',
        priority: 'medium',
        day: null,
        order: 0,
        createdAt: '2026-10-19T10:00:00.000Z',
      },
      {
        id: '2',
        title: 'Zadanie Wtorek',
        status: 'todo',
        priority: 'high',
        day: 'tue',
        order: 0,
        createdAt: '2026-10-19T10:00:00.000Z',
      },
      {
        id: '3',
        title: 'Drugie Zadanie Wtorek',
        status: 'done',
        priority: 'low',
        day: 'tue',
        order: 1,
        createdAt: '2026-10-19T10:00:00.000Z',
      },
    ];

    localStorage.setItem(DEFAULT_TASKS_STORAGE_KEY, JSON.stringify(initialTasks));

    render(<App />);

    expect(screen.getByTestId('backlog-count')).toHaveTextContent('1');
    expect(screen.getByTestId('day-count-tue')).toHaveTextContent('2');
    expect(screen.getByTestId('day-count-mon')).toHaveTextContent('0');
  });

  it('updates reference date when window receives focus', () => {
    // Rozpoczynamy w poniedziałek (19 października 2026, 12:00 czasu lokalnego)
    const monday = new Date(2026, 9, 19, 12, 0, 0);
    vi.useFakeTimers();
    vi.setSystemTime(monday);

    render(<App />);
    expect(screen.getByTestId('badge-today-mon')).toBeInTheDocument();

    // Przeskok w czasie do wtorku (20 października 2026, 12:00 czasu lokalnego)
    const tuesday = new Date(2026, 9, 20, 12, 0, 0);
    vi.setSystemTime(tuesday);

    // Symulacja powrotu użytkownika do karty (focus)
    act(() => {
      window.dispatchEvent(new Event('focus'));
    });

    expect(screen.getByTestId('badge-today-tue')).toBeInTheDocument();
    expect(screen.queryByTestId('badge-today-mon')).not.toBeInTheDocument();

    vi.useRealTimers();
  });

  it('adds a new task to Backlog using AddTaskForm when user submits text with Enter', () => {
    render(<App />);

    expect(screen.getByTestId('backlog-count')).toHaveTextContent('0');

    const input = screen.getByTestId('add-task-input');
    const form = screen.getByTestId('add-task-form');

    fireEvent.change(input, { target: { value: 'Nowe zadanie integracyjne' } });
    fireEvent.submit(form);

    expect(screen.getByTestId('backlog-count')).toHaveTextContent('1');
    expect(screen.getByText('Nowe zadanie integracyjne')).toBeInTheDocument();

    // Verify task default priority medium
    const taskCard = screen.getByTestId('task-card');
    expect(taskCard).toHaveAttribute('data-priority', 'medium');
    const priorityBtn = screen.getByTestId('task-priority-btn');
    expect(priorityBtn).toHaveAttribute('aria-label', expect.stringMatching(/średni/i));

    // Verify input is cleared and still focused
    expect(input).toHaveValue('');
    expect(document.activeElement).toBe(input);
  });

  it('renders helpful empty states encouraging task dropping or creation across all columns', () => {
    render(<App />);

    expect(screen.getByText('Brak zadań w Backlogu')).toBeInTheDocument();
    expect(screen.getByText('Wpisz zadanie powyżej')).toBeInTheDocument();

    const emptyDayStates = screen.getAllByText('Brak zadań');
    expect(emptyDayStates).toHaveLength(7);
    const dropHints = screen.getAllByText('Upuść zadanie tutaj');
    expect(dropHints).toHaveLength(7);
  });

  describe('Overdue tasks integration and backlog restoration', () => {
    it('correctly identifies overdue tasks, renders return buttons, and restores them to Backlog individually and in batch', () => {
      // Środa, 21 października 2026
      const mockWednesday = new Date(2026, 9, 21, 12, 0, 0);
      vi.useFakeTimers();
      vi.setSystemTime(mockWednesday);

      const testTasks: Task[] = [
        {
          id: 'task-mon-todo',
          title: 'Zadanie Poniedziałek Todo',
          status: 'todo',
          priority: 'high',
          day: 'mon',
          order: 0,
          createdAt: '2026-10-19T10:00:00.000Z',
        },
        {
          id: 'task-mon-done',
          title: 'Zadanie Poniedziałek Wykonane',
          status: 'done',
          priority: 'low',
          day: 'mon',
          order: 1,
          createdAt: '2026-10-19T10:00:00.000Z',
        },
        {
          id: 'task-tue-todo',
          title: 'Zadanie Wtorek Todo',
          status: 'todo',
          priority: 'medium',
          day: 'tue',
          order: 0,
          createdAt: '2026-10-20T10:00:00.000Z',
        },
        {
          id: 'task-wed-todo',
          title: 'Zadanie Środa Dzisiaj',
          status: 'todo',
          priority: 'medium',
          day: 'wed',
          order: 0,
          createdAt: '2026-10-21T10:00:00.000Z',
        },
      ];

      localStorage.setItem(DEFAULT_TASKS_STORAGE_KEY, JSON.stringify(testTasks));

      render(<App />);

      // Sprawdzenie kafelków poniedziałkowych
      const monCards = screen.getAllByTestId('task-card');
      const monTodoCard = monCards.find(
        (c) => c.getAttribute('data-task-id') === 'task-mon-todo'
      );
      const monDoneCard = monCards.find(
        (c) => c.getAttribute('data-task-id') === 'task-mon-done'
      );
      const wedCard = monCards.find(
        (c) => c.getAttribute('data-task-id') === 'task-wed-todo'
      );

      // Zadanie z poniedziałku niewykonane ma status zaległego
      expect(monTodoCard).toHaveAttribute('data-overdue', 'true');
      expect(monTodoCard?.querySelector('[data-testid="task-overdue-badge"]')).toBeInTheDocument();
      expect(monTodoCard?.querySelector('[data-testid="task-return-btn"]')).toBeInTheDocument();

      // Zadanie z poniedziałku wykonane NIE jest zaległe
      expect(monDoneCard).toHaveAttribute('data-overdue', 'false');
      expect(monDoneCard?.querySelector('[data-testid="task-overdue-badge"]')).toBeNull();
      expect(monDoneCard?.querySelector('[data-testid="task-return-btn"]')).toBeNull();

      // Zadanie z dzisiaj (środa) NIE jest zaległe
      expect(wedCard).toHaveAttribute('data-overdue', 'false');
      expect(wedCard?.querySelector('[data-testid="task-overdue-badge"]')).toBeNull();

      // Przyciski zbiorcze w nagłówkach przeszłych dni
      expect(screen.getByTestId('day-return-overdue-btn-mon')).toBeInTheDocument();
      expect(screen.getByTestId('day-return-overdue-btn-tue')).toBeInTheDocument();
      expect(screen.queryByTestId('day-return-overdue-btn-wed')).not.toBeInTheDocument();

      // KROK 1: Kliknięcie przycisku przywracania na kafelku wtorkowym
      const tueReturnBtn = screen
        .getByText('Zadanie Wtorek Todo')
        .closest('[data-testid="task-card"]')
        ?.querySelector('[data-testid="task-return-btn"]');
      expect(tueReturnBtn).toBeInTheDocument();

      fireEvent.click(tueReturnBtn!);

      // Wtorkowe zadanie trafia do Backlogu
      expect(screen.getByTestId('backlog-count')).toHaveTextContent('1');
      expect(screen.getByTestId('day-count-tue')).toHaveTextContent('0');

      // Przycisk zbiorczy we wtorku znika (brak zaległych zadań)
      expect(screen.queryByTestId('day-return-overdue-btn-tue')).not.toBeInTheDocument();

      // KROK 2: Kliknięcie przycisku zbiorczego w nagłówku poniedziałku
      const monBatchBtn = screen.getByTestId('day-return-overdue-btn-mon');
      fireEvent.click(monBatchBtn);

      // Zadanie niewykonane przeniesione do Backlogu, wykonane pozostaje w poniedziałku
      expect(screen.getByTestId('backlog-count')).toHaveTextContent('2');
      expect(screen.getByTestId('day-count-mon')).toHaveTextContent('1');

      // Przycisk zbiorczy w poniedziałku znika
      expect(screen.queryByTestId('day-return-overdue-btn-mon')).not.toBeInTheDocument();

      // Wykonane zadanie nadal znajduje się w kolumnie poniedziałku
      expect(screen.getByText('Zadanie Poniedziałek Wykonane')).toBeInTheDocument();

      vi.useRealTimers();
    });
  });

  describe('Backup and restore integration (Export & Import in App)', () => {
    it('exports all application tasks to JSON when clicking the Header Export button', () => {
      const initialTasks: Task[] = [
        {
          id: 'task-backlog-1',
          title: 'Zadanie Backlog Export',
          status: 'todo',
          priority: 'medium',
          day: null,
          order: 0,
          createdAt: '2026-10-19T10:00:00.000Z',
        },
        {
          id: 'task-mon-1',
          title: 'Zadanie Mon Export',
          status: 'done',
          priority: 'high',
          day: 'mon',
          order: 0,
          createdAt: '2026-10-19T10:00:00.000Z',
        },
      ];

      localStorage.setItem(DEFAULT_TASKS_STORAGE_KEY, JSON.stringify(initialTasks));
      const exportSpy = vi
        .spyOn(backupUtils, 'exportTasksToJson')
        .mockReturnValue('organizer-backup-2026-10-19.json');

      render(<App />);

      const exportBtn = screen.getByTestId('export-backup-btn');
      fireEvent.click(exportBtn);

      expect(exportSpy).toHaveBeenCalledTimes(1);
      expect(exportSpy).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: 'task-backlog-1' }),
          expect.objectContaining({ id: 'task-mon-1' }),
        ])
      );

      const notification = screen.getByTestId('backup-notification');
      expect(notification).toBeInTheDocument();
      expect(screen.getByTestId('backup-notification-message')).toHaveTextContent(
        'Pomyślnie wyeksportowano kopię zapasową (2 zadań).'
      );
    });

    it('imports backup JSON, updates application columns, counters and synchronizes with localStorage after confirmation', async () => {
      const initialTasks: Task[] = [
        {
          id: 'initial-task',
          title: 'Stare zadanie do nadpisania',
          status: 'todo',
          priority: 'low',
          day: null,
          order: 0,
          createdAt: '2026-10-19T10:00:00.000Z',
        },
      ];
      localStorage.setItem(DEFAULT_TASKS_STORAGE_KEY, JSON.stringify(initialTasks));

      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

      render(<App />);

      expect(screen.getByText('Stare zadanie do nadpisania')).toBeInTheDocument();
      expect(screen.getByTestId('backlog-count')).toHaveTextContent('1');
      expect(screen.getByTestId('day-count-fri')).toHaveTextContent('0');

      const importedTasks: Task[] = [
        {
          id: 'imported-backlog',
          title: 'Nowe Zadanie w Backlogu',
          status: 'todo',
          priority: 'high',
          day: null,
          order: 0,
          createdAt: '2026-10-19T12:00:00.000Z',
        },
        {
          id: 'imported-fri',
          title: 'Nowe Zadanie na Piątek',
          status: 'done',
          priority: 'medium',
          day: 'fri',
          order: 0,
          createdAt: '2026-10-19T12:30:00.000Z',
        },
      ];

      const backupFile = new File([JSON.stringify(importedTasks)], 'backup.json', {
        type: 'application/json',
      });
      const fileInput = screen.getByTestId('import-file-input');

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [backupFile] } });
      });

      expect(confirmSpy).toHaveBeenCalledTimes(1);

      // Nowe zadania powinny być widoczne w interfejsie
      expect(screen.getByText('Nowe Zadanie w Backlogu')).toBeInTheDocument();
      expect(screen.getByText('Nowe Zadanie na Piątek')).toBeInTheDocument();
      expect(screen.queryByText('Stare zadanie do nadpisania')).toBeNull();

      // Liczniki kolumn powinny zostać zaktualizowane
      expect(screen.getByTestId('backlog-count')).toHaveTextContent('1');
      expect(screen.getByTestId('day-count-fri')).toHaveTextContent('1');

      // Pamięć localStorage powinna zostać zsynchronizowana z nowymi zadaniami
      const storedTasksJson = localStorage.getItem(DEFAULT_TASKS_STORAGE_KEY);
      expect(storedTasksJson).not.toBeNull();
      const storedTasks = JSON.parse(storedTasksJson!);
      expect(storedTasks).toHaveLength(2);
      expect(storedTasks).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: 'imported-backlog', title: 'Nowe Zadanie w Backlogu' }),
          expect.objectContaining({ id: 'imported-fri', title: 'Nowe Zadanie na Piątek' }),
        ])
      );

      // Komunikat sukcesu powinien być widoczny
      expect(screen.getByTestId('backup-notification')).toBeInTheDocument();
      expect(screen.getByTestId('backup-notification-message')).toHaveTextContent(
        'Pomyślnie zaimportowano 2 zadań.'
      );
    });

    it('safeguards against corrupted JSON import, preserves existing tasks and prevents data loss', async () => {
      const initialTasks: Task[] = [
        {
          id: 'safe-task',
          title: 'Bezpieczne zadanie nienaruszone',
          status: 'todo',
          priority: 'high',
          day: 'tue',
          order: 0,
          createdAt: '2026-10-19T10:00:00.000Z',
        },
      ];
      localStorage.setItem(DEFAULT_TASKS_STORAGE_KEY, JSON.stringify(initialTasks));

      const confirmSpy = vi.spyOn(window, 'confirm');

      render(<App />);

      expect(screen.getByText('Bezpieczne zadanie nienaruszone')).toBeInTheDocument();
      expect(screen.getByTestId('day-count-tue')).toHaveTextContent('1');

      const corruptedFile = new File(['{{ invalid json syntax !!!'], 'corrupted.json', {
        type: 'application/json',
      });
      const fileInput = screen.getByTestId('import-file-input');

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [corruptedFile] } });
      });

      // Nie wyświetlono prośby o potwierdzenie dla uszkodzonego pliku
      expect(confirmSpy).not.toHaveBeenCalled();

      // Komunikat błędu
      expect(screen.getByTestId('backup-notification')).toBeInTheDocument();
      expect(screen.getByTestId('backup-notification-message')).toHaveTextContent(
        /Błąd importu: Nieprawidłowy format JSON/i
      );

      // Dotychczasowe zadanie nadal istnieje w widoku
      expect(screen.getByText('Bezpieczne zadanie nienaruszone')).toBeInTheDocument();
      expect(screen.getByTestId('day-count-tue')).toHaveTextContent('1');

      // LocalStorage pozostało w niezmienionym stanie
      const storedTasksJson = localStorage.getItem(DEFAULT_TASKS_STORAGE_KEY);
      expect(storedTasksJson).not.toBeNull();
      const storedTasks = JSON.parse(storedTasksJson!);
      expect(storedTasks).toHaveLength(1);
      expect(storedTasks[0].title).toBe('Bezpieczne zadanie nienaruszone');
    });
  });
});
