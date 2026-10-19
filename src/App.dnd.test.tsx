import { render, screen, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  type DragCancelEvent,
  type DndContextProps,
} from '@dnd-kit/core';
import App from './App';
import { DEFAULT_TASKS_STORAGE_KEY } from './utils/storage';
import { kanbanCollisionDetection } from './utils';
import type { Task } from './types';

// Przechwytywanie właściwości przekazanych do DndContext w celu precyzyjnej weryfikacji konfiguracji
let capturedDndProps: DndContextProps = {};

vi.mock('@dnd-kit/core', async () => {
  const actual = await vi.importActual<typeof import('@dnd-kit/core')>('@dnd-kit/core');
  return {
    ...actual,
    DndContext: (props: DndContextProps) => {
      capturedDndProps = props;
      return <actual.DndContext {...props}>{props.children}</actual.DndContext>;
    },
  };
});

describe('App DndContext and Sensor Configuration Integration', () => {
  const initialTask: Task = {
    id: 'test-drag-task-1',
    title: 'Zadanie do testu DndContext',
    status: 'todo',
    priority: 'high',
    day: null,
    order: 0,
    createdAt: '2026-10-19T10:00:00.000Z',
  };

  beforeEach(() => {
    localStorage.clear();
    capturedDndProps = {};
    vi.restoreAllMocks();
  });

  it('configures DndContext with kanbanCollisionDetection and 2 sensors', () => {
    render(<App />);

    expect(capturedDndProps).toBeDefined();
    expect(capturedDndProps.collisionDetection).toBe(kanbanCollisionDetection);
    expect(capturedDndProps.sensors).toBeDefined();
    expect(capturedDndProps.sensors).toHaveLength(2);
    expect(typeof capturedDndProps.onDragStart).toBe('function');
    expect(typeof capturedDndProps.onDragOver).toBe('function');
    expect(typeof capturedDndProps.onDragEnd).toBe('function');
    expect(typeof capturedDndProps.onDragCancel).toBe('function');
  });

  it('sets activeTaskId and applies dragging styles to the corresponding task card on onDragStart', () => {
    localStorage.setItem(DEFAULT_TASKS_STORAGE_KEY, JSON.stringify([initialTask]));
    const onDragStartCallback = vi.fn();

    render(<App onDragStart={onDragStartCallback} />);

    const card = screen.getByTestId('task-card');
    const container = screen.getByTestId('app-container');

    expect(container).not.toHaveAttribute('data-active-task-id');
    expect(card).not.toHaveClass('cursor-grabbing');

    const fakeStartEvent = {
      active: {
        id: initialTask.id,
        data: { current: {} },
        rect: { current: { translated: null, initial: null } },
      },
    } as unknown as DragStartEvent;

    act(() => {
      capturedDndProps.onDragStart?.(fakeStartEvent);
    });

    expect(container).toHaveAttribute('data-active-task-id', initialTask.id);
    expect(card).toHaveClass('cursor-grabbing');
    expect(card).toHaveClass('rotate-1');
    expect(card).toHaveClass('ring-2');
    expect(card).toHaveClass('ring-blue-400');
    expect(onDragStartCallback).toHaveBeenCalledTimes(1);
    expect(onDragStartCallback).toHaveBeenCalledWith(fakeStartEvent);
  });

  it('clears activeTaskId and resets dragging styles on onDragEnd', () => {
    localStorage.setItem(DEFAULT_TASKS_STORAGE_KEY, JSON.stringify([initialTask]));
    const onDragEndCallback = vi.fn();

    render(<App onDragEnd={onDragEndCallback} />);

    const fakeStartEvent = {
      active: { id: initialTask.id },
    } as unknown as DragStartEvent;

    const fakeEndEvent = {
      active: { id: initialTask.id },
      over: null,
    } as unknown as DragEndEvent;

    act(() => {
      capturedDndProps.onDragStart?.(fakeStartEvent);
    });

    const card = screen.getByTestId('task-card');
    const container = screen.getByTestId('app-container');
    expect(container).toHaveAttribute('data-active-task-id', initialTask.id);
    expect(card).toHaveClass('cursor-grabbing');

    act(() => {
      capturedDndProps.onDragEnd?.(fakeEndEvent);
    });

    expect(container).not.toHaveAttribute('data-active-task-id');
    expect(card).not.toHaveClass('cursor-grabbing');
    expect(card).toHaveClass('cursor-grab');
    expect(onDragEndCallback).toHaveBeenCalledTimes(1);
    expect(onDragEndCallback).toHaveBeenCalledWith(fakeEndEvent);
  });

  it('clears activeTaskId on onDragCancel', () => {
    localStorage.setItem(DEFAULT_TASKS_STORAGE_KEY, JSON.stringify([initialTask]));
    const onDragCancelCallback = vi.fn();

    render(<App onDragCancel={onDragCancelCallback} />);

    act(() => {
      capturedDndProps.onDragStart?.({
        active: { id: initialTask.id },
      } as unknown as DragStartEvent);
    });

    const container = screen.getByTestId('app-container');
    expect(container).toHaveAttribute('data-active-task-id', initialTask.id);

    const fakeCancelEvent = {
      active: { id: initialTask.id },
    } as unknown as DragCancelEvent;

    act(() => {
      capturedDndProps.onDragCancel?.(fakeCancelEvent);
    });

    expect(container).not.toHaveAttribute('data-active-task-id');
    expect(onDragCancelCallback).toHaveBeenCalledTimes(1);
    expect(onDragCancelCallback).toHaveBeenCalledWith(fakeCancelEvent);
  });

  it('invokes onDragOver prop when drag over event occurs', () => {
    const onDragOverCallback = vi.fn();
    render(<App onDragOver={onDragOverCallback} />);

    const fakeOverEvent = {
      active: { id: initialTask.id },
      over: { id: 'column-mon' },
    } as unknown as DragOverEvent;

    act(() => {
      capturedDndProps.onDragOver?.(fakeOverEvent);
    });

    expect(onDragOverCallback).toHaveBeenCalledTimes(1);
    expect(onDragOverCallback).toHaveBeenCalledWith(fakeOverEvent);
  });

  describe('Drag and Drop Task Reordering and Column Moving', () => {
    it('moves a task from Backlog to an empty Day column when dropped onto the column droppable', () => {
      const task: Task = {
        id: 'backlog-to-mon',
        title: 'Zadanie z backlogu do poniedziałku',
        status: 'todo',
        priority: 'medium',
        day: null,
        order: 0,
        createdAt: '2026-10-19T10:00:00.000Z',
      };
      localStorage.setItem(DEFAULT_TASKS_STORAGE_KEY, JSON.stringify([task]));

      render(<App />);

      expect(screen.getByTestId('backlog-count')).toHaveTextContent('1');
      expect(screen.getByTestId('day-count-mon')).toHaveTextContent('0');

      act(() => {
        capturedDndProps.onDragEnd?.({
          active: { id: task.id },
          over: { id: 'mon' },
        } as unknown as DragEndEvent);
      });

      expect(screen.getByTestId('backlog-count')).toHaveTextContent('0');
      expect(screen.getByTestId('day-count-mon')).toHaveTextContent('1');

      const savedTasks: Task[] = JSON.parse(
        localStorage.getItem(DEFAULT_TASKS_STORAGE_KEY) || '[]'
      );
      expect(savedTasks).toHaveLength(1);
      expect(savedTasks[0].day).toBe('mon');
      expect(savedTasks[0].order).toBe(0);
    });

    it('moves a task from a Day column back to Backlog when dropped onto droppable-backlog', () => {
      const task: Task = {
        id: 'mon-to-backlog',
        title: 'Cofnij do backlogu',
        status: 'todo',
        priority: 'high',
        day: 'mon',
        order: 0,
        createdAt: '2026-10-19T10:00:00.000Z',
      };
      localStorage.setItem(DEFAULT_TASKS_STORAGE_KEY, JSON.stringify([task]));

      render(<App />);

      expect(screen.getByTestId('day-count-mon')).toHaveTextContent('1');
      expect(screen.getByTestId('backlog-count')).toHaveTextContent('0');

      act(() => {
        capturedDndProps.onDragEnd?.({
          active: { id: task.id },
          over: { id: 'backlog' },
        } as unknown as DragEndEvent);
      });

      expect(screen.getByTestId('day-count-mon')).toHaveTextContent('0');
      expect(screen.getByTestId('backlog-count')).toHaveTextContent('1');

      const savedTasks: Task[] = JSON.parse(
        localStorage.getItem(DEFAULT_TASKS_STORAGE_KEY) || '[]'
      );
      expect(savedTasks[0].day).toBeNull();
      expect(savedTasks[0].order).toBe(0);
    });

    it('reorders tasks within the same column when dropped over another task', () => {
      const task1: Task = {
        id: 'task-1',
        title: 'Pierwsze zadanie',
        status: 'todo',
        priority: 'low',
        day: 'tue',
        order: 0,
        createdAt: '2026-10-19T10:00:00.000Z',
      };
      const task2: Task = {
        id: 'task-2',
        title: 'Drugie zadanie',
        status: 'todo',
        priority: 'high',
        day: 'tue',
        order: 1,
        createdAt: '2026-10-19T10:05:00.000Z',
      };
      localStorage.setItem(DEFAULT_TASKS_STORAGE_KEY, JSON.stringify([task1, task2]));

      render(<App />);

      const columnTue = screen.getByTestId('column-day-tue');
      expect(columnTue).toBeInTheDocument();

      // Przesuń drugie zadanie przed pierwsze
      act(() => {
        capturedDndProps.onDragEnd?.({
          active: { id: task2.id },
          over: { id: task1.id },
        } as unknown as DragEndEvent);
      });

      const savedTasks: Task[] = JSON.parse(
        localStorage.getItem(DEFAULT_TASKS_STORAGE_KEY) || '[]'
      );
      const updatedTask2 = savedTasks.find((t) => t.id === 'task-2');
      const updatedTask1 = savedTasks.find((t) => t.id === 'task-1');

      expect(updatedTask2?.order).toBe(0);
      expect(updatedTask1?.order).toBe(1);
    });

    it('moves a task between two different days by dropping over an existing task', () => {
      const taskMon: Task = {
        id: 'task-mon',
        title: 'Zadanie z poniedziałku',
        status: 'todo',
        priority: 'medium',
        day: 'mon',
        order: 0,
        createdAt: '2026-10-19T10:00:00.000Z',
      };
      const taskFri: Task = {
        id: 'task-fri',
        title: 'Zadanie z piątku',
        status: 'todo',
        priority: 'high',
        day: 'fri',
        order: 0,
        createdAt: '2026-10-19T10:05:00.000Z',
      };
      localStorage.setItem(DEFAULT_TASKS_STORAGE_KEY, JSON.stringify([taskMon, taskFri]));

      render(<App />);

      expect(screen.getByTestId('day-count-mon')).toHaveTextContent('1');
      expect(screen.getByTestId('day-count-fri')).toHaveTextContent('1');

      act(() => {
        capturedDndProps.onDragEnd?.({
          active: { id: taskMon.id },
          over: { id: taskFri.id },
        } as unknown as DragEndEvent);
      });

      expect(screen.getByTestId('day-count-mon')).toHaveTextContent('0');
      expect(screen.getByTestId('day-count-fri')).toHaveTextContent('2');

      const savedTasks: Task[] = JSON.parse(
        localStorage.getItem(DEFAULT_TASKS_STORAGE_KEY) || '[]'
      );
      const movedTask = savedTasks.find((t) => t.id === 'task-mon');
      expect(movedTask?.day).toBe('fri');
      expect(movedTask?.order).toBe(0);
    });

    it('does not alter tasks if dropped on itself or outside any droppable target', () => {
      const task: Task = {
        id: 'task-unchanged',
        title: 'Niezmienne zadanie',
        status: 'todo',
        priority: 'low',
        day: 'wed',
        order: 0,
        createdAt: '2026-10-19T10:00:00.000Z',
      };
      localStorage.setItem(DEFAULT_TASKS_STORAGE_KEY, JSON.stringify([task]));

      render(<App />);

      // Upuszczenie na samego siebie
      act(() => {
        capturedDndProps.onDragEnd?.({
          active: { id: task.id },
          over: { id: task.id },
        } as unknown as DragEndEvent);
      });

      let savedTasks: Task[] = JSON.parse(
        localStorage.getItem(DEFAULT_TASKS_STORAGE_KEY) || '[]'
      );
      expect(savedTasks[0].day).toBe('wed');
      expect(savedTasks[0].order).toBe(0);

      // Upuszczenie w próżnię (over: null)
      act(() => {
        capturedDndProps.onDragEnd?.({
          active: { id: task.id },
          over: null,
        } as unknown as DragEndEvent);
      });

      savedTasks = JSON.parse(
        localStorage.getItem(DEFAULT_TASKS_STORAGE_KEY) || '[]'
      );
      expect(savedTasks[0].day).toBe('wed');
      expect(savedTasks[0].order).toBe(0);
    });
  });
});
