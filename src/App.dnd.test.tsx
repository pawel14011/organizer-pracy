import { render, screen, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  type DragCancelEvent,
  type DndContextProps,
} from '@dnd-kit/core';
import App from './App';
import { DEFAULT_TASKS_STORAGE_KEY } from './utils/storage';
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

  it('configures DndContext with closestCorners collision detection and 2 sensors', () => {
    render(<App />);

    expect(capturedDndProps).toBeDefined();
    expect(capturedDndProps.collisionDetection).toBe(closestCorners);
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
});
