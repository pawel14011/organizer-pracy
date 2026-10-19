import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Header } from './Header';

describe('Header component', () => {
  it('renders the application title and role', () => {
    render(<Header />);

    const header = screen.getByTestId('header');
    expect(header).toBeInTheDocument();

    const title = screen.getByTestId('header-title');
    expect(title).toHaveTextContent('ORGANIZER PRACY');

    expect(screen.getByText('Planer Tygodniowy MVP')).toBeInTheDocument();
  });

  it('renders custom actions in the header actions slot when provided', () => {
    render(
      <Header
        actions={<button data-testid="test-action-btn">Eksportuj</button>}
      />
    );

    const actionBtn = screen.getByTestId('test-action-btn');
    expect(actionBtn).toBeInTheDocument();
    expect(actionBtn).toHaveTextContent('Eksportuj');
  });

  it('merges custom className properly', () => {
    render(<Header className="custom-header-class" />);

    const header = screen.getByTestId('header');
    expect(header).toHaveClass('custom-header-class');
  });
});
