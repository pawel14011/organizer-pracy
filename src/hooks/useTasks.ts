import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import type { Task, DayOfWeek, Weekday, Priority, TaskStatus } from '../types';
import { DEFAULT_TASKS_STORAGE_KEY, loadTasksFromStorage, saveTasksToStorage, clearTasksFromStorage } from '../utils/storage';

/**
 * Re-eksport algorytmu zmiany kolejności elementów w tablicy z @dnd-kit/sortable.
 * Przesuwa element z indeksu `from` na indeks `to` bez mutacji tablicy źródłowej.
 */
export { arrayMove };

/**
 * Bezpieczne generowanie identyfikatora UUID v4.
 * Wykorzystuje natywne API `crypto.randomUUID()`.
 */
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Mapa rotacji priorytetów zadań:
 * 'low' -> 'medium' -> 'high' -> 'low'.
 */
const NEXT_PRIORITY: Record<Priority, Priority> = {
  low: 'medium',
  medium: 'high',
  high: 'low',
};

/**
 * Opcje konfiguracyjne dla hooka useTasks.
 */
export interface UseTasksOptions {
  /** Niestandardowy klucz LocalStorage (domyślnie DEFAULT_TASKS_STORAGE_KEY) */
  storageKey?: string;
  /** Opcjonalne początkowe zadania do zainicjalizowania stanu */
  initialTasks?: Task[];
}

/**
 * Zestaw metod i właściwości udostępnianych przez hook useTasks.
 */
export interface UseTasksReturn {
  /** Pełna lista wszystkich zadań w systemie */
  tasks: Task[];
  /** Zadania znajdujące się w Backlogu (day: null), posortowane wg kolejności (order) */
  backlogTasks: Task[];
  /** Zwraca zadania dla wskazanego dnia tygodnia (lub Backlogu), posortowane wg order */
  getTasksByDay: (day: DayOfWeek) => Task[];
  /** Dodaje nowe zadanie do Backlogu z domyślnym priorytetem średnim */
  addTask: (title: string) => Task | null;
  /** Aktualizuje wybrane pola zadania o wskazanym ID */
  updateTask: (id: string, updates: Partial<Pick<Task, 'title' | 'priority' | 'status'>>) => void;
  /** Przełącza status realizacji zadania między 'todo' a 'done' */
  toggleTaskStatus: (id: string) => void;
  /** Rotuje priorytet zadania: low -> medium -> high -> low */
  cycleTaskPriority: (id: string) => void;
  /** Usuwa zadanie o wskazanym ID i normalizuje indeksy pozostałych zadań w kolumnie */
  deleteTask: (id: string) => void;
  /** Zmienia kolumnę i/lub kolejność zadania (reordering) */
  moveTask: (taskId: string, targetDay: DayOfWeek, newOrder: number) => void;
  /** Przenosi zadanie z kolumny dnia z powrotem do Backlogu */
  returnToBacklog: (taskId: string) => void;
  /** Przenosi wszystkie niewykonane (zaległe) zadania ze wskazanego dnia do Backlogu */
  returnOverdueToBacklog: (day: Weekday) => void;
  /** Bezpośrednia modyfikacja pełnej listy zadań (np. przy imporcie kopii zapasowej) */
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  /** Czyści wszystkie zadania ze stanu oraz z pamięci LocalStorage */
  clearTasks: () => void;
}

/**
 * Centralny hook zarządzania stanem zadań w aplikacji Organizer Pracy.
 *
 * Zapewnia:
 * - Automatyczną synchronizację z pamięcią LocalStorage przy każdej mutacji.
 * - Bezpieczne przeliczanie i normalizację indeksów kolejności (`order`).
 * - Stabilne referencje metod poprzez `useCallback`.
 *
 * @param optionsOrKey Opcjonalny klucz storage (string) lub obiekt opcji UseTasksOptions
 * @returns Obiekt UseTasksReturn ze stanem i operacjami biznesowymi
 */
export function useTasks(optionsOrKey?: string | UseTasksOptions): UseTasksReturn {
  const options: UseTasksOptions = useMemo(() => {
    if (typeof optionsOrKey === 'string') {
      return { storageKey: optionsOrKey };
    }
    return optionsOrKey ?? {};
  }, [optionsOrKey]);

  const storageKey = options.storageKey ?? DEFAULT_TASKS_STORAGE_KEY;

  // Inicjalizacja stanu: z options.initialTasks jeśli przekazano, w przeciwnym razie z LocalStorage
  const [tasks, setTasksState] = useState<Task[]>(() => {
    if (options.initialTasks !== undefined) {
      return options.initialTasks;
    }
    return loadTasksFromStorage(storageKey);
  });

  // Referencja do aktualnego stanu zadań (gwarantuje natychmiastowy dostęp podczas synchronicznych wywołań w tej samej fazie)
  const tasksRef = useRef<Task[]>(tasks);
  tasksRef.current = tasks;

  // Opakowanie setTasks aktualizujące referencję zadań
  const setTasks: React.Dispatch<React.SetStateAction<Task[]>> = useCallback((action) => {
    setTasksState((prev) => {
      const next = typeof action === 'function' ? action(prev) : action;
      tasksRef.current = next;
      return next;
    });
  }, []);

  // Flaga pierwszego montowania, zapobiegająca nadpisywaniu storage identycznymi danymi przy starcie
  const isMountedRef = useRef(false);

  // Synchronizacja zmian stanu do LocalStorage
  useEffect(() => {
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      if (options.initialTasks !== undefined) {
        saveTasksToStorage(tasks, storageKey);
      }
      return;
    }

    saveTasksToStorage(tasks, storageKey);
  }, [tasks, storageKey, options.initialTasks]);

  // Synchronizacja między oknami/kartami przeglądarki poprzez zdarzenie 'storage'
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === storageKey && event.newValue !== null) {
        const reloadedTasks = loadTasksFromStorage(storageKey);
        setTasks(reloadedTasks);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [storageKey, setTasks]);

  /**
   * Zwraca zadania dla danej kolumny (lub Backlogu), posortowane rosnąco według właściwości order.
   */
  const getTasksByDay = useCallback(
    (day: DayOfWeek): Task[] => {
      return tasks
        .filter((task) => task.day === day)
        .sort((a, b) => a.order - b.order);
    },
    [tasks]
  );

  /**
   * Zadania Backlogu (day: null), posortowane rosnąco według kolejności order.
   */
  const backlogTasks = useMemo(() => {
    return tasks
      .filter((task) => task.day === null)
      .sort((a, b) => a.order - b.order);
  }, [tasks]);

  /**
   * Dodaje nowe zadanie do Backlogu (day: null) z domyślnym priorytetem 'medium'.
   * Odrzuca puste tytuły (po usunięciu białych znaków) i zwraca null.
   */
  const addTask = useCallback((title: string): Task | null => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      return null;
    }

    // Limit długości tytułu zgodnie z wytycznymi bezpieczeństwa (do 500 znaków)
    const sanitizedTitle = trimmedTitle.slice(0, 500);
    const id = generateUUID();
    const createdAt = new Date().toISOString();

    const currentBacklog = tasksRef.current
      .filter((task) => task.day === null)
      .sort((a, b) => a.order - b.order);

    const createdTask: Task = {
      id,
      title: sanitizedTitle,
      status: 'todo',
      priority: 'medium',
      day: null,
      order: currentBacklog.length,
      createdAt,
    };

    setTasksState((prevTasks) => {
      const backlogInPrev = prevTasks
        .filter((task) => task.day === null)
        .sort((a, b) => a.order - b.order);

      const taskToAppend: Task = {
        ...createdTask,
        order: backlogInPrev.length,
      };

      const nextTasks = [...prevTasks, taskToAppend];
      tasksRef.current = nextTasks;
      return nextTasks;
    });

    return createdTask;
  }, []);

  /**
   * Aktualizuje pola zadania (tytuł, priorytet, status).
   */
  const updateTask = useCallback(
    (id: string, updates: Partial<Pick<Task, 'title' | 'priority' | 'status'>>) => {
      setTasksState((prevTasks) => {
        const taskIndex = prevTasks.findIndex((task) => task.id === id);
        if (taskIndex === -1) {
          return prevTasks;
        }

        const currentTask = prevTasks[taskIndex];
        let nextTitle = currentTask.title;

        if (updates.title !== undefined) {
          const trimmed = updates.title.trim();
          if (trimmed.length > 0) {
            nextTitle = trimmed.slice(0, 500);
          }
        }

        let nextPriority = currentTask.priority;
        if (
          updates.priority !== undefined &&
          (updates.priority === 'low' || updates.priority === 'medium' || updates.priority === 'high')
        ) {
          nextPriority = updates.priority;
        }

        let nextStatus = currentTask.status;
        if (
          updates.status !== undefined &&
          (updates.status === 'todo' || updates.status === 'done')
        ) {
          nextStatus = updates.status;
        }

        const updatedTask: Task = {
          ...currentTask,
          title: nextTitle,
          priority: nextPriority,
          status: nextStatus,
        };

        const newTasks = [...prevTasks];
        newTasks[taskIndex] = updatedTask;
        tasksRef.current = newTasks;
        return newTasks;
      });
    },
    []
  );

  /**
   * Przełącza status realizacji zadania: 'todo' <-> 'done'.
   */
  const toggleTaskStatus = useCallback((id: string) => {
    setTasksState((prevTasks) => {
      const taskIndex = prevTasks.findIndex((task) => task.id === id);
      if (taskIndex === -1) {
        return prevTasks;
      }

      const currentTask = prevTasks[taskIndex];
      const nextStatus: TaskStatus = currentTask.status === 'done' ? 'todo' : 'done';

      const updatedTask: Task = {
        ...currentTask,
        status: nextStatus,
      };

      const newTasks = [...prevTasks];
      newTasks[taskIndex] = updatedTask;
      tasksRef.current = newTasks;
      return newTasks;
    });
  }, []);

  /**
   * Rotuje priorytet zadania: low -> medium -> high -> low.
   */
  const cycleTaskPriority = useCallback((id: string) => {
    setTasksState((prevTasks) => {
      const taskIndex = prevTasks.findIndex((task) => task.id === id);
      if (taskIndex === -1) {
        return prevTasks;
      }

      const currentTask = prevTasks[taskIndex];
      const nextPriority = NEXT_PRIORITY[currentTask.priority] ?? 'medium';

      const updatedTask: Task = {
        ...currentTask,
        priority: nextPriority,
      };

      const newTasks = [...prevTasks];
      newTasks[taskIndex] = updatedTask;
      tasksRef.current = newTasks;
      return newTasks;
    });
  }, []);

  /**
   * Usuwa zadanie o wskazanym ID i automatycznie normalizuje indeksy kolejności (order)
   * pozostałych zadań w tej samej kolumnie, eliminując luki w numeracji.
   */
  const deleteTask = useCallback((id: string) => {
    setTasksState((prevTasks) => {
      const taskToDelete = prevTasks.find((task) => task.id === id);
      if (!taskToDelete) {
        return prevTasks;
      }

      const affectedDay = taskToDelete.day;
      const remainingInColumn = prevTasks
        .filter((task) => task.day === affectedDay && task.id !== id)
        .sort((a, b) => a.order - b.order)
        .map((task, index) => ({
          ...task,
          order: index,
        }));

      const unaffectedTasks = prevTasks.filter((task) => task.day !== affectedDay);
      const newTasks = [...unaffectedTasks, ...remainingInColumn];
      tasksRef.current = newTasks;
      return newTasks;
    });
  }, []);

  /**
   * Zmienia kolumnę i/lub pozycję zadania w kolumnie (Drag & Drop reordering).
   *
   * Gwarantuje:
   * - Ograniczenie wartości `newOrder` do dozwolonego zakresu (clamping).
   * - Ciągłość i spójność indeksów `order` (0, 1, 2, ...) w kolumnie źródłowej i docelowej.
   * - Brak wpływu na kolejność i właściwości zadań w innych kolumnach.
   */
  const moveTask = useCallback(
    (taskId: string, targetDay: DayOfWeek, newOrder: number) => {
      setTasksState((prevTasks) => {
        const movingTask = prevTasks.find((task) => task.id === taskId);
        if (!movingTask) {
          return prevTasks;
        }

        const sourceDay = movingTask.day;

        // Przypadek A: Zmiana kolejności w obrębie tej samej kolumny
        if (sourceDay === targetDay) {
          const columnTasks = prevTasks
            .filter((task) => task.day === sourceDay)
            .sort((a, b) => a.order - b.order);

          const oldIndex = columnTasks.findIndex((task) => task.id === taskId);
          if (oldIndex === -1) {
            return prevTasks;
          }

          const clampedTargetIndex = Math.max(0, Math.min(newOrder, columnTasks.length - 1));
          if (oldIndex === clampedTargetIndex) {
            return prevTasks;
          }

          const reordered = arrayMove(columnTasks, oldIndex, clampedTargetIndex);
          const normalizedColumn = reordered.map((task, index) => ({
            ...task,
            order: index,
          }));

          const unaffectedTasks = prevTasks.filter((task) => task.day !== sourceDay);
          const newTasks = [...unaffectedTasks, ...normalizedColumn];
          tasksRef.current = newTasks;
          return newTasks;
        }

        // Przypadek B: Przeniesienie zadania do innej kolumny (lub między dniem a Backlogiem)
        const sourceColumnTasks = prevTasks
          .filter((task) => task.day === sourceDay && task.id !== taskId)
          .sort((a, b) => a.order - b.order)
          .map((task, index) => ({
            ...task,
            order: index,
          }));

        const targetColumnTasks = prevTasks
          .filter((task) => task.day === targetDay)
          .sort((a, b) => a.order - b.order);

        const clampedTargetIndex = Math.max(0, Math.min(newOrder, targetColumnTasks.length));

        const updatedMovingTask: Task = {
          ...movingTask,
          day: targetDay,
          order: clampedTargetIndex,
        };

        const combinedTargetColumn = [
          ...targetColumnTasks.slice(0, clampedTargetIndex),
          updatedMovingTask,
          ...targetColumnTasks.slice(clampedTargetIndex),
        ].map((task, index) => ({
          ...task,
          order: index,
        }));

        const unaffectedTasks = prevTasks.filter(
          (task) => task.day !== sourceDay && task.day !== targetDay
        );

        const newTasks = [...unaffectedTasks, ...sourceColumnTasks, ...combinedTargetColumn];
        tasksRef.current = newTasks;
        return newTasks;
      });
    },
    []
  );

  /**
   * Przenosi zadanie z kolumny dnia z powrotem do Backlogu (day: null).
   * Zadanie zostaje umieszczone na końcu listy Backlogu, a indeksy dnia źródłowego
   * zostają znormalizowane. Jeśli zadanie już jest w Backlogu, operacja nic nie zmienia.
   */
  const returnToBacklog = useCallback((taskId: string) => {
    setTasksState((prevTasks) => {
      const task = prevTasks.find((t) => t.id === taskId);
      if (!task || task.day === null) {
        return prevTasks;
      }

      const sourceDay = task.day;
      const sourceColumnTasks = prevTasks
        .filter((t) => t.day === sourceDay && t.id !== taskId)
        .sort((a, b) => a.order - b.order)
        .map((t, index) => ({
          ...t,
          order: index,
        }));

      const backlogTasks = prevTasks
        .filter((t) => t.day === null)
        .sort((a, b) => a.order - b.order);

      const returnedTask: Task = {
        ...task,
        day: null,
        order: backlogTasks.length,
      };

      const newBacklogList = [...backlogTasks, returnedTask];
      const unaffectedTasks = prevTasks.filter(
        (t) => t.day !== sourceDay && t.day !== null
      );

      const newTasks = [...unaffectedTasks, ...sourceColumnTasks, ...newBacklogList];
      tasksRef.current = newTasks;
      return newTasks;
    });
  }, []);

  /**
   * Przenosi wszystkie niewykonane zadania (status !== 'done') z wybranego dnia
   * z powrotem do Backlogu (day: null).
   *
   * Gwarantuje:
   * - Zadania trafiają na koniec listy Backlogu z zachowaniem ich dotychczasowej względnej kolejności.
   * - Zadania wykonane ('done') pozostają w danym dniu, a ich indeksy order zostają znormalizowane.
   * - Brak mutacji innych dni i kolumn.
   * - Jeśli w danym dniu nie ma niewykonanych zadań, stan nie ulega zmianie.
   */
  const returnOverdueToBacklog = useCallback((day: Weekday) => {
    setTasksState((prevTasks) => {
      const dayTasksToReturn = prevTasks
        .filter((t) => t.day === day && t.status !== 'done')
        .sort((a, b) => a.order - b.order);

      if (dayTasksToReturn.length === 0) {
        return prevTasks;
      }

      const remainingInDay = prevTasks
        .filter((t) => t.day === day && t.status === 'done')
        .sort((a, b) => a.order - b.order)
        .map((t, index) => ({
          ...t,
          order: index,
        }));

      const backlogTasks = prevTasks
        .filter((t) => t.day === null)
        .sort((a, b) => a.order - b.order);

      const returnedTasks: Task[] = dayTasksToReturn.map((t, index) => ({
        ...t,
        day: null,
        order: backlogTasks.length + index,
      }));

      const unaffectedTasks = prevTasks.filter(
        (t) => t.day !== day && t.day !== null
      );

      const newTasks = [
        ...unaffectedTasks,
        ...remainingInDay,
        ...backlogTasks,
        ...returnedTasks,
      ];

      tasksRef.current = newTasks;
      return newTasks;
    });
  }, []);

  /**
   * Czyści listę zadań ze stanu i usuwa powiązany wpis z pamięci LocalStorage.
   */
  const clearTasks = useCallback(() => {
    setTasks([]);
    clearTasksFromStorage(storageKey);
  }, [storageKey, setTasks]);

  return {
    tasks,
    backlogTasks,
    getTasksByDay,
    addTask,
    updateTask,
    toggleTaskStatus,
    cycleTaskPriority,
    deleteTask,
    moveTask,
    returnToBacklog,
    returnOverdueToBacklog,
    setTasks,
    clearTasks,
  };
}
