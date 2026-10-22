import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { act } from '@testing-library/react';
import App from './App';

describe('WordPress Integration DOM and Mounting Verification', () => {
  let container: HTMLDivElement | null = null;

  beforeEach(() => {
    // Symulacja kontenera renderowanego przez shortcode wtyczki WordPress [organizer_pracy]
    container = document.createElement('div');
    container.id = 'organizer-pracy-root';
    container.className = 'organizer-pracy-app';
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  it('successfully finds and mounts the React application into #organizer-pracy-root', async () => {
    const rootElement = document.getElementById('organizer-pracy-root') ?? document.getElementById('root');
    expect(rootElement).not.toBeNull();
    expect(rootElement?.id).toBe('organizer-pracy-root');

    if (rootElement) {
      const root = ReactDOM.createRoot(rootElement);
      await act(async () => {
        root.render(
          <React.StrictMode>
            <App />
          </React.StrictMode>
        );
      });

      expect(rootElement.innerHTML).toContain('data-testid="app-container"');
      expect(rootElement.innerHTML).toContain('ORGANIZER PRACY');

      await act(async () => {
        root.unmount();
      });
    }
  });

  it('falls back to #root when #organizer-pracy-root is not present (Vercel / standalone mode)', () => {
    // Usunięcie kontenera WordPress
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }

    // Dodanie standardowego kontenera Vercel
    const fallbackRoot = document.createElement('div');
    fallbackRoot.id = 'root';
    document.body.appendChild(fallbackRoot);

    const rootElement = document.getElementById('organizer-pracy-root') ?? document.getElementById('root');
    expect(rootElement).not.toBeNull();
    expect(rootElement?.id).toBe('root');

    fallbackRoot.parentNode?.removeChild(fallbackRoot);
  });
});
