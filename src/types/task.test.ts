import { describe, it, expect } from 'vitest';
import { Task, DayOfWeek, Priority, TaskStatus, Weekday } from './task';

describe('task types', () => {
  it('allows creating a valid Task object in Backlog', () => {
    const backlogTask: Task = {
      id: 'task-1',
      title: 'Zadanie w backlogu',
      status: 'todo',
      priority: 'medium',
      day: null,
      order: 0,
      createdAt: '2026-10-19T10:00:00.000Z',
    };

    expect(backlogTask.id).toBe('task-1');
    expect(backlogTask.day).toBeNull();
    expect(backlogTask.status).toBe('todo');
    expect(backlogTask.priority).toBe('medium');
  });

  it('allows creating a valid Task assigned to a specific weekday', () => {
    const plannedTask: Task = {
      id: 'task-2',
      title: 'Zadanie zaplanowane na wtorek',
      status: 'done',
      priority: 'high',
      day: 'tue',
      order: 1,
      createdAt: '2026-10-19T11:00:00.000Z',
    };

    expect(plannedTask.day).toBe('tue');
    expect(plannedTask.status).toBe('done');
    expect(plannedTask.priority).toBe('high');
  });

  it('verifies type constraints compile correctly', () => {
    const priorities: Priority[] = ['low', 'medium', 'high'];
    const statuses: TaskStatus[] = ['todo', 'done'];
    const weekdays: Weekday[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    const daysOfWeek: DayOfWeek[] = [...weekdays, null];

    expect(priorities).toHaveLength(3);
    expect(statuses).toHaveLength(2);
    expect(weekdays).toHaveLength(7);
    expect(daysOfWeek).toHaveLength(8);
  });
});
