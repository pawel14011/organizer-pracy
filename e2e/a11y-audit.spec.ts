import { test, expect } from '@playwright/test';

test.describe('Audyt Dostępności (a11y) oraz Czystości Konsoli E2E', () => {
  test('weryfikuje brak błędów w konsoli przeglądarki podczas cyklu życia i interakcji z aplikacją', async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    const consoleWarnings: string[] = [];

    page.on('console', (msg) => {
      const type = msg.type();
      const text = msg.text();
      if (type === 'error') {
        consoleErrors.push(text);
      } else if (type === 'warning') {
        consoleWarnings.push(text);
      }
    });

    page.on('pageerror', (err) => {
      consoleErrors.push(err.message);
    });

    // 1. Wejście na stronę
    await page.goto('/');
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();

    // 2. Weryfikacja etykiet landmarków (a11y)
    const mainLandmark = page.getByRole('main');
    await expect(mainLandmark).toHaveAttribute('aria-label', 'Tablica zadań');

    const backlogColumn = page.getByTestId('column-backlog');
    await expect(backlogColumn).toHaveAttribute('aria-label', 'Backlog');

    // 3. Dodanie zadania do Backlogu
    const taskInput = page.getByTestId('add-task-input');
    await taskInput.fill('Zadanie testowe audytu');
    await taskInput.press('Enter');

    const taskCard = backlogColumn.getByTestId('task-card');
    await expect(taskCard).toBeVisible();

    // 4. Interakcja z kafelkiem: zmiana priorytetu, statusu i edycja tytułu
    const priorityBtn = taskCard.getByTestId('task-priority-btn');
    await expect(priorityBtn).toHaveAttribute('aria-label', /Priorytet: średni/i);
    await priorityBtn.click();
    await expect(priorityBtn).toHaveAttribute('aria-label', /Priorytet: wysoki/i);

    const checkbox = taskCard.getByTestId('task-checkbox');
    await checkbox.click();
    await expect(taskCard).toHaveAttribute('data-status', 'done');

    const editBtn = taskCard.getByTestId('task-edit-btn');
    await editBtn.click();
    const editInput = taskCard.getByTestId('task-edit-input');
    await expect(editInput).toBeFocused();
    await editInput.fill('Zadanie po edycji');
    await editInput.press('Enter');
    await expect(taskCard.getByTestId('task-title')).toHaveText('Zadanie po edycji');

    // 5. Usunięcie zadania
    const deleteBtn = taskCard.getByTestId('task-delete-btn');
    await deleteBtn.click();
    await expect(page.getByTestId('backlog-count')).toHaveText('0');

    // 6. Aserty: 0 błędów w konsoli, 0 ostrzeżeń (brak ostrzeżeń o kluczach React, sensorach dnd itp.)
    expect(consoleErrors).toEqual([]);
    expect(consoleWarnings).toEqual([]);
  });
});
