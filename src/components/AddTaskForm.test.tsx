import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AddTaskForm } from './AddTaskForm';

describe('AddTaskForm component', () => {
  it('renders the form, input with placeholder and submit button', () => {
    const onAddTask = vi.fn();
    render(<AddTaskForm onAddTask={onAddTask} />);

    const form = screen.getByTestId('add-task-form');
    expect(form).toBeInTheDocument();
    expect(form).toHaveAttribute('aria-label', 'Formularz szybkiego dodawania zadania');

    const input = screen.getByTestId('add-task-input');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('placeholder', 'Wpisz treść zadania i naciśnij Enter...');
    expect(input).toHaveAttribute('maxLength', '500');

    const submitBtn = screen.getByTestId('add-task-submit');
    expect(submitBtn).toBeInTheDocument();
    expect(submitBtn).toHaveAttribute('aria-label', 'Dodaj zadanie');
    expect(submitBtn).toBeDisabled();
  });

  it('allows typing and enables submit button when non-empty text is entered', () => {
    const onAddTask = vi.fn();
    render(<AddTaskForm onAddTask={onAddTask} />);

    const input = screen.getByTestId('add-task-input') as HTMLInputElement;
    const submitBtn = screen.getByTestId('add-task-submit');

    fireEvent.change(input, { target: { value: 'Nowe zadanie' } });
    expect(input.value).toBe('Nowe zadanie');
    expect(submitBtn).not.toBeDisabled();
  });

  it('calls onAddTask with trimmed text and clears input upon form submission (pressing Enter)', () => {
    const onAddTask = vi.fn();
    render(<AddTaskForm onAddTask={onAddTask} />);

    const form = screen.getByTestId('add-task-form');
    const input = screen.getByTestId('add-task-input') as HTMLInputElement;

    fireEvent.change(input, { target: { value: '  Przygotować raport kwartalny   ' } });
    fireEvent.submit(form);

    expect(onAddTask).toHaveBeenCalledTimes(1);
    expect(onAddTask).toHaveBeenCalledWith('Przygotować raport kwartalny');
    expect(input.value).toBe('');
  });

  it('calls onAddTask when submit button is clicked', () => {
    const onAddTask = vi.fn();
    render(<AddTaskForm onAddTask={onAddTask} />);

    const input = screen.getByTestId('add-task-input') as HTMLInputElement;
    const submitBtn = screen.getByTestId('add-task-submit');

    fireEvent.change(input, { target: { value: 'Kupić mleko' } });
    fireEvent.click(submitBtn);

    expect(onAddTask).toHaveBeenCalledTimes(1);
    expect(onAddTask).toHaveBeenCalledWith('Kupić mleko');
    expect(input.value).toBe('');
  });

  it('keeps focus on input element after adding a task', () => {
    const onAddTask = vi.fn();
    render(<AddTaskForm onAddTask={onAddTask} />);

    const form = screen.getByTestId('add-task-form');
    const input = screen.getByTestId('add-task-input') as HTMLInputElement;

    input.focus();
    expect(document.activeElement).toBe(input);

    fireEvent.change(input, { target: { value: 'Kolejne zadanie' } });
    fireEvent.submit(form);

    expect(onAddTask).toHaveBeenCalledWith('Kolejne zadanie');
    expect(document.activeElement).toBe(input);
  });

  it('does not call onAddTask if input is empty or only whitespace', () => {
    const onAddTask = vi.fn();
    render(<AddTaskForm onAddTask={onAddTask} />);

    const form = screen.getByTestId('add-task-form');
    const input = screen.getByTestId('add-task-input');

    // Pusty ciąg znaków
    fireEvent.submit(form);
    expect(onAddTask).not.toHaveBeenCalled();

    // Same spacje
    fireEvent.change(input, { target: { value: '    ' } });
    fireEvent.submit(form);
    expect(onAddTask).not.toHaveBeenCalled();
  });

  it('clears input value when Escape key is pressed', () => {
    const onAddTask = vi.fn();
    render(<AddTaskForm onAddTask={onAddTask} />);

    const input = screen.getByTestId('add-task-input') as HTMLInputElement;

    fireEvent.change(input, { target: { value: 'Anulowane zadanie' } });
    expect(input.value).toBe('Anulowane zadanie');

    fireEvent.keyDown(input, { key: 'Escape', code: 'Escape' });
    expect(input.value).toBe('');
    expect(onAddTask).not.toHaveBeenCalled();
  });

  it('supports custom placeholder and custom className', () => {
    const onAddTask = vi.fn();
    render(
      <AddTaskForm
        onAddTask={onAddTask}
        placeholder="Własny placeholder..."
        className="custom-form-class"
      />
    );

    const form = screen.getByTestId('add-task-form');
    expect(form).toHaveClass('custom-form-class');

    const input = screen.getByTestId('add-task-input');
    expect(input).toHaveAttribute('placeholder', 'Własny placeholder...');
  });

  it('disables input and submit button when disabled prop is true', () => {
    const onAddTask = vi.fn();
    render(<AddTaskForm onAddTask={onAddTask} disabled={true} />);

    const form = screen.getByTestId('add-task-form');
    const input = screen.getByTestId('add-task-input') as HTMLInputElement;
    const submitBtn = screen.getByTestId('add-task-submit');

    expect(input).toBeDisabled();
    expect(submitBtn).toBeDisabled();

    fireEvent.change(input, { target: { value: 'Niemożliwe zadanie' } });
    fireEvent.submit(form);

    expect(onAddTask).not.toHaveBeenCalled();
  });

  it('prevents multiple submissions when repeatedly submitted', () => {
    const onAddTask = vi.fn();
    render(<AddTaskForm onAddTask={onAddTask} />);

    const form = screen.getByTestId('add-task-form');
    const input = screen.getByTestId('add-task-input') as HTMLInputElement;

    fireEvent.change(input, { target: { value: 'Pojedyncze zadanie' } });
    fireEvent.submit(form);
    // Kolejne wysłanie formularza, gdy input został już wyczyszczony
    fireEvent.submit(form);

    expect(onAddTask).toHaveBeenCalledTimes(1);
    expect(onAddTask).toHaveBeenCalledWith('Pojedyncze zadanie');
  });
});
