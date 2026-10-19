import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DayColumn } from './DayColumn';
import type { Task } from '../types';

describe('DayColumn component', () => {
  const mockTasks: Task[] = [
    {
      id: 'task-mon-1',
      title: 'Zadanie poniedziałkowe',
      status: 'todo',
      priority: 'low',
      day: 'mon',
      order: 0,
      createdAt: '2026-10-19T10:00:00.000Z',
    },
  ];

  it('renders column with Polish day label and testid', () => {
    render(<DayColumn day="mon" />);

    const column = screen.getByTestId('column-day-mon');
    expect(column).toBeInTheDocument();
    expect(column).toHaveAttribute('data-day', 'mon');
    expect(column).toHaveAttribute('aria-label', 'Poniedziałek');

    expect(screen.getByText('Poniedziałek')).toBeInTheDocument();
  });

  it('displays count badge based on tasks or taskCount prop', () => {
    const { rerender } = render(<DayColumn day="wed" tasks={mockTasks} />);
    expect(screen.getByTestId('day-count-wed')).toHaveTextContent('1');

    rerender(<DayColumn day="wed" taskCount={7} />);
    expect(screen.getByTestId('day-count-wed')).toHaveTextContent('7');
  });

  it('renders "DZISIAJ" badge and today styling when isToday is true', () => {
    const { rerender } = render(<DayColumn day="tue" isToday={true} />);

    expect(screen.getByTestId('badge-today-tue')).toBeInTheDocument();
    expect(screen.getByText('DZISIAJ')).toBeInTheDocument();

    const column = screen.getByTestId('column-day-tue');
    expect(column).toHaveClass('border-blue-300');
    expect(column).toHaveAttribute('aria-label', 'Wtorek (Dzisiaj)');

    rerender(<DayColumn day="tue" isToday={false} />);
    expect(screen.queryByTestId('badge-today-tue')).not.toBeInTheDocument();
  });

  it('renders empty state placeholder when no children are provided', () => {
    render(<DayColumn day="fri" />);

    expect(screen.getByTestId('day-empty-state-fri')).toBeInTheDocument();
    expect(screen.getByText('Brak zadań')).toBeInTheDocument();
  });

  it('renders children inside droppable container with proper id and testid', () => {
    render(
      <DayColumn day="thu">
        <div data-testid="task-thu-child">Czwartek zadanie</div>
      </DayColumn>
    );

    const droppable = screen.getByTestId('droppable-thu');
    expect(droppable).toBeInTheDocument();
    expect(droppable).toHaveAttribute('id', 'thu');

    expect(screen.getByTestId('task-thu-child')).toBeInTheDocument();
    expect(screen.queryByTestId('day-empty-state-thu')).not.toBeInTheDocument();
  });

  it('renders headerAction when provided', () => {
    render(
      <DayColumn
        day="sat"
        headerAction={<button data-testid="day-action">Akcja dnia</button>}
      />
    );

    expect(screen.getByTestId('day-action')).toBeInTheDocument();
  });
});
