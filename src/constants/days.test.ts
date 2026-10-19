import { describe, it, expect } from 'vitest';
import {
  WEEKDAYS,
  DAY_LABELS,
  DAY_SHORT_LABELS,
  WEEK_DAYS_CONFIG,
  WEEKDAY_ORDER,
  JS_DAY_INDEX_TO_WEEKDAY,
  BACKLOG_DROPPABLE_ID,
} from './days';

describe('days constants', () => {
  it('defines 7 days starting with Monday and ending with Sunday', () => {
    expect(WEEKDAYS).toEqual([
      'mon',
      'tue',
      'wed',
      'thu',
      'fri',
      'sat',
      'sun',
    ]);
    expect(WEEKDAYS).toHaveLength(7);
  });

  it('provides correct Polish labels for every day of the week', () => {
    for (const day of WEEKDAYS) {
      expect(DAY_LABELS[day]).toBeDefined();
      expect(typeof DAY_LABELS[day]).toBe('string');
      expect(DAY_LABELS[day].length).toBeGreaterThan(0);

      expect(DAY_SHORT_LABELS[day]).toBeDefined();
      expect(typeof DAY_SHORT_LABELS[day]).toBe('string');
      expect(DAY_SHORT_LABELS[day].length).toBeGreaterThan(0);
    }

    expect(DAY_LABELS.mon).toBe('Poniedziałek');
    expect(DAY_LABELS.sun).toBe('Niedziela');
    expect(DAY_SHORT_LABELS.mon).toBe('Pon');
    expect(DAY_SHORT_LABELS.sun).toBe('Nd');
  });

  it('provides ordered WEEK_DAYS_CONFIG matching WEEKDAYS sequence', () => {
    expect(WEEK_DAYS_CONFIG).toHaveLength(7);
    WEEK_DAYS_CONFIG.forEach((config, idx) => {
      expect(config.key).toBe(WEEKDAYS[idx]);
      expect(config.orderIndex).toBe(idx);
      expect(config.label).toBe(DAY_LABELS[config.key]);
      expect(config.shortLabel).toBe(DAY_SHORT_LABELS[config.key]);
    });
  });

  it('maps native JavaScript Date.getDay() (0=Sunday ... 6=Saturday) to Weekday correctly', () => {
    // 0: Sunday
    expect(JS_DAY_INDEX_TO_WEEKDAY[0]).toBe('sun');
    // 1: Monday
    expect(JS_DAY_INDEX_TO_WEEKDAY[1]).toBe('mon');
    // 2: Tuesday
    expect(JS_DAY_INDEX_TO_WEEKDAY[2]).toBe('tue');
    // 3: Wednesday
    expect(JS_DAY_INDEX_TO_WEEKDAY[3]).toBe('wed');
    // 4: Thursday
    expect(JS_DAY_INDEX_TO_WEEKDAY[4]).toBe('thu');
    // 5: Friday
    expect(JS_DAY_INDEX_TO_WEEKDAY[5]).toBe('fri');
    // 6: Saturday
    expect(JS_DAY_INDEX_TO_WEEKDAY[6]).toBe('sat');
  });

  it('defines sequential WEEKDAY_ORDER starting at 0 for Monday to 6 for Sunday', () => {
    expect(WEEKDAY_ORDER.mon).toBe(0);
    expect(WEEKDAY_ORDER.tue).toBe(1);
    expect(WEEKDAY_ORDER.wed).toBe(2);
    expect(WEEKDAY_ORDER.thu).toBe(3);
    expect(WEEKDAY_ORDER.fri).toBe(4);
    expect(WEEKDAY_ORDER.sat).toBe(5);
    expect(WEEKDAY_ORDER.sun).toBe(6);
  });

  it('defines BACKLOG_DROPPABLE_ID as backlog', () => {
    expect(BACKLOG_DROPPABLE_ID).toBe('backlog');
  });
});
