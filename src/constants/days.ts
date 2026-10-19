import { Weekday } from '../types';

/**
 * Kolejność dni tygodnia w aplikacji (od poniedziałku do niedzieli).
 * Zgodnie ze spec.md tydzień zawsze rozpoczyna się od poniedziałku.
 */
export const WEEKDAYS: readonly Weekday[] = [
  'mon',
  'tue',
  'wed',
  'thu',
  'fri',
  'sat',
  'sun',
] as const;

/**
 * Pełne polskie nazwy dni tygodnia.
 */
export const DAY_LABELS: Record<Weekday, string> = {
  mon: 'Poniedziałek',
  tue: 'Wtorek',
  wed: 'Środa',
  thu: 'Czwartek',
  fri: 'Piątek',
  sat: 'Sobota',
  sun: 'Niedziela',
} as const;

/**
 * Skrócone polskie nazwy dni tygodnia.
 */
export const DAY_SHORT_LABELS: Record<Weekday, string> = {
  mon: 'Pon',
  tue: 'Wt',
  wed: 'Śr',
  thu: 'Czw',
  fri: 'Pt',
  sat: 'Sob',
  sun: 'Nd',
} as const;

/**
 * Struktura konfiguracyjna pojedynczego dnia tygodnia używana w widoku kalendarza.
 */
export interface DayConfig {
  key: Weekday;
  label: string;
  shortLabel: string;
  orderIndex: number;
}

/**
 * Lista konfiguracji dni tygodnia uporządkowana od poniedziałku (indeks 0) do niedzieli (indeks 6).
 */
export const WEEK_DAYS_CONFIG: readonly DayConfig[] = WEEKDAYS.map(
  (key, index) => ({
    key,
    label: DAY_LABELS[key],
    shortLabel: DAY_SHORT_LABELS[key],
    orderIndex: index,
  })
);

/**
 * Numeryczny indeks kolejności dnia w tygodniu aplikacji (0 dla 'mon', 6 dla 'sun').
 * Używany m.in. do detekcji zaległości (porównywanie z indeksem bieżącego dnia).
 */
export const WEEKDAY_ORDER: Record<Weekday, number> = {
  mon: 0,
  tue: 1,
  wed: 2,
  thu: 3,
  fri: 4,
  sat: 5,
  sun: 6,
} as const;

/**
 * Bezpośrednie mapowanie natywnego indeksu Date.getDay() JavaScriptu na identyfikator Weekday.
 *
 * Uwaga: W natywnym obiekcie JavaScript Date.getDay() zwraca:
 * 0 -> Niedziela ('sun')
 * 1 -> Poniedziałek ('mon')
 * 2 -> Wtorek ('tue')
 * 3 -> Środa ('wed')
 * 4 -> Czwartek ('thu')
 * 5 -> Piątek ('fri')
 * 6 -> Sobota ('sat')
 */
export const JS_DAY_INDEX_TO_WEEKDAY: Record<number, Weekday> = {
  0: 'sun',
  1: 'mon',
  2: 'tue',
  3: 'wed',
  4: 'thu',
  5: 'fri',
  6: 'sat',
} as const;

/**
 * Identyfikator kolumny Backlog dla Dnd-kit i selektorów.
 */
export const BACKLOG_DROPPABLE_ID = 'backlog' as const;
