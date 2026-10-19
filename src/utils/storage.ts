import type { Task } from '../types';

/**
 * Domyślny klucz LocalStorage dla zadań Organizera Pracy.
 */
export const DEFAULT_TASKS_STORAGE_KEY = 'organizer_tasks';

/**
 * Bezpieczny odczyt zadań z pamięci LocalStorage.
 *
 * Obsługuje przypadki brzegowe:
 * - brak danych lub pusty ciąg -> zwraca pustą tablicę []
 * - niepoprawny JSON (SyntaxError) -> loguje ostrzeżenie i zwraca pustą tablicę []
 * - dane niebędące tablicą (np. obiekt, liczba, ciąg znaków) -> loguje ostrzeżenie i zwraca pustą tablicę []
 * - błąd dostępu do LocalStorage (np. tryb incognito, SecurityError) -> loguje ostrzeżenie i zwraca pustą tablicę []
 *
 * @param key Opcjonalny klucz w LocalStorage (domyślnie DEFAULT_TASKS_STORAGE_KEY)
 * @returns Tablica zadań Task[] lub pusta tablica [] w przypadku błędu/braku danych
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
      console.warn(
        `[Storage] Oczekiwano tablicy zadań pod kluczem "${key}", ale otrzymano ${typeof parsed}. Zwracanie pustej tablicy.`
      );
      return [];
    }

    return parsed as Task[];
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
