import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  mapDayIndexToWeekday,
  getDayOfWeekFromDate,
  getCurrentDayOfWeek,
  isPastDay,
  isToday,
  isTaskOverdue,
  getOverdueTasks,
  formatDateToYYYYMMDD,
} from './dateUtils';
import type { Task, Weekday } from '../types';

describe('dateUtils', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('mapDayIndexToWeekday', () => {
    it('poprawnie mapuje standardowe indeksy Date.getDay() (0..6) na Weekday', () => {
      // 0: Niedziela
      expect(mapDayIndexToWeekday(0)).toBe('sun');
      // 1: Poniedziałek
      expect(mapDayIndexToWeekday(1)).toBe('mon');
      // 2: Wtorek
      expect(mapDayIndexToWeekday(2)).toBe('tue');
      // 3: Środa
      expect(mapDayIndexToWeekday(3)).toBe('wed');
      // 4: Czwartek
      expect(mapDayIndexToWeekday(4)).toBe('thu');
      // 5: Piątek
      expect(mapDayIndexToWeekday(5)).toBe('fri');
      // 6: Sobota
      expect(mapDayIndexToWeekday(6)).toBe('sat');
    });

    it('bezpiecznie obsługuje indeksy ujemne oraz wartości wykraczające poza 0..6', () => {
      // 7 -> 0 ('sun')
      expect(mapDayIndexToWeekday(7)).toBe('sun');
      // 8 -> 1 ('mon')
      expect(mapDayIndexToWeekday(8)).toBe('mon');
      // 14 -> 0 ('sun')
      expect(mapDayIndexToWeekday(14)).toBe('sun');
      // -1 -> 6 ('sat')
      expect(mapDayIndexToWeekday(-1)).toBe('sat');
      // -7 -> 0 ('sun')
      expect(mapDayIndexToWeekday(-7)).toBe('sun');
      // Ułamki są obcinane przez Math.trunc
      expect(mapDayIndexToWeekday(1.9)).toBe('mon');
    });
  });

  describe('getDayOfWeekFromDate & getCurrentDayOfWeek', () => {
    it('zwraca właściwy dzień tygodnia dla konkretnych dat kalendarzowych', () => {
      // 2026-10-19 to poniedziałek
      const mondayDate = new Date('2026-10-19T10:00:00Z');
      expect(getDayOfWeekFromDate(mondayDate)).toBe('mon');

      // 2026-10-21 to środa
      const wednesdayDate = new Date('2026-10-21T12:00:00Z');
      expect(getDayOfWeekFromDate(wednesdayDate)).toBe('wed');

      // 2026-10-24 to sobota
      const saturdayDate = new Date('2026-10-24T18:00:00Z');
      expect(getDayOfWeekFromDate(saturdayDate)).toBe('sat');

      // 2026-10-25 to niedziela
      const sundayDate = new Date('2026-10-25T15:00:00Z');
      expect(getDayOfWeekFromDate(sundayDate)).toBe('sun');
    });

    it('bezpiecznie radzi sobie z nieprawidłowym obiektem daty (Invalid Date)', () => {
      const invalidDate = new Date('niepoprawna-data');
      // Powinien bezpiecznie zwrócić poprawny Weekday bez rzucania błędu
      const result = getDayOfWeekFromDate(invalidDate);
      expect(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']).toContain(result);
    });

    it('getCurrentDayOfWeek poprawnie reaguje na mockowany zegar systemowy', () => {
      vi.useFakeTimers();

      // Ustaw zegar na niedzielę 2026-10-25
      vi.setSystemTime(new Date('2026-10-25T14:00:00Z'));
      expect(getCurrentDayOfWeek()).toBe('sun');

      // Ustaw zegar na poniedziałek 2026-10-26
      vi.setSystemTime(new Date('2026-10-26T08:00:00Z'));
      expect(getCurrentDayOfWeek()).toBe('mon');

      // Ustaw zegar na piątek 2026-10-30
      vi.setSystemTime(new Date('2026-10-30T16:00:00Z'));
      expect(getCurrentDayOfWeek()).toBe('fri');
    });

    it('getCurrentDayOfWeek akceptuje opcjonalną datę referencyjną', () => {
      const customDate = new Date('2026-10-22T09:00:00Z'); // Czwartek
      expect(getCurrentDayOfWeek(customDate)).toBe('thu');
    });
  });

  describe('isPastDay', () => {
    it('zwraca false dla Backlogu (day === null) niezależnie od dnia referencyjnego', () => {
      const weekdays: Weekday[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

      for (const ref of weekdays) {
        expect(isPastDay(null, ref)).toBe(false);
      }
    });

    it('gdy dzisiaj jest Poniedziałek, żaden dzień tygodnia nie jest przeszły', () => {
      const refDay: Weekday = 'mon';

      expect(isPastDay('mon', refDay)).toBe(false); // dzisiaj
      expect(isPastDay('tue', refDay)).toBe(false); // przyszłość
      expect(isPastDay('wed', refDay)).toBe(false);
      expect(isPastDay('thu', refDay)).toBe(false);
      expect(isPastDay('fri', refDay)).toBe(false);
      expect(isPastDay('sat', refDay)).toBe(false);
      expect(isPastDay('sun', refDay)).toBe(false);
    });

    it('gdy dzisiaj jest Środa, tylko Poniedziałek i Wtorek są przeszłe', () => {
      const refDay: Weekday = 'wed';

      // Przeszłe
      expect(isPastDay('mon', refDay)).toBe(true);
      expect(isPastDay('tue', refDay)).toBe(true);

      // Dzisiaj
      expect(isPastDay('wed', refDay)).toBe(false);

      // Przyszłe
      expect(isPastDay('thu', refDay)).toBe(false);
      expect(isPastDay('fri', refDay)).toBe(false);
      expect(isPastDay('sat', refDay)).toBe(false);
      expect(isPastDay('sun', refDay)).toBe(false);
    });

    it('gdy dzisiaj jest Niedziela (koniec tygodnia), wszystkie dni od pon do sob są przeszłe', () => {
      const refDay: Weekday = 'sun';

      expect(isPastDay('mon', refDay)).toBe(true);
      expect(isPastDay('tue', refDay)).toBe(true);
      expect(isPastDay('wed', refDay)).toBe(true);
      expect(isPastDay('thu', refDay)).toBe(true);
      expect(isPastDay('fri', refDay)).toBe(true);
      expect(isPastDay('sat', refDay)).toBe(true);
      expect(isPastDay('sun', refDay)).toBe(false); // dzisiaj
    });

    it('obsługuje referencję przekazaną jako obiekt Date', () => {
      // 2026-10-23 to piątek
      const fridayDate = new Date('2026-10-23T10:00:00Z');

      expect(isPastDay('thu', fridayDate)).toBe(true);
      expect(isPastDay('fri', fridayDate)).toBe(false);
      expect(isPastDay('sat', fridayDate)).toBe(false);
    });

    it('używa bieżącego czasu, gdy referencja nie została podana', () => {
      vi.useFakeTimers();
      // Czwartek
      vi.setSystemTime(new Date('2026-10-22T10:00:00Z'));

      expect(isPastDay('wed')).toBe(true);
      expect(isPastDay('thu')).toBe(false);
      expect(isPastDay('fri')).toBe(false);
    });

    it('bezpiecznie obsługuje nieprawidłowy ciąg referencyjny', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-10-21T10:00:00Z')); // Środa

      // Nieprawidłowy klucz jako referencja powinien fallbackować do bieżącego dnia
      expect(isPastDay('mon', 'nieznany' as unknown as Weekday)).toBe(true);
      expect(isPastDay('thu', 'nieznany' as unknown as Weekday)).toBe(false);
    });
  });

  describe('isToday', () => {
    it('zwraca false dla Backlogu (day === null)', () => {
      expect(isToday(null, 'mon')).toBe(false);
      expect(isToday(null, 'wed')).toBe(false);
    });

    it('poprawnie weryfikuje bieżący dzień tygodnia', () => {
      expect(isToday('mon', 'mon')).toBe(true);
      expect(isToday('tue', 'mon')).toBe(false);

      expect(isToday('fri', 'fri')).toBe(true);
      expect(isToday('sun', 'fri')).toBe(false);
    });

    it('obsługuje referencję Date i domyślny czas systemowy', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-10-20T10:00:00Z')); // Wtorek

      expect(isToday('tue')).toBe(true);
      expect(isToday('wed')).toBe(false);

      const thursdayDate = new Date('2026-10-22T12:00:00Z');
      expect(isToday('thu', thursdayDate)).toBe(true);
      expect(isToday('tue', thursdayDate)).toBe(false);
    });
  });

  describe('isTaskOverdue', () => {
    const baseTask: Task = {
      id: 'task-1',
      title: 'Zadanie testowe',
      priority: 'medium',
      status: 'todo',
      day: 'mon',
      order: 0,
      createdAt: '2026-10-19T08:00:00.000Z',
    };

    it('zwraca false, jeśli zadanie nie ma przypisanego dnia (Backlog: day === null)', () => {
      const backlogTask: Task = { ...baseTask, day: null, status: 'todo' };
      // Nawet jeśli dziś jest niedziela
      expect(isTaskOverdue(backlogTask, 'sun')).toBe(false);
    });

    it('zwraca false, jeśli zadanie jest już wykonane (status === "done")', () => {
      const completedPastTask: Task = { ...baseTask, day: 'mon', status: 'done' };
      // Dziś jest środa, poniedziałek minął, ale zadanie jest zrobione
      expect(isTaskOverdue(completedPastTask, 'wed')).toBe(false);
    });

    it('zwraca true, jeśli zadanie nie jest wykonane i jego dzień minął (np. poniedziałek, a dziś jest środa)', () => {
      const overdueTask: Task = { ...baseTask, day: 'mon', status: 'todo' };
      expect(isTaskOverdue(overdueTask, 'wed')).toBe(true);
    });

    it('zwraca false, jeśli zadanie jest na dzisiaj i nie zostało jeszcze wykonane', () => {
      const todayTask: Task = { ...baseTask, day: 'wed', status: 'todo' };
      expect(isTaskOverdue(todayTask, 'wed')).toBe(false);
    });

    it('zwraca false, jeśli zadanie jest zaplanowane na przyszły dzień', () => {
      const futureTask: Task = { ...baseTask, day: 'fri', status: 'todo' };
      expect(isTaskOverdue(futureTask, 'wed')).toBe(false);
    });

    it('zwraca false dla pustego/nieprawidłowego obiektu zadania', () => {
      expect(isTaskOverdue(null as unknown as Task)).toBe(false);
      expect(isTaskOverdue(undefined as unknown as Task)).toBe(false);
    });
  });

  describe('getOverdueTasks', () => {
    const tasks: Task[] = [
      {
        id: '1',
        title: 'Zadanie poniedziałkowe niewykonane',
        status: 'todo',
        day: 'mon',
        priority: 'high',
        order: 0,
        createdAt: '2026-10-19T08:00:00.000Z',
      },
      {
        id: '2',
        title: 'Zadanie poniedziałkowe wykonane',
        status: 'done',
        day: 'mon',
        priority: 'medium',
        order: 1,
        createdAt: '2026-10-19T08:00:00.000Z',
      },
      {
        id: '3',
        title: 'Zadanie wtorkowe niewykonane',
        status: 'todo',
        day: 'tue',
        priority: 'low',
        order: 0,
        createdAt: '2026-10-19T09:00:00.000Z',
      },
      {
        id: '4',
        title: 'Zadanie środowe (dzisiejsze)',
        status: 'todo',
        day: 'wed',
        priority: 'medium',
        order: 0,
        createdAt: '2026-10-19T10:00:00.000Z',
      },
      {
        id: '5',
        title: 'Zadanie w backlogu',
        status: 'todo',
        day: null,
        priority: 'medium',
        order: 0,
        createdAt: '2026-10-19T11:00:00.000Z',
      },
    ];

    it('poprawnie filtruje listę zwracając wyłącznie zadania zaległe dla danego dnia', () => {
      // Dziś jest środa: zadania 1 (mon, todo) i 3 (tue, todo) są zaległe
      const overdueOnWed = getOverdueTasks(tasks, 'wed');
      expect(overdueOnWed.map((t) => t.id)).toEqual(['1', '3']);

      // Dziś jest poniedziałek: brak zaległych
      const overdueOnMon = getOverdueTasks(tasks, 'mon');
      expect(overdueOnMon).toEqual([]);

      // Pusta tablica
      expect(getOverdueTasks([])).toEqual([]);
    });
  });

  describe('formatDateToYYYYMMDD', () => {
    it('formatuje datę do formatu YYYY-MM-DD z dopełnieniem zerami', () => {
      const date1 = new Date(2026, 4, 3); // 3 maja 2026 (miesiące 0-indeksowane: 4 = maj)
      expect(formatDateToYYYYMMDD(date1)).toBe('2026-05-03');

      const date2 = new Date(2026, 9, 19); // 19 października 2026
      expect(formatDateToYYYYMMDD(date2)).toBe('2026-10-19');
    });

    it('dla niepoprawnej daty zwraca bieżącą datę bez rzucania wyjątku', () => {
      const invalid = new Date('błędna-data');
      const formatted = formatDateToYYYYMMDD(invalid);
      expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('używa bieżącej daty, gdy brak argumentu', () => {
      const formatted = formatDateToYYYYMMDD();
      expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });
});
