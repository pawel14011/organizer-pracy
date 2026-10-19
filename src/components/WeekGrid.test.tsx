import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WeekGrid } from './WeekGrid';

describe('WeekGrid component', () => {
  it('renders week grid container with accessibility label and testid', () => {
    render(<WeekGrid />);

    const grid = screen.getByTestId('week-grid');
    expect(grid).toBeInTheDocument();
    expect(grid).toHaveAttribute('aria-label', 'Stały tydzień (7 kolumn)');
  });

  it('renders nested children inside grid container', () => {
    render(
      <WeekGrid>
        <div data-testid="col-1">Kolumna 1</div>
        <div data-testid="col-2">Kolumna 2</div>
      </WeekGrid>
    );

    expect(screen.getByTestId('col-1')).toBeInTheDocument();
    expect(screen.getByTestId('col-2')).toBeInTheDocument();
  });

  it('merges custom className properly', () => {
    render(<WeekGrid className="custom-grid-class" />);

    const grid = screen.getByTestId('week-grid');
    expect(grid).toHaveClass('custom-grid-class');
  });
});
