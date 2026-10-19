import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MobileNav } from './MobileNav';
import { WEEKDAYS } from '../constants';

describe('MobileNav component', () => {
  it('renders tab list with Backlog and all 7 days of the week', () => {
    render(<MobileNav activeColumnId="backlog" backlogCount={5} todayWeekday="tue" />);

    expect(screen.getByTestId('mobile-nav')).toBeInTheDocument();
    expect(screen.getByTestId('mobile-nav-pill-backlog')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();

    for (const day of WEEKDAYS) {
      expect(screen.getByTestId(`mobile-nav-pill-${day}`)).toBeInTheDocument();
    }
  });

  it('highlights the active column with aria-selected="true"', () => {
    const { rerender } = render(<MobileNav activeColumnId="backlog" />);
    expect(screen.getByTestId('mobile-nav-pill-backlog')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('mobile-nav-pill-wed')).toHaveAttribute('aria-selected', 'false');

    rerender(<MobileNav activeColumnId="wed" />);
    expect(screen.getByTestId('mobile-nav-pill-backlog')).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByTestId('mobile-nav-pill-wed')).toHaveAttribute('aria-selected', 'true');
  });

  it('displays the DZISIAJ badge on the current day pill', () => {
    render(<MobileNav todayWeekday="wed" activeColumnId="mon" />);

    expect(screen.getByTestId('mobile-nav-today-indicator-wed')).toBeInTheDocument();
    expect(screen.queryByTestId('mobile-nav-today-indicator-mon')).not.toBeInTheDocument();
  });

  it('calls onSelectColumn with column key when a pill is clicked', () => {
    const onSelectColumn = vi.fn();
    render(<MobileNav activeColumnId="backlog" onSelectColumn={onSelectColumn} />);

    fireEvent.click(screen.getByTestId('mobile-nav-pill-fri'));
    expect(onSelectColumn).toHaveBeenCalledWith('fri');

    fireEvent.click(screen.getByTestId('mobile-nav-pill-backlog'));
    expect(onSelectColumn).toHaveBeenCalledWith('backlog');
  });
});
