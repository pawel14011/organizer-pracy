import { render, screen, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  type DragCancelEvent,
  type DndContextProps,
} from '@dnd-kit/core';
import App, { dropAnimationConfig } from './App';
import { DEFAULT_TASKS_STORAGE_KEY } from './utils/storage';
import { kanbanCollisionDetection } from './utils';
import type { Task } from './types';

// Przechwytywanie właściwości przekazanych do DndContext w celu precyzyjnej weryfikacji konfiguracji
let capturedDndProps: DndContextProps = {};
let capturedDragOverlayProps: { dropAnimation?: unknown } = {};

vi.mock('@dnd-kit/core', async () => {
  const actual = await vi.importActual<typeof import('@dnd-kit/core')>('@dnd-kit/core');
  return {
    ...actual,
    DndContext: (props: DndContextProps) => {
      capturedDndProps = props;
      return <actual.DndContext {...props}>{props.children}</actual.DndContext>;
    },
    DragOverlay: ({
      children,
      ...props
    }: {
      children?: React.ReactNode;
      dropAnimation?: unknown;
    }) => {
      capturedDragOverlayProps = props;
      return (
        <div data-testid="drag-overlay-root">
          {children}
        </div>
      );
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
    capturedDragOverlayProps = {};
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

    it('moves a task from one day to another empty day by dropping directly on the day column container', () => {
      const task: Task = {
        id: 'task-thu-to-sat',
        title: 'Przenieś z czwartku na pustą sobotę',
        status: 'todo',
        priority: 'high',
        day: 'thu',
        order: 0,
        createdAt: '2026-10-19T10:00:00.000Z',
      };
      localStorage.setItem(DEFAULT_TASKS_STORAGE_KEY, JSON.stringify([task]));

      render(<App />);

      expect(screen.getByTestId('day-count-thu')).toHaveTextContent('1');
      expect(screen.getByTestId('day-count-sat')).toHaveTextContent('0');

      act(() => {
        capturedDndProps.onDragEnd?.({
          active: { id: task.id },
          over: { id: 'sat' },
        } as unknown as DragEndEvent);
      });

      expect(screen.getByTestId('day-count-thu')).toHaveTextContent('0');
      expect(screen.getByTestId('day-count-sat')).toHaveTextContent('1');

      const savedTasks: Task[] = JSON.parse(
        localStorage.getItem(DEFAULT_TASKS_STORAGE_KEY) || '[]'
      );
      expect(savedTasks[0].day).toBe('sat');
      expect(savedTasks[0].order).toBe(0);
    });

    it('reorders tasks within Backlog using arrayMove when dropped over another backlog task', () => {
      const backlogTask1: Task = {
        id: 'backlog-1',
        title: 'Pierwsze w backlogu',
        status: 'todo',
        priority: 'low',
        day: null,
        order: 0,
        createdAt: '2026-10-19T10:00:00.000Z',
      };
      const backlogTask2: Task = {
        id: 'backlog-2',
        title: 'Drugie w backlogu',
        status: 'todo',
        priority: 'high',
        day: null,
        order: 1,
        createdAt: '2026-10-19T10:05:00.000Z',
      };
      localStorage.setItem(
        DEFAULT_TASKS_STORAGE_KEY,
        JSON.stringify([backlogTask1, backlogTask2])
      );

      render(<App />);

      expect(screen.getByTestId('backlog-count')).toHaveTextContent('2');

      // Przesuń drugie zadanie na pozycję pierwszego
      act(() => {
        capturedDndProps.onDragEnd?.({
          active: { id: backlogTask2.id },
          over: { id: backlogTask1.id },
        } as unknown as DragEndEvent);
      });

      const savedTasks: Task[] = JSON.parse(
        localStorage.getItem(DEFAULT_TASKS_STORAGE_KEY) || '[]'
      );
      const updated2 = savedTasks.find((t) => t.id === 'backlog-2');
      const updated1 = savedTasks.find((t) => t.id === 'backlog-1');

      expect(updated2?.order).toBe(0);
      expect(updated1?.order).toBe(1);
    });

    it('guarantees persistence across page reloads (simulating F5 refresh)', () => {
      const task1: Task = {
        id: 'task-f5-1',
        title: 'Zadanie do zaplanowania na środę',
        status: 'todo',
        priority: 'medium',
        day: null,
        order: 0,
        createdAt: '2026-10-19T10:00:00.000Z',
      };
      const task2: Task = {
        id: 'task-f5-2',
        title: 'Zadanie z poniedziałku do backlogu',
        status: 'done',
        priority: 'high',
        day: 'mon',
        order: 0,
        createdAt: '2026-10-19T10:00:00.000Z',
      };
      localStorage.setItem(DEFAULT_TASKS_STORAGE_KEY, JSON.stringify([task1, task2]));

      // Pierwsze renderowanie aplikacji
      const { unmount } = render(<App />);

      expect(screen.getByTestId('backlog-count')).toHaveTextContent('1');
      expect(screen.getByTestId('day-count-wed')).toHaveTextContent('0');
      expect(screen.getByTestId('day-count-mon')).toHaveTextContent('1');

      // Krok 1: Przeciągnięcie zadania 1 z Backlogu do Środy
      act(() => {
        capturedDndProps.onDragEnd?.({
          active: { id: task1.id },
          over: { id: 'wed' },
        } as unknown as DragEndEvent);
      });

      // Krok 2: Przeciągnięcie zadania 2 z Poniedziałku do Backlogu
      act(() => {
        capturedDndProps.onDragEnd?.({
          active: { id: task2.id },
          over: { id: 'backlog' },
        } as unknown as DragEndEvent);
      });

      expect(screen.getByTestId('day-count-wed')).toHaveTextContent('1');
      expect(screen.getByTestId('day-count-mon')).toHaveTextContent('0');
      expect(screen.getByTestId('backlog-count')).toHaveTextContent('1');

      // Symulacja odświeżenia strony (F5): odmontowanie i ponowne zamontowanie komponentu App
      unmount();
      render(<App />);

      // Weryfikacja: zadania pozostają dokładnie w tych miejscach, w których zostały upuszczone
      expect(screen.getByTestId('day-count-wed')).toHaveTextContent('1');
      expect(screen.getByTestId('day-count-mon')).toHaveTextContent('0');
      expect(screen.getByTestId('backlog-count')).toHaveTextContent('1');

      const reloadedTasks: Task[] = JSON.parse(
        localStorage.getItem(DEFAULT_TASKS_STORAGE_KEY) || '[]'
      );
      const reloadedTask1 = reloadedTasks.find((t) => t.id === 'task-f5-1');
      const reloadedTask2 = reloadedTasks.find((t) => t.id === 'task-f5-2');

      expect(reloadedTask1?.day).toBe('wed');
      expect(reloadedTask1?.order).toBe(0);
      expect(reloadedTask2?.day).toBeNull();
      expect(reloadedTask2?.order).toBe(0);
    });
  });

  describe('DragOverlay Floating Preview and Drop Animation', () => {
    it('configures DragOverlay with dropAnimationConfig matching specification', () => {
      render(<App />);

      expect(capturedDragOverlayProps).toBeDefined();
      expect(capturedDragOverlayProps.dropAnimation).toEqual(dropAnimationConfig);
      expect(dropAnimationConfig).toMatchObject({
        duration: 180,
        easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
      });
    });

    it('renders the floating preview with rotate-2 and scale-105 when dragging starts', () => {
      const task: Task = {
        id: 'overlay-preview-task',
        title: 'Zadanie w DragOverlay',
        status: 'todo',
        priority: 'high',
        day: null,
        order: 0,
        createdAt: '2026-10-19T10:00:00.000Z',
      };
      localStorage.setItem(DEFAULT_TASKS_STORAGE_KEY, JSON.stringify([task]));

      render(<App />);

      // Przed rozpoczęciem przeciągania DragOverlay nie zawiera kafelka
      expect(screen.queryByTestId('drag-overlay-card')).not.toBeInTheDocument();
      expect(screen.queryByTestId('drag-overlay-wrapper')).not.toBeInTheDocument();

      // Rozpoczęcie przeciągania
      act(() => {
        capturedDndProps.onDragStart?.({
          active: { id: task.id },
        } as unknown as DragStartEvent);
      });

      // Podgląd w DragOverlay jest widoczny z odpowiednią stylizacją
      const overlayWrapper = screen.getByTestId('drag-overlay-wrapper');
      const overlayCard = screen.getByTestId('drag-overlay-card');

      expect(overlayWrapper).toBeInTheDocument();
      expect(overlayWrapper).toHaveClass('rotate-2');
      expect(overlayWrapper).toHaveClass('pointer-events-none');

      expect(overlayCard).toBeInTheDocument();
      expect(overlayCard).toHaveTextContent('Zadanie w DragOverlay');
      expect(overlayCard).toHaveClass('shadow-2xl');
      expect(overlayCard).toHaveClass('ring-2');
      expect(overlayCard).toHaveClass('ring-blue-500');
      expect(overlayCard).toHaveClass('scale-105');
      expect(overlayCard).toHaveClass('cursor-grabbing');

      // Zakończenie przeciągania: DragOverlay czyści podgląd
      act(() => {
        capturedDndProps.onDragEnd?.({
          active: { id: task.id },
          over: null,
        } as unknown as DragEndEvent);
      });

      expect(screen.queryByTestId('drag-overlay-card')).not.toBeInTheDocument();
      expect(screen.queryByTestId('drag-overlay-wrapper')).not.toBeInTheDocument();
    });

    it('clears the DragOverlay floating preview when dragging is canceled (e.g. Escape)', () => {
      const task: Task = {
        id: 'overlay-cancel-task',
        title: 'Anulowane przeciąganie',
        status: 'todo',
        priority: 'medium',
        day: 'tue',
        order: 0,
        createdAt: '2026-10-19T10:00:00.000Z',
      };
      localStorage.setItem(DEFAULT_TASKS_STORAGE_KEY, JSON.stringify([task]));

      render(<App />);

      act(() => {
        capturedDndProps.onDragStart?.({
          active: { id: task.id },
        } as unknown as DragStartEvent);
      });

      expect(screen.getByTestId('drag-overlay-card')).toBeInTheDocument();

      act(() => {
        capturedDndProps.onDragCancel?.({
          active: { id: task.id },
        } as unknown as DragCancelEvent);
      });

      expect(screen.queryByTestId('drag-overlay-card')).not.toBeInTheDocument();
      expect(screen.queryByTestId('drag-overlay-wrapper')).not.toBeInTheDocument();
    });
  });
});
