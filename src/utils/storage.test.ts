import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  DEFAULT_TASKS_STORAGE_KEY,
  loadTasksFromStorage,
  saveTasksToStorage,
  clearTasksFromStorage,
} from './storage';
import type { Task } from '../types';

describe('storage utility', () => {
  const sampleTasks: Task[] = [
    {
      id: 'task-1',
      title: 'Zadanie 1',
      status: 'todo',
      priority: 'medium',
      day: 'mon',
      order: 0,
      createdAt: '2026-10-19T10:00:00.000Z',
    },
    {
      id: 'task-2',
      title: 'Zadanie 2',
      status: 'done',
      priority: 'high',
      day: null,
      order: 1,
      createdAt: '2026-10-19T11:00:00.000Z',
    },
  ];

  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('exports correct default storage key', () => {
    expect(DEFAULT_TASKS_STORAGE_KEY).toBe('organizer_tasks');
  });

  describe('loadTasksFromStorage', () => {
    it('returns an empty array when storage is empty', () => {
      const result = loadTasksFromStorage();
      expect(result).toEqual([]);
    });

    it('returns an empty array when storage item is an empty or whitespace string', () => {
      window.localStorage.setItem(DEFAULT_TASKS_STORAGE_KEY, '   ');
      const result = loadTasksFromStorage();
      expect(result).toEqual([]);
    });

    it('loads and parses tasks from default key', () => {
      window.localStorage.setItem(
        DEFAULT_TASKS_STORAGE_KEY,
        JSON.stringify(sampleTasks)
      );

      const result = loadTasksFromStorage();
      expect(result).toEqual(sampleTasks);
    });

    it('loads and parses tasks from a custom key', () => {
      const customKey = 'custom_tasks_key';
      window.localStorage.setItem(customKey, JSON.stringify(sampleTasks));

      const result = loadTasksFromStorage(customKey);
      expect(result).toEqual(sampleTasks);
    });

    it('handles malformed JSON safely without throwing and logs a warning', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      window.localStorage.setItem(DEFAULT_TASKS_STORAGE_KEY, '{invalid json');

      const result = loadTasksFromStorage();

      expect(result).toEqual([]);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Storage] Błąd podczas odczytu zadań'),
        expect.any(SyntaxError)
      );
    });

    it('handles non-array parsed JSON (e.g. object) and logs a warning', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      window.localStorage.setItem(
        DEFAULT_TASKS_STORAGE_KEY,
        JSON.stringify({ notAnArray: true })
      );

      const result = loadTasksFromStorage();

      expect(result).toEqual([]);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Oczekiwano tablicy zadań pod kluczem')
      );
    });

    it('handles non-array parsed JSON (e.g. number or boolean) and logs a warning', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      window.localStorage.setItem(DEFAULT_TASKS_STORAGE_KEY, '42');

      const result = loadTasksFromStorage();

      expect(result).toEqual([]);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Oczekiwano tablicy zadań pod kluczem')
      );
    });

    it('handles exceptions thrown by localStorage.getItem (e.g. SecurityError in private mode)', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('SecurityError: Access is denied for this document');
      });

      const result = loadTasksFromStorage();

      expect(result).toEqual([]);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Storage] Błąd podczas odczytu zadań'),
        expect.any(Error)
      );
    });

    it('handles environment without localStorage safely', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const originalLocalStorage = window.localStorage;

      // Emulate environment without localStorage
      Object.defineProperty(window, 'localStorage', {
        value: undefined,
        configurable: true,
        writable: true,
      });

      try {
        const result = loadTasksFromStorage();
        expect(result).toEqual([]);
        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining('LocalStorage nie jest dostępne')
        );
      } finally {
        Object.defineProperty(window, 'localStorage', {
          value: originalLocalStorage,
          configurable: true,
          writable: true,
        });
      }
    });
  });

  describe('saveTasksToStorage', () => {
    it('successfully saves tasks to default key and returns true', () => {
      const success = saveTasksToStorage(sampleTasks);

      expect(success).toBe(true);
      const raw = window.localStorage.getItem(DEFAULT_TASKS_STORAGE_KEY);
      expect(raw).toBe(JSON.stringify(sampleTasks));
    });

    it('successfully saves tasks to a custom key and returns true', () => {
      const customKey = 'custom_save_key';
      const success = saveTasksToStorage(sampleTasks, customKey);

      expect(success).toBe(true);
      const raw = window.localStorage.getItem(customKey);
      expect(raw).toBe(JSON.stringify(sampleTasks));
    });

    it('handles QuotaExceededError safely, logs a warning and returns false', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        const error = new DOMException('Quota exceeded', 'QuotaExceededError');
        throw error;
      });

      const success = saveTasksToStorage(sampleTasks);

      expect(success).toBe(false);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Storage] Błąd podczas zapisu zadań'),
        expect.any(DOMException)
      );
    });

    it('handles environment without localStorage safely when saving', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const originalLocalStorage = window.localStorage;

      Object.defineProperty(window, 'localStorage', {
        value: undefined,
        configurable: true,
        writable: true,
      });

      try {
        const success = saveTasksToStorage(sampleTasks);
        expect(success).toBe(false);
        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining('LocalStorage nie jest dostępne do zapisu zadań')
        );
      } finally {
        Object.defineProperty(window, 'localStorage', {
          value: originalLocalStorage,
          configurable: true,
          writable: true,
        });
      }
    });
  });

  describe('clearTasksFromStorage', () => {
    it('successfully removes tasks from default key and returns true', () => {
      window.localStorage.setItem(
        DEFAULT_TASKS_STORAGE_KEY,
        JSON.stringify(sampleTasks)
      );

      const success = clearTasksFromStorage();

      expect(success).toBe(true);
      expect(window.localStorage.getItem(DEFAULT_TASKS_STORAGE_KEY)).toBeNull();
    });

    it('successfully removes tasks from custom key and returns true', () => {
      const customKey = 'custom_clear_key';
      window.localStorage.setItem(customKey, JSON.stringify(sampleTasks));

      const success = clearTasksFromStorage(customKey);

      expect(success).toBe(true);
      expect(window.localStorage.getItem(customKey)).toBeNull();
    });

    it('handles error thrown during removeItem, logs a warning and returns false', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
        throw new Error('Storage access denied');
      });

      const success = clearTasksFromStorage();

      expect(success).toBe(false);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Storage] Błąd podczas usuwania danych pod kluczem'),
        expect.any(Error)
      );
    });

    it('handles environment without localStorage safely when clearing', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const originalLocalStorage = window.localStorage;

      Object.defineProperty(window, 'localStorage', {
        value: undefined,
        configurable: true,
        writable: true,
      });

      try {
        const success = clearTasksFromStorage();
        expect(success).toBe(false);
        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining('LocalStorage nie jest dostępne do usunięcia danych')
        );
      } finally {
        Object.defineProperty(window, 'localStorage', {
          value: originalLocalStorage,
          configurable: true,
          writable: true,
        });
      }
    });
  });
});
