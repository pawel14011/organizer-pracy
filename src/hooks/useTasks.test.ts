import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useTasks, arrayMove } from './useTasks';
import { DEFAULT_TASKS_STORAGE_KEY, loadTasksFromStorage, saveTasksToStorage } from '../utils/storage';
import type { Task } from '../types';

/**
 * Fabryka pomocnicza dla zadań testowych z poprawną datą ISO.
 */
function createMockTask(overrides: Partial<Task> = {}): Task {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    title: overrides.title ?? 'Zadanie testowe',
    status: overrides.status ?? 'todo',
    priority: overrides.priority ?? 'medium',
    day: overrides.day !== undefined ? overrides.day : null,
    order: overrides.order ?? 0,
    createdAt: overrides.createdAt ?? '2026-10-19T10:00:00.000Z',
  };
}

describe('arrayMove utility', () => {
  it('moves an item forward in an array', () => {
    const list = ['A', 'B', 'C', 'D'];
    const result = arrayMove(list, 0, 2);
    expect(result).toEqual(['B', 'C', 'A', 'D']);
  });

  it('moves an item backward in an array', () => {
    const list = ['A', 'B', 'C', 'D'];
    const result = arrayMove(list, 3, 1);
    expect(result).toEqual(['A', 'D', 'B', 'C']);
  });

  it('does not mutate the original array', () => {
    const original = [1, 2, 3];
    const moved = arrayMove(original, 0, 2);
    expect(original).toEqual([1, 2, 3]);
    expect(moved).toEqual([2, 3, 1]);
  });
});

describe('useTasks hook', () => {
  const TEST_STORAGE_KEY = 'test_organizer_tasks';

  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('Inicjalizacja', () => {
    it('inicjalizuje z pustą tablicą zadań, gdy LocalStorage jest puste', () => {
      const { result } = renderHook(() => useTasks(TEST_STORAGE_KEY));

      expect(result.current.tasks).toEqual([]);
      expect(result.current.backlogTasks).toEqual([]);
      expect(result.current.getTasksByDay('mon')).toEqual([]);
    });

    it('wczytuje istniejące zadania z LocalStorage przy montowaniu', () => {
      const initialTask = createMockTask({
        id: 'task-1',
        title: 'Zadanie z pamięci',
        priority: 'high',
        day: 'tue',
        order: 0,
      });
      saveTasksToStorage([initialTask], TEST_STORAGE_KEY);

      const { result } = renderHook(() => useTasks(TEST_STORAGE_KEY));

      expect(result.current.tasks).toHaveLength(1);
      expect(result.current.tasks[0]).toEqual(initialTask);
      expect(result.current.getTasksByDay('tue')).toHaveLength(1);
    });

    it('obsługuje opcję initialTasks i synchronizuje ją do LocalStorage', () => {
      const task = createMockTask({
        id: 'task-opt',
        title: 'Zadanie startowe',
        priority: 'low',
        day: null,
        order: 0,
      });

      const { result } = renderHook(() =>
        useTasks({ storageKey: TEST_STORAGE_KEY, initialTasks: [task] })
      );

      expect(result.current.tasks).toEqual([task]);
      expect(loadTasksFromStorage(TEST_STORAGE_KEY)).toEqual([task]);
    });

    it('używa domyślnego klucza DEFAULT_TASKS_STORAGE_KEY przy wywołaniu bez parametrów', () => {
      const { result } = renderHook(() => useTasks());

      act(() => {
        result.current.addTask('Zadanie domyślne');
      });

      const saved = loadTasksFromStorage(DEFAULT_TASKS_STORAGE_KEY);
      expect(saved).toHaveLength(1);
      expect(saved[0].title).toBe('Zadanie domyślne');
    });
  });

  describe('addTask', () => {
    it('dodaje zadanie do Backlogu z domyślnym statusem todo i priorytetem medium', () => {
      const { result } = renderHook(() => useTasks(TEST_STORAGE_KEY));

      let created: Task | null = null;
      act(() => {
        created = result.current.addTask('Kupić mleko');
      });

      expect(created).not.toBeNull();
      expect(created!.title).toBe('Kupić mleko');
      expect(created!.status).toBe('todo');
      expect(created!.priority).toBe('medium');
      expect(created!.day).toBeNull();
      expect(created!.order).toBe(0);
      expect(created!.id).toBeDefined();
      expect(new Date(created!.createdAt).getTime()).not.toBeNaN();

      expect(result.current.tasks).toHaveLength(1);
      expect(result.current.backlogTasks).toHaveLength(1);

      // Sprawdzenie persystencji w LocalStorage
      const stored = loadTasksFromStorage(TEST_STORAGE_KEY);
      expect(stored).toHaveLength(1);
      expect(stored[0].title).toBe('Kupić mleko');
    });

    it('przypisuje kolejne indeksy order (0, 1, 2) kolejno dodawanym zadaniom w Backlogu', () => {
      const { result } = renderHook(() => useTasks(TEST_STORAGE_KEY));

      act(() => {
        result.current.addTask('Zadanie 1');
      });
      act(() => {
        result.current.addTask('Zadanie 2');
      });
      act(() => {
        result.current.addTask('Zadanie 3');
      });

      expect(result.current.backlogTasks).toHaveLength(3);
      expect(result.current.backlogTasks[0].order).toBe(0);
      expect(result.current.backlogTasks[1].order).toBe(1);
      expect(result.current.backlogTasks[2].order).toBe(2);
    });

    it('odrzuca puste ciągi i zwraca null nie modyfikując stanu', () => {
      const { result } = renderHook(() => useTasks(TEST_STORAGE_KEY));

      act(() => {
        const res1 = result.current.addTask('');
        const res2 = result.current.addTask('   ');
        expect(res1).toBeNull();
        expect(res2).toBeNull();
      });

      expect(result.current.tasks).toHaveLength(0);
      expect(loadTasksFromStorage(TEST_STORAGE_KEY)).toHaveLength(0);
    });

    it('usuwa białe znaki z początku i końca (trim) oraz ogranicza długość do 500 znaków', () => {
      const { result } = renderHook(() => useTasks(TEST_STORAGE_KEY));
      const longTitle = 'A'.repeat(600);

      act(() => {
        result.current.addTask(`   ${longTitle}   `);
      });

      expect(result.current.tasks[0].title).toHaveLength(500);
      expect(result.current.tasks[0].title).toBe('A'.repeat(500));
    });
  });

  describe('updateTask', () => {
    it('aktualizuje tytuł zadania i obcina białe znaki', () => {
      const { result } = renderHook(() => useTasks(TEST_STORAGE_KEY));
      let taskId = '';

      act(() => {
        const t = result.current.addTask('Stary tytuł');
        taskId = t!.id;
      });

      act(() => {
        result.current.updateTask(taskId, { title: '   Nowy zaktualizowany tytuł   ' });
      });

      expect(result.current.tasks[0].title).toBe('Nowy zaktualizowany tytuł');
      expect(loadTasksFromStorage(TEST_STORAGE_KEY)[0].title).toBe('Nowy zaktualizowany tytuł');
    });

    it('ignoruje próbę ustawienia pustego tytułu, zachowując dotychczasowy', () => {
      const { result } = renderHook(() => useTasks(TEST_STORAGE_KEY));
      let taskId = '';

      act(() => {
        const t = result.current.addTask('Niezmienny tytuł');
        taskId = t!.id;
      });

      act(() => {
        result.current.updateTask(taskId, { title: '   ' });
      });

      expect(result.current.tasks[0].title).toBe('Niezmienny tytuł');
    });

    it('aktualizuje priorytet i status zadania', () => {
      const { result } = renderHook(() => useTasks(TEST_STORAGE_KEY));
      let taskId = '';

      act(() => {
        const t = result.current.addTask('Zadanie testowe');
        taskId = t!.id;
      });

      act(() => {
        result.current.updateTask(taskId, { priority: 'high', status: 'done' });
      });

      expect(result.current.tasks[0].priority).toBe('high');
      expect(result.current.tasks[0].status).toBe('done');
    });

    it('nie wykonuje żadnych zmian, jeśli ID nie istnieje', () => {
      const { result } = renderHook(() => useTasks(TEST_STORAGE_KEY));

      act(() => {
        result.current.addTask('Zadanie');
      });

      act(() => {
        result.current.updateTask('non-existent-id', { title: 'Inny' });
      });

      expect(result.current.tasks[0].title).toBe('Zadanie');
    });
  });

  describe('toggleTaskStatus', () => {
    it('przełącza status z todo na done i odwrotnie', () => {
      const { result } = renderHook(() => useTasks(TEST_STORAGE_KEY));
      let taskId = '';

      act(() => {
        const t = result.current.addTask('Zadanie do zrobienia');
        taskId = t!.id;
      });

      expect(result.current.tasks[0].status).toBe('todo');

      // Przełączenie na done
      act(() => {
        result.current.toggleTaskStatus(taskId);
      });
      expect(result.current.tasks[0].status).toBe('done');
      expect(loadTasksFromStorage(TEST_STORAGE_KEY)[0].status).toBe('done');

      // Przełączenie z powrotem na todo
      act(() => {
        result.current.toggleTaskStatus(taskId);
      });
      expect(result.current.tasks[0].status).toBe('todo');
      expect(loadTasksFromStorage(TEST_STORAGE_KEY)[0].status).toBe('todo');
    });

    it('nie wykonuje zmian dla nieistniejącego ID', () => {
      const { result } = renderHook(() => useTasks(TEST_STORAGE_KEY));

      act(() => {
        result.current.addTask('Zadanie');
      });

      act(() => {
        result.current.toggleTaskStatus('nieznane-id');
      });

      expect(result.current.tasks[0].status).toBe('todo');
    });
  });

  describe('cycleTaskPriority', () => {
    it('wykonuje cykliczną rotację: low -> medium -> high -> low', () => {
      const initialTask = createMockTask({
        id: 'task-cycle',
        title: 'Zadanie cyklu',
        priority: 'low',
      });
      saveTasksToStorage([initialTask], TEST_STORAGE_KEY);

      const { result } = renderHook(() => useTasks(TEST_STORAGE_KEY));
      expect(result.current.tasks[0].priority).toBe('low');

      // low -> medium
      act(() => {
        result.current.cycleTaskPriority('task-cycle');
      });
      expect(result.current.tasks[0].priority).toBe('medium');

      // medium -> high
      act(() => {
        result.current.cycleTaskPriority('task-cycle');
      });
      expect(result.current.tasks[0].priority).toBe('high');

      // high -> low
      act(() => {
        result.current.cycleTaskPriority('task-cycle');
      });
      expect(result.current.tasks[0].priority).toBe('low');
    });

    it('nie modyfikuje stanu dla nieistniejącego ID', () => {
      const { result } = renderHook(() => useTasks(TEST_STORAGE_KEY));

      act(() => {
        result.current.addTask('Zadanie');
      });

      act(() => {
        result.current.cycleTaskPriority('invalid-id');
      });

      expect(result.current.tasks[0].priority).toBe('medium');
    });
  });

  describe('deleteTask', () => {
    it('usuwa zadanie z Backlogu i normalizuje indeksy pozostałych', () => {
      const { result } = renderHook(() => useTasks(TEST_STORAGE_KEY));
      let id1 = '', id2 = '', id3 = '';

      act(() => {
        id1 = result.current.addTask('Zadanie 1')!.id;
        id2 = result.current.addTask('Zadanie 2')!.id;
        id3 = result.current.addTask('Zadanie 3')!.id;
      });

      // Usuwamy środkowe zadanie (id2)
      act(() => {
        result.current.deleteTask(id2);
      });

      expect(result.current.tasks).toHaveLength(2);
      expect(result.current.backlogTasks).toHaveLength(2);
      expect(result.current.backlogTasks[0].id).toBe(id1);
      expect(result.current.backlogTasks[0].order).toBe(0);
      expect(result.current.backlogTasks[1].id).toBe(id3);
      expect(result.current.backlogTasks[1].order).toBe(1);

      // Sprawdzenie zapisu w LocalStorage
      const stored = loadTasksFromStorage(TEST_STORAGE_KEY);
      expect(stored).toHaveLength(2);
      expect(stored.find((t) => t.id === id2)).toBeUndefined();
    });

    it('usuwa zadanie z kolumny dnia i normalizuje indeksy tej kolumny bez naruszania innych kolumn', () => {
      const initialTasks: Task[] = [
        createMockTask({ id: 'mon-1', title: 'Pon 1', day: 'mon', order: 0 }),
        createMockTask({ id: 'mon-2', title: 'Pon 2', day: 'mon', order: 1 }),
        createMockTask({ id: 'mon-3', title: 'Pon 3', day: 'mon', order: 2 }),
        createMockTask({ id: 'tue-1', title: 'Wt 1', day: 'tue', order: 0 }),
      ];
      saveTasksToStorage(initialTasks, TEST_STORAGE_KEY);

      const { result } = renderHook(() => useTasks(TEST_STORAGE_KEY));

      act(() => {
        result.current.deleteTask('mon-2');
      });

      const monTasks = result.current.getTasksByDay('mon');
      expect(monTasks).toHaveLength(2);
      expect(monTasks[0].id).toBe('mon-1');
      expect(monTasks[0].order).toBe(0);
      expect(monTasks[1].id).toBe('mon-3');
      expect(monTasks[1].order).toBe(1);

      const tueTasks = result.current.getTasksByDay('tue');
      expect(tueTasks).toHaveLength(1);
      expect(tueTasks[0].id).toBe('tue-1');
      expect(tueTasks[0].order).toBe(0);
    });

    it('nie wykonuje zmian dla nieistniejącego ID', () => {
      const { result } = renderHook(() => useTasks(TEST_STORAGE_KEY));

      act(() => {
        result.current.addTask('Zadanie');
      });

      act(() => {
        result.current.deleteTask('non-existent');
      });

      expect(result.current.tasks).toHaveLength(1);
    });
  });

  describe('moveTask (Reordering i zmiana kolumn)', () => {
    it('zmienia kolejność zadań w obrębie tej samej kolumny (w dół)', () => {
      const tasks: Task[] = [
        createMockTask({ id: 't-0', title: 'T0', day: 'mon', order: 0 }),
        createMockTask({ id: 't-1', title: 'T1', day: 'mon', order: 1 }),
        createMockTask({ id: 't-2', title: 'T2', day: 'mon', order: 2 }),
      ];
      saveTasksToStorage(tasks, TEST_STORAGE_KEY);

      const { result } = renderHook(() => useTasks(TEST_STORAGE_KEY));

      // Przesuwamy t-0 na pozycję 2 (na sam dół)
      act(() => {
        result.current.moveTask('t-0', 'mon', 2);
      });

      const monTasks = result.current.getTasksByDay('mon');
      expect(monTasks.map((t) => t.id)).toEqual(['t-1', 't-2', 't-0']);
      expect(monTasks.map((t) => t.order)).toEqual([0, 1, 2]);

      const stored = loadTasksFromStorage(TEST_STORAGE_KEY);
      const storedMon = stored.filter((t) => t.day === 'mon').sort((a, b) => a.order - b.order);
      expect(storedMon.map((t) => t.id)).toEqual(['t-1', 't-2', 't-0']);
    });

    it('zmienia kolejność zadań w obrębie tej samej kolumny (w górę)', () => {
      const tasks: Task[] = [
        createMockTask({ id: 't-0', title: 'T0', day: 'mon', order: 0 }),
        createMockTask({ id: 't-1', title: 'T1', day: 'mon', order: 1 }),
        createMockTask({ id: 't-2', title: 'T2', day: 'mon', order: 2 }),
      ];
      saveTasksToStorage(tasks, TEST_STORAGE_KEY);

      const { result } = renderHook(() => useTasks(TEST_STORAGE_KEY));

      // Przesuwamy t-2 na pozycję 0 (na samą górę)
      act(() => {
        result.current.moveTask('t-2', 'mon', 0);
      });

      const monTasks = result.current.getTasksByDay('mon');
      expect(monTasks.map((t) => t.id)).toEqual(['t-2', 't-0', 't-1']);
      expect(monTasks.map((t) => t.order)).toEqual([0, 1, 2]);
    });

    it('zmienia kolejność w Backlogu (day: null)', () => {
      const tasks: Task[] = [
        createMockTask({ id: 'b-0', title: 'B0', day: null, order: 0 }),
        createMockTask({ id: 'b-1', title: 'B1', day: null, order: 1 }),
      ];
      saveTasksToStorage(tasks, TEST_STORAGE_KEY);

      const { result } = renderHook(() => useTasks(TEST_STORAGE_KEY));

      act(() => {
        result.current.moveTask('b-1', null, 0);
      });

      expect(result.current.backlogTasks.map((t) => t.id)).toEqual(['b-1', 'b-0']);
      expect(result.current.backlogTasks.map((t) => t.order)).toEqual([0, 1]);
    });

    it('przenosi zadanie z Backlogu do dnia tygodnia na wskazaną pozycję', () => {
      const tasks: Task[] = [
        createMockTask({ id: 'backlog-1', title: 'Zadanie Backlog', day: null, order: 0 }),
        createMockTask({ id: 'wed-1', title: 'Środa 1', day: 'wed', order: 0 }),
        createMockTask({ id: 'wed-2', title: 'Środa 2', day: 'wed', order: 1 }),
      ];
      saveTasksToStorage(tasks, TEST_STORAGE_KEY);

      const { result } = renderHook(() => useTasks(TEST_STORAGE_KEY));

      // Przenosimy backlog-1 do środy na pozycję 1 (pomiędzy wed-1 a wed-2)
      act(() => {
        result.current.moveTask('backlog-1', 'wed', 1);
      });

      expect(result.current.backlogTasks).toHaveLength(0);

      const wedTasks = result.current.getTasksByDay('wed');
      expect(wedTasks).toHaveLength(3);
      expect(wedTasks[0].id).toBe('wed-1');
      expect(wedTasks[0].order).toBe(0);
      expect(wedTasks[1].id).toBe('backlog-1');
      expect(wedTasks[1].order).toBe(1);
      expect(wedTasks[1].day).toBe('wed');
      expect(wedTasks[2].id).toBe('wed-2');
      expect(wedTasks[2].order).toBe(2);
    });

    it('przenosi zadanie z jednego dnia roboczego do innego i normalizuje obie kolumny', () => {
      const tasks: Task[] = [
        createMockTask({ id: 'mon-1', title: 'Pon 1', day: 'mon', order: 0 }),
        createMockTask({ id: 'mon-2', title: 'Pon 2', day: 'mon', order: 1 }),
        createMockTask({ id: 'fri-1', title: 'Pt 1', day: 'fri', order: 0 }),
      ];
      saveTasksToStorage(tasks, TEST_STORAGE_KEY);

      const { result } = renderHook(() => useTasks(TEST_STORAGE_KEY));

      // Przenosimy mon-1 do piątku na początek (pozycja 0)
      act(() => {
        result.current.moveTask('mon-1', 'fri', 0);
      });

      // Kolumna poniedziałku powinna mieć teraz 1 zadanie z order: 0
      const monTasks = result.current.getTasksByDay('mon');
      expect(monTasks).toHaveLength(1);
      expect(monTasks[0].id).toBe('mon-2');
      expect(monTasks[0].order).toBe(0);

      // Kolumna piątku powinna mieć 2 zadania z order: 0 i 1
      const friTasks = result.current.getTasksByDay('fri');
      expect(friTasks).toHaveLength(2);
      expect(friTasks[0].id).toBe('mon-1');
      expect(friTasks[0].order).toBe(0);
      expect(friTasks[0].day).toBe('fri');
      expect(friTasks[1].id).toBe('fri-1');
      expect(friTasks[1].order).toBe(1);
    });

    it('przenosi zadanie do pustej kolumny, przypisując order: 0', () => {
      const tasks: Task[] = [
        createMockTask({ id: 'sat-1', title: 'Sobota 1', day: 'sat', order: 0 }),
      ];
      saveTasksToStorage(tasks, TEST_STORAGE_KEY);

      const { result } = renderHook(() => useTasks(TEST_STORAGE_KEY));

      act(() => {
        result.current.moveTask('sat-1', 'sun', 0);
      });

      expect(result.current.getTasksByDay('sat')).toHaveLength(0);
      const sunTasks = result.current.getTasksByDay('sun');
      expect(sunTasks).toHaveLength(1);
      expect(sunTasks[0].id).toBe('sat-1');
      expect(sunTasks[0].day).toBe('sun');
      expect(sunTasks[0].order).toBe(0);
    });

    it('prawidłowo ogranicza (clamping) newOrder poniżej zera i powyżej liczby zadań', () => {
      const tasks: Task[] = [
        createMockTask({ id: 't-1', title: 'T1', day: 'mon', order: 0 }),
        createMockTask({ id: 't-2', title: 'T2', day: 'mon', order: 1 }),
      ];
      saveTasksToStorage(tasks, TEST_STORAGE_KEY);

      const { result } = renderHook(() => useTasks(TEST_STORAGE_KEY));

      // newOrder = -10 -> powinno ograniczyć do 0
      act(() => {
        result.current.moveTask('t-2', 'mon', -10);
      });
      expect(result.current.getTasksByDay('mon')[0].id).toBe('t-2');
      expect(result.current.getTasksByDay('mon')[0].order).toBe(0);

      // newOrder = 999 -> powinno ograniczyć do końca
      act(() => {
        result.current.moveTask('t-2', 'mon', 999);
      });
      expect(result.current.getTasksByDay('mon')[1].id).toBe('t-2');
      expect(result.current.getTasksByDay('mon')[1].order).toBe(1);
    });

    it('nie wykonuje zmian, jeśli ID nie istnieje', () => {
      const tasks: Task[] = [
        createMockTask({ id: 't-1', title: 'T1', day: 'mon', order: 0 }),
      ];
      saveTasksToStorage(tasks, TEST_STORAGE_KEY);

      const { result } = renderHook(() => useTasks(TEST_STORAGE_KEY));

      act(() => {
        result.current.moveTask('non-existent', 'tue', 0);
      });

      expect(result.current.getTasksByDay('mon')).toHaveLength(1);
      expect(result.current.getTasksByDay('tue')).toHaveLength(0);
    });
  });

  describe('returnToBacklog', () => {
    it('przenosi zadanie z dnia roboczego na koniec Backlogu i normalizuje dzień źródłowy', () => {
      const tasks: Task[] = [
        createMockTask({ id: 'backlog-0', title: 'B0', day: null, order: 0 }),
        createMockTask({ id: 'thu-1', title: 'Czw 1', day: 'thu', order: 0 }),
        createMockTask({ id: 'thu-2', title: 'Czw 2', day: 'thu', order: 1 }),
      ];
      saveTasksToStorage(tasks, TEST_STORAGE_KEY);

      const { result } = renderHook(() => useTasks(TEST_STORAGE_KEY));

      // Przenosimy thu-1 z czwartku do Backlogu
      act(() => {
        result.current.returnToBacklog('thu-1');
      });

      // Czwartkowe zadania znormalizowane
      const thuTasks = result.current.getTasksByDay('thu');
      expect(thuTasks).toHaveLength(1);
      expect(thuTasks[0].id).toBe('thu-2');
      expect(thuTasks[0].order).toBe(0);

      // Backlog ma teraz 2 zadania, thu-1 jest na końcu
      expect(result.current.backlogTasks).toHaveLength(2);
      expect(result.current.backlogTasks[0].id).toBe('backlog-0');
      expect(result.current.backlogTasks[0].order).toBe(0);
      expect(result.current.backlogTasks[1].id).toBe('thu-1');
      expect(result.current.backlogTasks[1].day).toBeNull();
      expect(result.current.backlogTasks[1].order).toBe(1);

      // Sprawdzenie zapisu w LocalStorage
      const stored = loadTasksFromStorage(TEST_STORAGE_KEY);
      const storedBacklog = stored.filter((t) => t.day === null).sort((a, b) => a.order - b.order);
      expect(storedBacklog.map((t) => t.id)).toEqual(['backlog-0', 'thu-1']);
    });

    it('nie wykonuje zmian, jeśli zadanie już znajduje się w Backlogu', () => {
      const tasks: Task[] = [
        createMockTask({ id: 'backlog-0', title: 'B0', day: null, order: 0 }),
      ];
      saveTasksToStorage(tasks, TEST_STORAGE_KEY);

      const { result } = renderHook(() => useTasks(TEST_STORAGE_KEY));

      act(() => {
        result.current.returnToBacklog('backlog-0');
      });

      expect(result.current.backlogTasks).toHaveLength(1);
      expect(result.current.backlogTasks[0].order).toBe(0);
    });

    it('nie wykonuje zmian dla nieistniejącego ID', () => {
      const { result } = renderHook(() => useTasks(TEST_STORAGE_KEY));

      act(() => {
        result.current.returnToBacklog('not-found');
      });

      expect(result.current.tasks).toHaveLength(0);
    });
  });

  describe('returnOverdueToBacklog', () => {
    it('przenosi wszystkie niewykonane zadania z wybranego dnia na koniec Backlogu', () => {
      const tasks: Task[] = [
        createMockTask({ id: 'backlog-0', title: 'B0', day: null, order: 0 }),
        createMockTask({ id: 'mon-1', title: 'Pon 1', day: 'mon', status: 'todo', order: 0 }),
        createMockTask({ id: 'mon-2', title: 'Pon 2', day: 'mon', status: 'todo', order: 1 }),
      ];
      saveTasksToStorage(tasks, TEST_STORAGE_KEY);

      const { result } = renderHook(() => useTasks(TEST_STORAGE_KEY));

      act(() => {
        result.current.returnOverdueToBacklog('mon');
      });

      // Poniedziałek jest pusty
      expect(result.current.getTasksByDay('mon')).toHaveLength(0);

      // Backlog ma 3 zadania w prawidłowej kolejności
      const backlog = result.current.backlogTasks;
      expect(backlog).toHaveLength(3);
      expect(backlog[0].id).toBe('backlog-0');
      expect(backlog[0].order).toBe(0);

      expect(backlog[1].id).toBe('mon-1');
      expect(backlog[1].day).toBeNull();
      expect(backlog[1].order).toBe(1);

      expect(backlog[2].id).toBe('mon-2');
      expect(backlog[2].day).toBeNull();
      expect(backlog[2].order).toBe(2);

      // Zapis w LocalStorage
      const stored = loadTasksFromStorage(TEST_STORAGE_KEY);
      expect(stored.filter((t) => t.day === null)).toHaveLength(3);
    });

    it('pozostawia zadania wykonane (done) w danym dniu i normalizuje ich indeksy order', () => {
      const tasks: Task[] = [
        createMockTask({ id: 'tue-todo-1', title: 'Wt Todo 1', day: 'tue', status: 'todo', order: 0 }),
        createMockTask({ id: 'tue-done-1', title: 'Wt Done 1', day: 'tue', status: 'done', order: 1 }),
        createMockTask({ id: 'tue-todo-2', title: 'Wt Todo 2', day: 'tue', status: 'todo', order: 2 }),
        createMockTask({ id: 'tue-done-2', title: 'Wt Done 2', day: 'tue', status: 'done', order: 3 }),
      ];
      saveTasksToStorage(tasks, TEST_STORAGE_KEY);

      const { result } = renderHook(() => useTasks(TEST_STORAGE_KEY));

      act(() => {
        result.current.returnOverdueToBacklog('tue');
      });

      // We wtorku zostają tylko wykonane zadania, znormalizowane od 0
      const tueTasks = result.current.getTasksByDay('tue');
      expect(tueTasks).toHaveLength(2);
      expect(tueTasks[0].id).toBe('tue-done-1');
      expect(tueTasks[0].order).toBe(0);
      expect(tueTasks[1].id).toBe('tue-done-2');
      expect(tueTasks[1].order).toBe(1);

      // Backlog otrzymuje zadania niewykonane
      const backlog = result.current.backlogTasks;
      expect(backlog).toHaveLength(2);
      expect(backlog[0].id).toBe('tue-todo-1');
      expect(backlog[0].order).toBe(0);
      expect(backlog[1].id).toBe('tue-todo-2');
      expect(backlog[1].order).toBe(1);
    });

    it('nie wykonuje zmian, jeśli w danym dniu wszystkie zadania są już wykonane', () => {
      const tasks: Task[] = [
        createMockTask({ id: 'wed-done-1', title: 'Śr Done 1', day: 'wed', status: 'done', order: 0 }),
      ];
      saveTasksToStorage(tasks, TEST_STORAGE_KEY);

      const { result } = renderHook(() => useTasks(TEST_STORAGE_KEY));

      act(() => {
        result.current.returnOverdueToBacklog('wed');
      });

      expect(result.current.getTasksByDay('wed')).toHaveLength(1);
      expect(result.current.backlogTasks).toHaveLength(0);
    });

    it('nie wykonuje zmian, jeśli w wybranym dniu brak jakichkolwiek zadań', () => {
      const { result } = renderHook(() => useTasks(TEST_STORAGE_KEY));

      act(() => {
        result.current.returnOverdueToBacklog('fri');
      });

      expect(result.current.tasks).toHaveLength(0);
      expect(result.current.backlogTasks).toHaveLength(0);
    });
  });

  describe('clearTasks i setTasks', () => {
    it('clearTasks czyści stan aplikacji i usuwa dane z LocalStorage', () => {
      const initialTask = createMockTask({
        id: 't-1',
        title: 'Do wyczyszczenia',
        day: null,
        order: 0,
      });
      saveTasksToStorage([initialTask], TEST_STORAGE_KEY);

      const { result } = renderHook(() => useTasks(TEST_STORAGE_KEY));
      expect(result.current.tasks).toHaveLength(1);

      act(() => {
        result.current.clearTasks();
      });

      expect(result.current.tasks).toHaveLength(0);
      expect(loadTasksFromStorage(TEST_STORAGE_KEY)).toHaveLength(0);
    });

    it('setTasks pozwala na masową wymianę bazy i synchronizuje do LocalStorage', () => {
      const { result } = renderHook(() => useTasks(TEST_STORAGE_KEY));

      const newTasks: Task[] = [
        createMockTask({ id: 'imported-1', title: 'Zaimportowane', status: 'done', priority: 'high', day: 'fri', order: 0 }),
      ];

      act(() => {
        result.current.setTasks(newTasks);
      });

      expect(result.current.tasks).toEqual(newTasks);
      expect(loadTasksFromStorage(TEST_STORAGE_KEY)).toEqual(newTasks);
    });
  });

  describe('Synchronizacja wielu kart (StorageEvent)', () => {
    it('aktualizuje stan po odebraniu StorageEvent z innego okna dla tego samego klucza', () => {
      const { result } = renderHook(() => useTasks(TEST_STORAGE_KEY));
      expect(result.current.tasks).toHaveLength(0);

      const externalTask = createMockTask({
        id: 'external-1',
        title: 'Zadanie z innej karty',
        priority: 'high',
        day: 'mon',
        order: 0,
      });

      // Zapis w LocalStorage i emisja zdarzenia storage
      saveTasksToStorage([externalTask], TEST_STORAGE_KEY);

      act(() => {
        const event = new StorageEvent('storage', {
          key: TEST_STORAGE_KEY,
          newValue: JSON.stringify([externalTask]),
        });
        window.dispatchEvent(event);
      });

      expect(result.current.tasks).toHaveLength(1);
      expect(result.current.tasks[0].id).toBe('external-1');
    });

    it('ignoruje StorageEvent dla innego klucza pamięci', () => {
      const { result } = renderHook(() => useTasks(TEST_STORAGE_KEY));

      act(() => {
        const event = new StorageEvent('storage', {
          key: 'some_other_key',
          newValue: '[]',
        });
        window.dispatchEvent(event);
      });

      expect(result.current.tasks).toHaveLength(0);
    });
  });
});
