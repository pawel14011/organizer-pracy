import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { Header } from './Header';
import type { Task } from '../types';
import * as backupUtils from '../utils/backup';

describe('Header component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const mockTasks: Task[] = [
    {
      id: 'task-1',
      title: 'Zadanie testowe 1',
      status: 'todo',
      priority: 'high',
      day: 'mon',
      order: 0,
      createdAt: '2026-10-19T10:00:00.000Z',
    },
    {
      id: 'task-2',
      title: 'Zadanie testowe 2',
      status: 'done',
      priority: 'medium',
      day: null,
      order: 0,
      createdAt: '2026-10-19T11:00:00.000Z',
    },
  ];

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
        actions={<button data-testid="test-action-btn">Akcja testowa</button>}
      />
    );

    const actionBtn = screen.getByTestId('test-action-btn');
    expect(actionBtn).toBeInTheDocument();
    expect(actionBtn).toHaveTextContent('Akcja testowa');
  });

  it('merges custom className properly', () => {
    render(<Header className="custom-header-class" />);

    const header = screen.getByTestId('header');
    expect(header).toHaveClass('custom-header-class');
  });

  describe('Backup Interface (Export & Import)', () => {
    it('renders both Export and Import buttons and the hidden file input', () => {
      render(<Header />);

      const exportBtn = screen.getByTestId('export-backup-btn');
      expect(exportBtn).toBeInTheDocument();
      expect(exportBtn).toHaveTextContent('Eksportuj');
      expect(exportBtn).toHaveAttribute(
        'aria-label',
        'Eksportuj kopię zapasową zadań do pliku JSON'
      );

      const importBtn = screen.getByTestId('import-backup-btn');
      expect(importBtn).toBeInTheDocument();
      expect(importBtn).toHaveTextContent('Importuj');
      expect(importBtn).toHaveAttribute(
        'aria-label',
        'Importuj zadania z pliku JSON kopii zapasowej'
      );

      const fileInput = screen.getByTestId('import-file-input');
      expect(fileInput).toBeInTheDocument();
      expect(fileInput).toHaveAttribute('type', 'file');
      expect(fileInput).toHaveAttribute('accept', '.json,application/json');
      expect(fileInput).toHaveClass('sr-only');
    });

    it('triggers file input click when the Import button is clicked', () => {
      render(<Header />);

      const fileInput = screen.getByTestId('import-file-input');
      const clickSpy = vi.spyOn(fileInput, 'click');

      const importBtn = screen.getByTestId('import-backup-btn');
      fireEvent.click(importBtn);

      expect(clickSpy).toHaveBeenCalledTimes(1);
    });

    it('exports tasks to JSON and displays a success notification when clicking Export', () => {
      const exportSpy = vi.spyOn(backupUtils, 'exportTasksToJson').mockReturnValue('organizer-backup-2026-10-19.json');

      render(<Header tasks={mockTasks} />);

      const exportBtn = screen.getByTestId('export-backup-btn');
      fireEvent.click(exportBtn);

      expect(exportSpy).toHaveBeenCalledWith(mockTasks);

      const notification = screen.getByTestId('backup-notification');
      expect(notification).toBeInTheDocument();
      expect(notification).toHaveAttribute('role', 'status');
      expect(screen.getByTestId('backup-notification-message')).toHaveTextContent(
        'Pomyślnie wyeksportowano kopię zapasową (2 zadań).'
      );
    });

    it('supports custom onExport handler prop', () => {
      const onExportMock = vi.fn();

      render(<Header tasks={mockTasks} onExport={onExportMock} />);

      const exportBtn = screen.getByTestId('export-backup-btn');
      fireEvent.click(exportBtn);

      expect(onExportMock).toHaveBeenCalledTimes(1);
      expect(onExportMock).toHaveBeenCalledWith(mockTasks);
      expect(screen.getByTestId('backup-notification')).toBeInTheDocument();
    });

    it('displays error notification if export operation fails unexpectedly', () => {
      vi.spyOn(backupUtils, 'exportTasksToJson').mockImplementation(() => {
        throw new Error('Błąd zapisu pliku');
      });

      render(<Header tasks={mockTasks} />);

      const exportBtn = screen.getByTestId('export-backup-btn');
      fireEvent.click(exportBtn);

      const notification = screen.getByTestId('backup-notification');
      expect(notification).toBeInTheDocument();
      expect(notification).toHaveAttribute('role', 'alert');
      expect(screen.getByTestId('backup-notification-message')).toHaveTextContent(
        'Błąd eksportu: Błąd zapisu pliku'
      );
    });

    it('imports valid JSON tasks after user confirmation and calls onImportTasks', async () => {
      const onImportTasksMock = vi.fn();
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

      render(<Header tasks={[]} onImportTasks={onImportTasksMock} />);

      const validJsonContent = JSON.stringify(mockTasks);
      const file = new File([validJsonContent], 'organizer-backup-2026-10-19.json', {
        type: 'application/json',
      });

      const fileInput = screen.getByTestId('import-file-input');

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [file] } });
      });

      expect(confirmSpy).toHaveBeenCalledTimes(1);
      expect(confirmSpy).toHaveBeenCalledWith(
        expect.stringContaining('Czy na pewno chcesz zastąpić obecną bazę zadań')
      );

      expect(onImportTasksMock).toHaveBeenCalledTimes(1);
      expect(onImportTasksMock).toHaveBeenCalledWith(mockTasks);

      const notification = screen.getByTestId('backup-notification');
      expect(notification).toBeInTheDocument();
      expect(notification).toHaveAttribute('role', 'status');
      expect(screen.getByTestId('backup-notification-message')).toHaveTextContent(
        'Pomyślnie zaimportowano 2 zadań.'
      );

      // Input value must be reset
      expect((fileInput as HTMLInputElement).value).toBe('');
    });

    it('supports custom async confirmDialog prop', async () => {
      const onImportTasksMock = vi.fn();
      const confirmDialogMock = vi.fn().mockResolvedValue(true);

      render(
        <Header
          tasks={[]}
          onImportTasks={onImportTasksMock}
          confirmDialog={confirmDialogMock}
        />
      );

      const file = new File([JSON.stringify(mockTasks)], 'backup.json', {
        type: 'application/json',
      });
      const fileInput = screen.getByTestId('import-file-input');

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [file] } });
      });

      expect(confirmDialogMock).toHaveBeenCalledTimes(1);
      expect(onImportTasksMock).toHaveBeenCalledWith(mockTasks);
      expect(screen.getByTestId('backup-notification-message')).toHaveTextContent(
        'Pomyślnie zaimportowano 2 zadań.'
      );
    });

    it('cancels import if user rejects confirmation and does not modify tasks', async () => {
      const onImportTasksMock = vi.fn();
      vi.spyOn(window, 'confirm').mockReturnValue(false);

      render(<Header tasks={mockTasks} onImportTasks={onImportTasksMock} />);

      const file = new File([JSON.stringify(mockTasks)], 'backup.json', {
        type: 'application/json',
      });
      const fileInput = screen.getByTestId('import-file-input');

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [file] } });
      });

      expect(onImportTasksMock).not.toHaveBeenCalled();
      expect(screen.queryByTestId('backup-notification')).not.toBeInTheDocument();
      expect((fileInput as HTMLInputElement).value).toBe('');
    });

    it('displays error notification and does not import if file contains malformed JSON', async () => {
      const onImportTasksMock = vi.fn();
      const confirmSpy = vi.spyOn(window, 'confirm');

      render(<Header tasks={mockTasks} onImportTasks={onImportTasksMock} />);

      const malformedFile = new File(['{ invalid json content: true'], 'bad.json', {
        type: 'application/json',
      });
      const fileInput = screen.getByTestId('import-file-input');

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [malformedFile] } });
      });

      // Confirmation is not even asked if validation fails
      expect(confirmSpy).not.toHaveBeenCalled();
      expect(onImportTasksMock).not.toHaveBeenCalled();

      const notification = screen.getByTestId('backup-notification');
      expect(notification).toBeInTheDocument();
      expect(notification).toHaveAttribute('role', 'alert');
      expect(screen.getByTestId('backup-notification-message')).toHaveTextContent(
        /Błąd importu: Nieprawidłowy format JSON/i
      );

      // Input value is reset so retry is possible
      expect((fileInput as HTMLInputElement).value).toBe('');
    });

    it('displays error notification if file data does not conform to Task schema', async () => {
      const onImportTasksMock = vi.fn();

      render(<Header tasks={mockTasks} onImportTasks={onImportTasksMock} />);

      const invalidSchemaData = [
        {
          id: '1',
          title: 'Zadanie',
          status: 'invalid-status', // Not 'todo' | 'done'
          priority: 'medium',
          day: null,
          order: 0,
          createdAt: new Date().toISOString(),
        },
      ];

      const invalidFile = new File([JSON.stringify(invalidSchemaData)], 'invalid-schema.json', {
        type: 'application/json',
      });
      const fileInput = screen.getByTestId('import-file-input');

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [invalidFile] } });
      });

      expect(onImportTasksMock).not.toHaveBeenCalled();
      const notification = screen.getByTestId('backup-notification');
      expect(notification).toBeInTheDocument();
      expect(notification).toHaveAttribute('role', 'alert');
      expect(screen.getByTestId('backup-notification-message')).toHaveTextContent(
        /Błąd importu:.*nieprawidłowy status/i
      );
    });

    it('rejects files containing potential malicious XSS payload', async () => {
      const onImportTasksMock = vi.fn();

      render(<Header tasks={mockTasks} onImportTasks={onImportTasksMock} />);

      const maliciousData = [
        {
          id: 'xss-1',
          title: '<script>alert("hacked")</script>',
          status: 'todo',
          priority: 'medium',
          day: null,
          order: 0,
          createdAt: new Date().toISOString(),
        },
      ];

      const maliciousFile = new File([JSON.stringify(maliciousData)], 'xss.json', {
        type: 'application/json',
      });
      const fileInput = screen.getByTestId('import-file-input');

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [maliciousFile] } });
      });

      expect(onImportTasksMock).not.toHaveBeenCalled();
      expect(screen.getByTestId('backup-notification-message')).toHaveTextContent(
        /Wykryto potencjalnie niebezpieczną zawartość/i
      );
    });

    it('does nothing if file input change event contains no files', async () => {
      const onImportTasksMock = vi.fn();

      render(<Header onImportTasks={onImportTasksMock} />);

      const fileInput = screen.getByTestId('import-file-input');

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [] } });
      });

      expect(onImportTasksMock).not.toHaveBeenCalled();
      expect(screen.queryByTestId('backup-notification')).not.toBeInTheDocument();
    });

    it('allows dismissing notifications manually using the close button', () => {
      vi.spyOn(backupUtils, 'exportTasksToJson').mockReturnValue('organizer-backup.json');

      render(<Header tasks={[]} />);

      const exportBtn = screen.getByTestId('export-backup-btn');
      fireEvent.click(exportBtn);

      expect(screen.getByTestId('backup-notification')).toBeInTheDocument();

      const closeBtn = screen.getByTestId('close-notification-btn');
      fireEvent.click(closeBtn);

      expect(screen.queryByTestId('backup-notification')).not.toBeInTheDocument();
    });

    it('automatically dismisses notification after 5 seconds', () => {
      vi.useFakeTimers();
      vi.spyOn(backupUtils, 'exportTasksToJson').mockReturnValue('organizer-backup.json');

      render(<Header tasks={[]} />);

      const exportBtn = screen.getByTestId('export-backup-btn');
      fireEvent.click(exportBtn);

      expect(screen.getByTestId('backup-notification')).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(4999);
      });
      expect(screen.getByTestId('backup-notification')).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(screen.queryByTestId('backup-notification')).not.toBeInTheDocument();
    });
  });
});
