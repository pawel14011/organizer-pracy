import { render, screen, act, fireEvent } from '@testing-library/react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import App from './App';
import { DEFAULT_TASKS_STORAGE_KEY } from './utils/storage';
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
});
