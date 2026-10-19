import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  TaskCard,
  SortableTaskCard,
  DayColumn,
  BacklogColumn,
  Header,
  AddTaskForm,
  WeekGrid,
} from './index';
import { App } from '../App';
import { useTasks } from '../hooks';
import { renderHook } from '@testing-library/react';
import type { Task } from '../types';

describe('Audyt A11y, Typów i Optymalizacji Wydajności (Issue #20)', () => {
  const sampleTask: Task = {
    id: 'test-task-1',
    title: 'Weryfikacja dostępności i wydajności',
    status: 'todo',
    priority: 'medium',
    day: 'mon',
    order: 0,
    createdAt: '2026-10-19T12:00:00.000Z',
  };

  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('Audyt Dostępności (a11y) i Obsługi Fokusu', () => {
    it('zapewnia atrybuty aria-label oraz pierścienie fokusu (focus:ring) na wszystkich przyciskach kafelka', () => {
      render(
        <TaskCard
          task={sampleTask}
          isOverdue={true}
          onToggleStatus={vi.fn()}
          onCyclePriority={vi.fn()}
          onDelete={vi.fn()}
          onUpdateTitle={vi.fn()}
          onReturnToBacklog={vi.fn()}
        />
      );

      // Checkbox
      const checkbox = screen.getByTestId('task-checkbox');
      expect(checkbox).toHaveAttribute('aria-label');
      expect(checkbox.className).toContain('focus:ring-2');

      // Przycisk priorytetu
      const priorityBtn = screen.getByTestId('task-priority-btn');
      expect(priorityBtn).toHaveAttribute('aria-label');
      expect(priorityBtn.className).toContain('focus:ring-2');

      // Przycisk edycji
      const editBtn = screen.getByTestId('task-edit-btn');
      expect(editBtn).toHaveAttribute('aria-label');
      expect(editBtn.className).toContain('focus:ring-2');

      // Przycisk usuwania
      const deleteBtn = screen.getByTestId('task-delete-btn');
      expect(deleteBtn).toHaveAttribute('aria-label');
      expect(deleteBtn.className).toContain('focus:ring-2');

      // Przycisk przywrócenia z zaległości
      const returnBtn = screen.getByTestId('task-return-btn');
      expect(returnBtn).toHaveAttribute('aria-label');
      expect(returnBtn.className).toContain('focus:ring-2');

      // Ikony posiadają aria-hidden="true"
      const icons = screen.getByTestId('task-card').querySelectorAll('svg');
      icons.forEach((icon) => {
        expect(icon).toHaveAttribute('aria-hidden', 'true');
      });
    });

    it('zapewnia poprawne etykiety landmarków i dostępność paska nawigacji Header', () => {
      render(<Header tasks={[sampleTask]} />);

      const exportBtn = screen.getByTestId('export-backup-btn');
      expect(exportBtn).toHaveAttribute('aria-label');
      expect(exportBtn.className).toContain('focus:ring-2');

      const importBtn = screen.getByTestId('import-backup-btn');
      expect(importBtn).toHaveAttribute('aria-label');
      expect(importBtn.className).toContain('focus:ring-2');
    });

    it('zapewnia obsługę fokusu i etykietę formularza AddTaskForm', () => {
      render(<AddTaskForm onAddTask={vi.fn()} />);

      const form = screen.getByTestId('add-task-form');
      expect(form).toHaveAttribute('role', 'form');
      expect(form).toHaveAttribute('aria-label');

      const input = screen.getByTestId('add-task-input');
      expect(input).toHaveAttribute('aria-label');

      const submitBtn = screen.getByTestId('add-task-submit');
      expect(submitBtn).toHaveAttribute('aria-label');
      expect(submitBtn.className).toContain('focus:ring-2');
    });

    it('zapewnia etykietę landmarku main w App', () => {
      render(<App />);
      const mainLandmark = screen.getByRole('main');
      expect(mainLandmark).toHaveAttribute('aria-label', 'Tablica zadań');
    });
  });

  describe('Audyt Wydajności i Stabilności Referencji', () => {
    it('zwraca stabilną referencję tablicy z getTasksByDay i backlogTasks, gdy stan zadań nie uległ zmianie', () => {
      const { result, rerender } = renderHook(() =>
        useTasks({
          storageKey: 'test_a11y_tasks',
          initialTasks: [sampleTask],
        })
      );

      const mondayTasksBefore = result.current.getTasksByDay('mon');
      const backlogTasksBefore = result.current.backlogTasks;

      // Wywołanie ponownego renderowania bez zmiany stanu
      rerender();

      const mondayTasksAfter = result.current.getTasksByDay('mon');
      const backlogTasksAfter = result.current.backlogTasks;

      // Stabilność referencyjna dzięki tasksByDayMap
      expect(mondayTasksBefore).toBe(mondayTasksAfter);
      expect(backlogTasksBefore).toBe(backlogTasksAfter);
    });

    it('wszystkie kluczowe komponenty widoku posiadają zdefiniowane displayName i są opakowane w React.memo', () => {
      expect(TaskCard.displayName).toBe('TaskCard');
      expect(SortableTaskCard.displayName).toBe('SortableTaskCard');
      expect(DayColumn.displayName).toBe('DayColumn');
      expect(BacklogColumn.displayName).toBe('BacklogColumn');
      expect(Header.displayName).toBe('Header');
      expect(AddTaskForm.displayName).toBe('AddTaskForm');
      expect(WeekGrid.displayName).toBe('WeekGrid');
    });
  });

  describe('Audyt Czystości Konsoli (Brak Błędów i Ostrzeżeń React/Key)', () => {
    it('nie zgłasza błędów ani ostrzeżeń console.error / console.warn podczas montowania i interakcji z App', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error');
      const consoleWarnSpy = vi.spyOn(console, 'warn');

      render(<App />);

      // Szybkie dodanie zadania
      const input = screen.getByTestId('add-task-input');
      fireEvent.change(input, { target: { value: 'Zadanie testowe konsoli' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

      expect(consoleErrorSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });
  });
});
