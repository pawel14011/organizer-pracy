import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('App Smoke Test', () => {
  it('renders the main heading and application container', () => {
    render(<App />);

    const heading = screen.getByRole('heading', {
      level: 1,
      name: /organizer pracy/i,
    });
    expect(heading).toBeInTheDocument();

    expect(screen.getByText(/priorytet: wysoki/i)).toBeInTheDocument();
    expect(screen.getByText(/status: zaległe/i)).toBeInTheDocument();
  });
});
