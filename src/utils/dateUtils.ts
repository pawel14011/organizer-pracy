import type { DayOfWeek, Task, Weekday } from '../types';
import { JS_DAY_INDEX_TO_WEEKDAY, WEEKDAY_ORDER } from '../constants';

/**
 * Konwertuje numeryczny indeks dnia z obiektu JavaScript `Date.getDay()`
 * na identyfikator dnia tygodnia w aplikacji (`Weekday`).
 *
 * Mapowanie JS `Date.getDay()`:
 * - 0 -> 'sun' (Niedziela)
 * - 1 -> 'mon' (Poniedziałek)
 * - 2 -> 'tue' (Wtorek)
 * - 3 -> 'wed' (Środa)
 * - 4 -> 'thu' (Czwartek)
 * - 5 -> 'fri' (Piątek)
 * - 6 -> 'sat' (Sobota)
 *
 * @param dayIndex Indeks dnia tygodnia (0-6)
 * @returns Identyfikator Weekday ('mon' | ... | 'sun')
 */
export function mapDayIndexToWeekday(dayIndex: number): Weekday {
  // Bezpieczna normalizacja indeksu (obsługa liczb ujemnych i wielokrotności 7)
  const normalizedIndex = ((Math.trunc(dayIndex) % 7) + 7) % 7;
  return JS_DAY_INDEX_TO_WEEKDAY[normalizedIndex] ?? 'mon';
}

/**
 * Zwraca identyfikator dnia tygodnia (`Weekday`) dla wskazanego obiektu `Date`.
 *
 * @param date Obiekt daty (domyślnie bieżąca data `new Date()`)
 * @returns Identyfikator Weekday
 */
export function getDayOfWeekFromDate(date: Date = new Date()): Weekday {
  if (isNaN(date.getTime())) {
    // W razie nieprawidłowej daty bezpieczny fallback do bieżącego dnia
    return getDayOfWeekFromDate(new Date());
  }
  return mapDayIndexToWeekday(date.getDay());
}

/**
 * Zwraca identyfikator bieżącego dnia tygodnia (`Weekday`).
 *
 * @param date Opcjonalna data referencyjna (użyteczna przy testowaniu)
 * @returns Identyfikator Weekday bieżącego dnia
 */
export function getCurrentDayOfWeek(date?: Date): Weekday {
  return getDayOfWeekFromDate(date ?? new Date());
}

/**
 * Rozwiązuje wartość referencyjną dnia tygodnia.
 * Może przyjąć instancję `Date`, identyfikator `Weekday` lub `undefined`.
 */
function resolveReferenceWeekday(reference?: Date | Weekday): Weekday {
  if (typeof reference === 'string') {
    if (reference in WEEKDAY_ORDER) {
      return reference;
    }
    return getCurrentDayOfWeek();
  }
  if (reference instanceof Date) {
    return getDayOfWeekFromDate(reference);
  }
  return getCurrentDayOfWeek();
}

/**
 * Sprawdza, czy wskazany dzień tygodnia już minął w bieżącym tygodniu.
 *
 * Tydzień aplikacji zawsze rozpoczyna się od poniedziałku ('mon') i kończy w niedzielę ('sun').
 * Dzień uważa się za przeszły, jeśli jego indeks kolejności w tygodniu jest mniejszy
 * niż indeks dnia referencyjnego.
 *
 * Dla Backlogu (`day === null`) zawsze zwraca `false`.
 *
 * @param day Dzień tygodnia (`DayOfWeek`: `Weekday` lub `null`)
 * @param reference Opcjonalna data referencyjna lub identyfikator dnia (domyślnie bieżący dzień)
 * @returns `true`, jeśli dzień już minął w danym tygodniu; `false` w przeciwnym razie
 */
export function isPastDay(day: DayOfWeek, reference?: Date | Weekday): boolean {
  if (day === null) {
    return false;
  }

  const referenceWeekday = resolveReferenceWeekday(reference);
  const dayOrder = WEEKDAY_ORDER[day];
  const refOrder = WEEKDAY_ORDER[referenceWeekday];

  return dayOrder < refOrder;
}

/**
 * Sprawdza, czy wskazany dzień tygodnia jest dniem bieżącym (dzisiaj).
 *
 * Dla Backlogu (`day === null`) zawsze zwraca `false`.
 *
 * @param day Dzień tygodnia (`DayOfWeek`: `Weekday` lub `null`)
 * @param reference Opcjonalna data referencyjna lub identyfikator dnia (domyślnie bieżący dzień)
 * @returns `true`, jeśli dzień jest dniem dzisiejszym; `false` w przeciwnym razie
 */
export function isToday(day: DayOfWeek, reference?: Date | Weekday): boolean {
  if (day === null) {
    return false;
  }

  const referenceWeekday = resolveReferenceWeekday(reference);
  return day === referenceWeekday;
}

/**
 * Identyfikuje, czy zadanie jest zaległe.
 *
 * Zadanie uważa się za zaległe, gdy spełnia łącznie warunki:
 * 1. Jest przypisane do konkretnego dnia tygodnia (`task.day !== null`).
 * 2. Status realizacji nie jest wykonany (`task.status !== 'done'`).
 * 3. Przypisany dzień już minął w bieżącym tygodniu (`isPastDay(task.day) === true`).
 *
 * Zadania w Backlogu (`day === null`) oraz zadania ukończone (`status === 'done'`)
 * nigdy nie są traktowane jako zaległe.
 *
 * @param task Obiekt zadania lub wycinek z polami `day` i `status`
 * @param reference Opcjonalna data referencyjna lub identyfikator dnia (domyślnie bieżący dzień)
 * @returns `true`, jeśli zadanie jest zaległe; `false` w przeciwnym razie
 */
export function isTaskOverdue(
  task: Pick<Task, 'day' | 'status'>,
  reference?: Date | Weekday
): boolean {
  if (!task || task.day === null || task.status === 'done') {
    return false;
  }

  return isPastDay(task.day, reference);
}

/**
 * Zwraca tablicę wszystkich zaległych zadań z przekazanej listy.
 *
 * @param tasks Lista wszystkich zadań
 * @param reference Opcjonalna data referencyjna lub identyfikator dnia
 * @returns Tablica zadań spełniających kryteria zaległości
 */
export function getOverdueTasks(
  tasks: Task[],
  reference?: Date | Weekday
): Task[] {
  return tasks.filter((task) => isTaskOverdue(task, reference));
}

/**
 * Formatuje obiekt daty do standardowego ciągu `YYYY-MM-DD`.
 * Wykorzystywane m.in. przy generowaniu bezpiecznych nazw plików kopii zapasowej
 * (np. `organizer-backup-YYYY-MM-DD.json`).
 *
 * @param date Obiekt daty (domyślnie bieżąca data `new Date()`)
 * @returns Sformatowany ciąg w formacie YYYY-MM-DD (np. "2026-10-19")
 */
export function formatDateToYYYYMMDD(date: Date = new Date()): string {
  const validDate = isNaN(date.getTime()) ? new Date() : date;
  const year = validDate.getFullYear();
  const month = String(validDate.getMonth() + 1).padStart(2, '0');
  const day = String(validDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
