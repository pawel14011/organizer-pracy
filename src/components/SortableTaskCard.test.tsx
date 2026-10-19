import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SortableTaskCard } from './SortableTaskCard';
import type { Task } from '../types';

describe('SortableTaskCard component', () => {
  const mockTask: Task = {
    id: 'sortable-task-1',
    title: 'Zadanie do testu sortowania',
    status: 'todo',
    priority: 'high',
    day: null,
    order: 0,
    createdAt: '2026-10-19T10:00:00.000Z',
  };

  it('renders TaskCard with correct task data, accessibility labels and sortable marker', () => {
    render(<SortableTaskCard task={mockTask} />);

    const card = screen.getByTestId('task-card');
    expect(card).toBeInTheDocument();
    expect(card).toHaveAttribute('data-task-id', 'sortable-task-1');
    expect(card).toHaveAttribute('data-priority', 'high');
    expect(card).toHaveAttribute('data-status', 'todo');
    expect(card).toHaveAttribute('data-sortable', 'true');
    expect(screen.getByText('Zadanie do testu sortowania')).toBeInTheDocument();
  });

  it('forwards toggle status callback when checkbox is clicked', () => {
    const onToggleStatus = vi.fn();
    render(<SortableTaskCard task={mockTask} onToggleStatus={onToggleStatus} />);

    const checkbox = screen.getByTestId('task-checkbox');
    fireEvent.click(checkbox);

    expect(onToggleStatus).toHaveBeenCalledTimes(1);
    expect(onToggleStatus).toHaveBeenCalledWith('sortable-task-1');
  });

  it('forwards cycle priority callback when priority flag is clicked', () => {
    const onCyclePriority = vi.fn();
    render(<SortableTaskCard task={mockTask} onCyclePriority={onCyclePriority} />);

    const flagBtn = screen.getByTestId('task-priority-btn');
    fireEvent.click(flagBtn);

    expect(onCyclePriority).toHaveBeenCalledTimes(1);
    expect(onCyclePriority).toHaveBeenCalledWith('sortable-task-1');
  });

  it('forwards delete callback when trash icon is clicked', () => {
    const onDelete = vi.fn();
    render(<SortableTaskCard task={mockTask} onDelete={onDelete} />);

    const deleteBtn = screen.getByTestId('task-delete-btn');
    fireEvent.click(deleteBtn);

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledWith('sortable-task-1');
  });

  it('forwards return to backlog callback when overdue and return button is clicked', () => {
    const onReturnToBacklog = vi.fn();
    const overdueTask: Task = {
      ...mockTask,
      day: 'mon',
    };

    render(
      <SortableTaskCard
        task={overdueTask}
        isOverdue={true}
        onReturnToBacklog={onReturnToBacklog}
      />
    );

    const returnBtn = screen.getByTestId('task-return-btn');
    fireEvent.click(returnBtn);

    expect(onReturnToBacklog).toHaveBeenCalledTimes(1);
    expect(onReturnToBacklog).toHaveBeenCalledWith('sortable-task-1');
  });

  it('applies custom className and user style seamlessly', () => {
    render(
      <SortableTaskCard
        task={mockTask}
        className="custom-sortable-class"
        style={{ marginTop: '10px' }}
      />
    );

    const card = screen.getByTestId('task-card');
    expect(card).toHaveClass('custom-sortable-class');
    expect(card).toHaveStyle({ marginTop: '10px' });
  });

  it('allows inline editing without triggering drag interactions', () => {
    const onUpdateTitle = vi.fn();
    render(
      <SortableTaskCard task={mockTask} onUpdateTitle={onUpdateTitle} />
    );

    const editBtn = screen.getByTestId('task-edit-btn');
    fireEvent.click(editBtn);

    const input = screen.getByTestId('task-edit-input');
    expect(input).toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'Zaktualizowany tytuł' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(onUpdateTitle).toHaveBeenCalledTimes(1);
    expect(onUpdateTitle).toHaveBeenCalledWith('sortable-task-1', 'Zaktualizowany tytuł');
  });
});
