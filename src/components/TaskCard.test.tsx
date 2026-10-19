import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TaskCard, PRIORITY_LABELS, PRIORITY_STYLES } from './TaskCard';
import type { Task, Priority } from '../types';

describe('TaskCard component', () => {
  const baseTask: Task = {
    id: 'task-123',
    title: 'Zaimplementować kafelek zadania',
    status: 'todo',
    priority: 'medium',
    day: 'mon',
    order: 0,
    createdAt: '2026-10-19T10:00:00.000Z',
  };

  describe('Rendering and Visual States', () => {
    it('renders the task card with basic attributes and title', () => {
      render(<TaskCard task={baseTask} />);

      const card = screen.getByTestId('task-card');
      expect(card).toBeInTheDocument();
      expect(card).toHaveAttribute('data-task-id', 'task-123');
      expect(card).toHaveAttribute('data-priority', 'medium');
      expect(card).toHaveAttribute('data-status', 'todo');
      expect(card).toHaveAttribute('data-overdue', 'false');

      const title = screen.getByTestId('task-title');
      expect(title).toHaveTextContent('Zaimplementować kafelek zadania');
      expect(title).not.toHaveClass('line-through');
    });

    it.each(['low', 'medium', 'high'] as Priority[])(
      'renders priority border and flag styling for priority: %s',
      (priority) => {
        const taskWithPriority: Task = { ...baseTask, priority };
        render(<TaskCard task={taskWithPriority} />);

        const card = screen.getByTestId('task-card');
        expect(card).toHaveAttribute('data-priority', priority);
        expect(card).toHaveClass(PRIORITY_STYLES[priority].border);

        const priorityBtn = screen.getByTestId('task-priority-btn');
        expect(priorityBtn).toBeInTheDocument();
        expect(priorityBtn).toHaveAttribute(
          'aria-label',
          `Priorytet: ${PRIORITY_LABELS[priority]}. Kliknij, aby zmienić`
        );
      }
    );

    it('renders done status with line-through title and checked checkbox', () => {
      const doneTask: Task = { ...baseTask, status: 'done' };
      render(<TaskCard task={doneTask} />);

      const card = screen.getByTestId('task-card');
      expect(card).toHaveAttribute('data-status', 'done');
      expect(card).toHaveClass('opacity-70');

      const title = screen.getByTestId('task-title');
      expect(title).toHaveClass('line-through');
      expect(title).toHaveClass('text-slate-400');

      const checkbox = screen.getByTestId('task-checkbox') as HTMLInputElement;
      expect(checkbox.checked).toBe(true);
    });

    it('renders overdue state with overdue badge and return button when task is todo', () => {
      const onReturnToBacklog = vi.fn();
      render(
        <TaskCard
          task={baseTask}
          isOverdue={true}
          onReturnToBacklog={onReturnToBacklog}
        />
      );

      const card = screen.getByTestId('task-card');
      expect(card).toHaveAttribute('data-overdue', 'true');
      expect(screen.getByTestId('task-overdue-badge')).toHaveTextContent('Zaległe');

      const returnBtn = screen.getByTestId('task-return-btn');
      expect(returnBtn).toBeInTheDocument();
      expect(returnBtn).toHaveAttribute('aria-label', 'Przywróć do Backlogu');
    });

    it('does not render overdue badge or return button when task is done even if isOverdue is true', () => {
      const doneTask: Task = { ...baseTask, status: 'done' };
      const onReturnToBacklog = vi.fn();
      render(
        <TaskCard
          task={doneTask}
          isOverdue={true}
          onReturnToBacklog={onReturnToBacklog}
        />
      );

      expect(screen.queryByTestId('task-overdue-badge')).not.toBeInTheDocument();
      expect(screen.queryByTestId('task-return-btn')).not.toBeInTheDocument();
    });

    it('applies dragging styles when isDragging prop is true', () => {
      render(<TaskCard task={baseTask} isDragging={true} />);

      const card = screen.getByTestId('task-card');
      expect(card).toHaveClass('cursor-grabbing');
      expect(card).toHaveClass('rotate-1');
    });
  });

  describe('Interactive Actions', () => {
    it('calls onToggleStatus when checkbox is clicked', () => {
      const onToggleStatus = vi.fn();
      render(<TaskCard task={baseTask} onToggleStatus={onToggleStatus} />);

      const checkbox = screen.getByTestId('task-checkbox');
      fireEvent.click(checkbox);

      expect(onToggleStatus).toHaveBeenCalledTimes(1);
      expect(onToggleStatus).toHaveBeenCalledWith('task-123');
    });

    it('calls onCyclePriority when priority button is clicked', () => {
      const onCyclePriority = vi.fn();
      render(<TaskCard task={baseTask} onCyclePriority={onCyclePriority} />);

      const priorityBtn = screen.getByTestId('task-priority-btn');
      fireEvent.click(priorityBtn);

      expect(onCyclePriority).toHaveBeenCalledTimes(1);
      expect(onCyclePriority).toHaveBeenCalledWith('task-123');
    });

    it('calls onDelete when delete button is clicked', () => {
      const onDelete = vi.fn();
      render(<TaskCard task={baseTask} onDelete={onDelete} />);

      const deleteBtn = screen.getByTestId('task-delete-btn');
      fireEvent.click(deleteBtn);

      expect(onDelete).toHaveBeenCalledTimes(1);
      expect(onDelete).toHaveBeenCalledWith('task-123');
    });

    it('calls onReturnToBacklog when return button is clicked', () => {
      const onReturnToBacklog = vi.fn();
      render(
        <TaskCard
          task={baseTask}
          isOverdue={true}
          onReturnToBacklog={onReturnToBacklog}
        />
      );

      const returnBtn = screen.getByTestId('task-return-btn');
      fireEvent.click(returnBtn);

      expect(onReturnToBacklog).toHaveBeenCalledTimes(1);
      expect(onReturnToBacklog).toHaveBeenCalledWith('task-123');
    });
  });

  describe('Inline Title Editing', () => {
    it('enters editing mode when title is double-clicked', () => {
      render(<TaskCard task={baseTask} />);

      expect(screen.queryByTestId('task-edit-input')).not.toBeInTheDocument();

      const title = screen.getByTestId('task-title');
      fireEvent.doubleClick(title);

      const input = screen.getByTestId('task-edit-input') as HTMLInputElement;
      expect(input).toBeInTheDocument();
      expect(input.value).toBe('Zaimplementować kafelek zadania');
    });

    it('enters editing mode when edit pencil button is clicked', () => {
      render(<TaskCard task={baseTask} />);

      const editBtn = screen.getByTestId('task-edit-btn');
      fireEvent.click(editBtn);

      const input = screen.getByTestId('task-edit-input') as HTMLInputElement;
      expect(input).toBeInTheDocument();
      expect(input.value).toBe('Zaimplementować kafelek zadania');
    });

    it('saves new title and exits edit mode on Enter key', () => {
      const onUpdateTitle = vi.fn();
      render(<TaskCard task={baseTask} onUpdateTitle={onUpdateTitle} />);

      fireEvent.click(screen.getByTestId('task-edit-btn'));

      const input = screen.getByTestId('task-edit-input');
      fireEvent.change(input, { target: { value: 'Zmieniona nazwa zadania' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

      expect(onUpdateTitle).toHaveBeenCalledTimes(1);
      expect(onUpdateTitle).toHaveBeenCalledWith('task-123', 'Zmieniona nazwa zadania');
      expect(screen.queryByTestId('task-edit-input')).not.toBeInTheDocument();
    });

    it('saves trimmed title on blur', () => {
      const onUpdateTitle = vi.fn();
      render(<TaskCard task={baseTask} onUpdateTitle={onUpdateTitle} />);

      fireEvent.click(screen.getByTestId('task-edit-btn'));

      const input = screen.getByTestId('task-edit-input');
      fireEvent.change(input, { target: { value: '   Nowy tytuł ze spacjami   ' } });
      fireEvent.blur(input);

      expect(onUpdateTitle).toHaveBeenCalledTimes(1);
      expect(onUpdateTitle).toHaveBeenCalledWith('task-123', 'Nowy tytuł ze spacjami');
      expect(screen.queryByTestId('task-edit-input')).not.toBeInTheDocument();
    });

    it('cancels editing on Escape key without updating title', () => {
      const onUpdateTitle = vi.fn();
      render(<TaskCard task={baseTask} onUpdateTitle={onUpdateTitle} />);

      fireEvent.click(screen.getByTestId('task-edit-btn'));

      const input = screen.getByTestId('task-edit-input');
      fireEvent.change(input, { target: { value: 'Niezapisana zmiana' } });
      fireEvent.keyDown(input, { key: 'Escape', code: 'Escape' });

      expect(onUpdateTitle).not.toHaveBeenCalled();
      expect(screen.queryByTestId('task-edit-input')).not.toBeInTheDocument();
      expect(screen.getByTestId('task-title')).toHaveTextContent('Zaimplementować kafelek zadania');
    });

    it('reverts to original title if input is emptied (whitespace-only)', () => {
      const onUpdateTitle = vi.fn();
      render(<TaskCard task={baseTask} onUpdateTitle={onUpdateTitle} />);

      fireEvent.click(screen.getByTestId('task-edit-btn'));

      const input = screen.getByTestId('task-edit-input');
      fireEvent.change(input, { target: { value: '   ' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

      expect(onUpdateTitle).not.toHaveBeenCalled();
      expect(screen.queryByTestId('task-edit-input')).not.toBeInTheDocument();
      expect(screen.getByTestId('task-title')).toHaveTextContent('Zaimplementować kafelek zadania');
    });

    it('does not call onUpdateTitle if title was not changed', () => {
      const onUpdateTitle = vi.fn();
      render(<TaskCard task={baseTask} onUpdateTitle={onUpdateTitle} />);

      fireEvent.click(screen.getByTestId('task-edit-btn'));

      const input = screen.getByTestId('task-edit-input');
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

      expect(onUpdateTitle).not.toHaveBeenCalled();
      expect(screen.queryByTestId('task-edit-input')).not.toBeInTheDocument();
    });
  });

  describe('Event Propagation Isolation (DnD protection)', () => {
    it('stops event propagation when clicking interactive elements', () => {
      const containerClick = vi.fn();

      render(
        <div onClick={containerClick} data-testid="outer-container">
          <TaskCard
            task={baseTask}
            isOverdue={true}
            onToggleStatus={() => {}}
            onCyclePriority={() => {}}
            onDelete={() => {}}
            onReturnToBacklog={() => {}}
          />
        </div>
      );

      // Checkbox
      fireEvent.click(screen.getByTestId('task-checkbox'));
      expect(containerClick).not.toHaveBeenCalled();

      // Priority button
      fireEvent.click(screen.getByTestId('task-priority-btn'));
      expect(containerClick).not.toHaveBeenCalled();

      // Delete button
      fireEvent.click(screen.getByTestId('task-delete-btn'));
      expect(containerClick).not.toHaveBeenCalled();

      // Return button
      fireEvent.click(screen.getByTestId('task-return-btn'));
      expect(containerClick).not.toHaveBeenCalled();

      // Edit button
      fireEvent.click(screen.getByTestId('task-edit-btn'));
      expect(containerClick).not.toHaveBeenCalled();

      // Input field
      fireEvent.click(screen.getByTestId('task-edit-input'));
      expect(containerClick).not.toHaveBeenCalled();
    });

    it('stops pointerDown and mouseDown propagation to prevent accidental DnD activation', () => {
      const containerPointerDown = vi.fn();
      const containerMouseDown = vi.fn();

      render(
        <div
          onPointerDown={containerPointerDown}
          onMouseDown={containerMouseDown}
          data-testid="outer-container"
        >
          <TaskCard
            task={baseTask}
            isOverdue={true}
            onToggleStatus={() => {}}
            onCyclePriority={() => {}}
            onDelete={() => {}}
            onReturnToBacklog={() => {}}
          />
        </div>
      );

      // Checkbox
      fireEvent.pointerDown(screen.getByTestId('task-checkbox'));
      fireEvent.mouseDown(screen.getByTestId('task-checkbox'));
      expect(containerPointerDown).not.toHaveBeenCalled();
      expect(containerMouseDown).not.toHaveBeenCalled();

      // Priority button
      fireEvent.pointerDown(screen.getByTestId('task-priority-btn'));
      fireEvent.mouseDown(screen.getByTestId('task-priority-btn'));
      expect(containerPointerDown).not.toHaveBeenCalled();
      expect(containerMouseDown).not.toHaveBeenCalled();

      // Delete button
      fireEvent.pointerDown(screen.getByTestId('task-delete-btn'));
      fireEvent.mouseDown(screen.getByTestId('task-delete-btn'));
      expect(containerPointerDown).not.toHaveBeenCalled();
      expect(containerMouseDown).not.toHaveBeenCalled();

      // Return button
      fireEvent.pointerDown(screen.getByTestId('task-return-btn'));
      fireEvent.mouseDown(screen.getByTestId('task-return-btn'));
      expect(containerPointerDown).not.toHaveBeenCalled();
      expect(containerMouseDown).not.toHaveBeenCalled();

      // Edit button
      fireEvent.pointerDown(screen.getByTestId('task-edit-btn'));
      fireEvent.mouseDown(screen.getByTestId('task-edit-btn'));
      expect(containerPointerDown).not.toHaveBeenCalled();
      expect(containerMouseDown).not.toHaveBeenCalled();
    });

    it('renders touch-none and cursor-grab styles by default for DnD touch/mouse support', () => {
      render(<TaskCard task={baseTask} />);
      const card = screen.getByTestId('task-card');
      expect(card).toHaveClass('touch-none');
      expect(card).toHaveClass('cursor-grab');
    });
  });

  describe('Accessibility (a11y)', () => {
    it('provides accessible labels for all icon buttons', () => {
      render(
        <TaskCard
          task={baseTask}
          isOverdue={true}
          onReturnToBacklog={() => {}}
        />
      );

      expect(screen.getByTestId('task-priority-btn')).toHaveAttribute('aria-label');
      expect(screen.getByTestId('task-edit-btn')).toHaveAttribute('aria-label', 'Edytuj zadanie');
      expect(screen.getByTestId('task-delete-btn')).toHaveAttribute('aria-label', 'Usuń zadanie');
      expect(screen.getByTestId('task-return-btn')).toHaveAttribute('aria-label', 'Przywróć do Backlogu');
      expect(screen.getByTestId('task-checkbox')).toHaveAttribute(
        'aria-label',
        `Oznacz jako ukończone: ${baseTask.title}`
      );
    });
  });
});
