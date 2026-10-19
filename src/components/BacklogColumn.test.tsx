import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BacklogColumn } from './BacklogColumn';
import type { Task } from '../types';

describe('BacklogColumn component', () => {
  const mockTasks: Task[] = [
    {
      id: 'task-1',
      title: 'Zadanie 1',
      status: 'todo',
      priority: 'medium',
      day: null,
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

  it('renders the Backlog column container with correct test id and accessibility label', () => {
    render(<BacklogColumn />);

    const column = screen.getByTestId('column-backlog');
    expect(column).toBeInTheDocument();
    expect(column).toHaveAttribute('aria-label', 'Backlog');

    expect(screen.getByText('Backlog')).toBeInTheDocument();
    expect(screen.getByText('(Inbox)')).toBeInTheDocument();
  });

  it('displays default 0 count when no tasks provided', () => {
    render(<BacklogColumn />);

    const countBadge = screen.getByTestId('backlog-count');
    expect(countBadge).toHaveTextContent('0');
  });

  it('displays correct count derived from tasks array or taskCount prop', () => {
    const { rerender } = render(<BacklogColumn tasks={mockTasks} />);
    expect(screen.getByTestId('backlog-count')).toHaveTextContent('2');

    rerender(<BacklogColumn taskCount={5} />);
    expect(screen.getByTestId('backlog-count')).toHaveTextContent('5');
  });

  it('renders empty state placeholder when no children are provided', () => {
    render(<BacklogColumn />);

    expect(screen.getByTestId('backlog-empty-state')).toBeInTheDocument();
    expect(screen.getByText('Brak zadań w Backlogu')).toBeInTheDocument();
  });

  it('renders children inside the droppable container', () => {
    render(
      <BacklogColumn>
        <div data-testid="child-task-1">Test Task 1</div>
        <div data-testid="child-task-2">Test Task 2</div>
      </BacklogColumn>
    );

    const droppable = screen.getByTestId('droppable-backlog');
    expect(droppable).toBeInTheDocument();
    expect(droppable).toHaveAttribute('id', 'backlog');

    expect(screen.getByTestId('child-task-1')).toBeInTheDocument();
    expect(screen.getByTestId('child-task-2')).toBeInTheDocument();
    expect(screen.queryByTestId('backlog-empty-state')).not.toBeInTheDocument();
  });

  it('renders headerAction when provided', () => {
    render(
      <BacklogColumn
        headerAction={<button data-testid="add-task-btn">+ Dodaj zadanie</button>}
      />
    );

    expect(screen.getByTestId('add-task-btn')).toBeInTheDocument();
  });

  it('renders AddTaskForm when onAddTask is provided and no headerAction', () => {
    const onAddTask = vi.fn();
    render(<BacklogColumn onAddTask={onAddTask} />);

    expect(screen.getByTestId('add-task-form')).toBeInTheDocument();
    expect(screen.getByTestId('add-task-input')).toBeInTheDocument();
  });

  it('prioritizes headerAction over onAddTask when both are provided', () => {
    const onAddTask = vi.fn();
    render(
      <BacklogColumn
        headerAction={<button data-testid="custom-action">Custom</button>}
        onAddTask={onAddTask}
      />
    );

    expect(screen.getByTestId('custom-action')).toBeInTheDocument();
    expect(screen.queryByTestId('add-task-form')).not.toBeInTheDocument();
  });
});
