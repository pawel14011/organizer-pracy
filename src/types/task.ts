/**
 * Identyfikatory dni roboczych stałego tygodnia.
 * Tydzień aplikacji zawsze rozpoczyna się od poniedziałku ('mon') i kończy w niedzielę ('sun').
 */
export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

/**
 * Dzień tygodnia przypisany do zadania.
 * Wartość Weekday reprezentuje jeden z 7 dni tygodnia, natomiast null oznacza obecność zadania w Backlogu.
 */
export type DayOfWeek = Weekday | null;

/**
 * Poziom priorytetu zadania:
 * - 'low': niski
 * - 'medium': średni (domyślny przy dodawaniu nowego zadania)
 * - 'high': wysoki
 */
export type Priority = 'low' | 'medium' | 'high';

/**
 * Status realizacji zadania:
 * - 'todo': do zrobienia
 * - 'done': wykonane
 */
export type TaskStatus = 'todo' | 'done';

/**
 * Model danych zadania (Task) w 100% zgodny z sekcją 4 spec.md.
 */
export interface Task {
  /** Unikalny identyfikator zadania (np. crypto.randomUUID()). */
  id: string;

  /** Treść / nazwa zadania. */
  title: string;

  /** Status realizacji zadania ('todo' | 'done'). */
  status: TaskStatus;

  /** Priorytet zadania ('low' | 'medium' | 'high'). */
  priority: Priority;

  /** Przypisany dzień tygodnia lub null, jeśli zadanie znajduje się w Backlogu. */
  day: DayOfWeek;

  /** Liczba określająca kolejność wyświetlania zadania w danej kolumnie (indeks >= 0). */
  order: number;

  /** Data i czas utworzenia zadania w formacie ISO (np. 2026-10-19T10:00:00.000Z). */
  createdAt: string;
}
