import type { Task } from '../types';
import { WEEKDAYS } from '../constants';

/**
 * Domyślny klucz LocalStorage dla zadań Organizera Pracy.
 */
export const DEFAULT_TASKS_STORAGE_KEY = 'organizer_tasks';

/**
 * Strażnik typu (type guard) sprawdzający, czy dany obiekt spełnia kryteria modelu Task.
 *
 * Weryfikuje:
 * - id: niepusty ciąg znaków
 * - title: niepusty ciąg znaków (po odcięciu białych znaków)
 * - status: 'todo' | 'done'
 * - priority: 'low' | 'medium' | 'high'
 * - day: 'mon' ... 'sun' | null
 * - order: nieujemna liczba całkowita (>= 0)
 * - createdAt: poprawny format daty ISO
 *
 * @param value Dowolna wartość do weryfikacji
 * @returns true jeśli wartość jest poprawnym obiektem Task, w przeciwnym razie false
 */
export function isTask(value: unknown): value is Task {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  const hasValidId =
    typeof candidate.id === 'string' && candidate.id.trim().length > 0;
  const hasValidTitle =
    typeof candidate.title === 'string' && candidate.title.trim().length > 0;
  const hasValidStatus =
    candidate.status === 'todo' || candidate.status === 'done';
  const hasValidPriority =
    candidate.priority === 'low' ||
    candidate.priority === 'medium' ||
    candidate.priority === 'high';
  const hasValidDay =
    candidate.day === null ||
    (typeof candidate.day === 'string' &&
      (WEEKDAYS as readonly string[]).includes(candidate.day));
  const hasValidOrder =
    typeof candidate.order === 'number' &&
    Number.isInteger(candidate.order) &&
    candidate.order >= 0;
  const hasValidCreatedAt =
    typeof candidate.createdAt === 'string' &&
    !isNaN(Date.parse(candidate.createdAt));

  return (
    hasValidId &&
    hasValidTitle &&
    hasValidStatus &&
    hasValidPriority &&
    hasValidDay &&
    hasValidOrder &&
    hasValidCreatedAt
  );
}

/**
 * Bezpieczny odczyt zadań z pamięci LocalStorage.
 *
 * Obsługuje przypadki brzegowe:
 * - brak danych lub pusty ciąg -> zwraca pustą tablicę []
 * - niepoprawny JSON (SyntaxError) -> loguje ostrzeżenie i zwraca pustą tablicę []
 * - dane niebędące tablicą (np. null, obiekt, liczba, ciąg znaków) -> loguje precyzyjne ostrzeżenie i zwraca []
 * - uszkodzone elementy wewnątrz tablicy -> odrzuca wadliwe rekordy, zachowuje poprawne i loguje ostrzeżenie
 * - błąd dostępu do LocalStorage (np. tryb incognito, SecurityError) -> loguje ostrzeżenie i zwraca pustą tablicę []
 *
 * @param key Opcjonalny klucz w LocalStorage (domyślnie DEFAULT_TASKS_STORAGE_KEY)
 * @returns Tablica zweryfikowanych zadań Task[] lub pusta tablica [] w przypadku błędu/braku danych
 */
export function loadTasksFromStorage(key: string = DEFAULT_TASKS_STORAGE_KEY): Task[] {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      console.warn('[Storage] LocalStorage nie jest dostępne w bieżącym środowisku.');
      return [];
    }

    const rawData = window.localStorage.getItem(key);
    if (!rawData || rawData.trim() === '') {
      return [];
    }

    const parsed: unknown = JSON.parse(rawData);

    if (!Array.isArray(parsed)) {
      const receivedType = parsed === null ? 'null' : typeof parsed;
      console.warn(
        `[Storage] Oczekiwano tablicy zadań pod kluczem "${key}", ale otrzymano ${receivedType}. Zwracanie pustej tablicy.`
      );
      return [];
    }

    const validTasks: Task[] = [];
    let invalidCount = 0;

    for (const item of parsed) {
      if (isTask(item)) {
        validTasks.push(item);
      } else {
        invalidCount++;
      }
    }

    if (invalidCount > 0) {
      console.warn(
        `[Storage] Wykryto ${invalidCount} niepoprawnych elementów w tablicy pod kluczem "${key}". Zostały one zignorowane.`
      );
    }

    return validTasks;
  } catch (error) {
    console.warn(`[Storage] Błąd podczas odczytu zadań z klucza "${key}":`, error);
    return [];
  }
}

/**
 * Bezpieczny zapis zadań do pamięci LocalStorage.
 *
 * Wszystkie operacje zapisu są zabezpieczone blokiem try/catch,
 * zapobiegając awarii aplikacji w razie przekroczenia limitu pamięci
 * (QUOTA_EXCEEDED_ERR / QuotaExceededError) lub blokady zapisu w trybie prywatnym.
 *
 * @param tasks Tablica zadań do zapisania
 * @param key Opcjonalny klucz w LocalStorage (domyślnie DEFAULT_TASKS_STORAGE_KEY)
 * @returns true w przypadku pomyślnego zapisu, false w razie błędu
 */
export function saveTasksToStorage(tasks: Task[], key: string = DEFAULT_TASKS_STORAGE_KEY): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      console.warn('[Storage] LocalStorage nie jest dostępne do zapisu zadań.');
      return false;
    }

    const serialized = JSON.stringify(tasks);
    window.localStorage.setItem(key, serialized);
    return true;
  } catch (error) {
    console.warn(`[Storage] Błąd podczas zapisu zadań do klucza "${key}":`, error);
    return false;
  }
}

/**
 * Bezpieczne usunięcie zadań z pamięci LocalStorage pod wskazanym kluczem.
 *
 * @param key Opcjonalny klucz w LocalStorage (domyślnie DEFAULT_TASKS_STORAGE_KEY)
 * @returns true w przypadku pomyślnego usunięcia, false w razie błędu
 */
export function clearTasksFromStorage(key: string = DEFAULT_TASKS_STORAGE_KEY): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      console.warn('[Storage] LocalStorage nie jest dostępne do usunięcia danych.');
      return false;
    }

    window.localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.warn(`[Storage] Błąd podczas usuwania danych pod kluczem "${key}":`, error);
    return false;
  }
}
