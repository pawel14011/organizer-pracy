import { test, expect, type Page, type Locator } from '@playwright/test';

/**
 * Pomocnicza funkcja do stabilnego przeciągania elementów (@dnd-kit Drag and Drop) w Playwright.
 *
 * Dlaczego:
 * Biblioteka @dnd-kit korzysta z PointerSensor z ograniczeniem aktywacji (activationConstraint: { distance: 8 }).
 * Standardowe wywołanie `dragTo` może nie wygenerować odpowiedniej sekwencji zdarzeń pointerdown/pointermove.
 * Ta funkcja symuluje wskaźnik myszy: najazd na środek kafelka źródłowego, wciśnięcie przycisku myszy,
 * przesunięcie o > 8px w celu aktywacji gestu, płynne przemieszczenie do kontenera docelowego
 * i zwolnienie przycisku myszy.
 */
async function dragAndDropTask(page: Page, sourceLocator: Locator, targetLocator: Locator) {
  await sourceLocator.scrollIntoViewIfNeeded();
  await targetLocator.scrollIntoViewIfNeeded();

  const sourceBox = await sourceLocator.boundingBox();
  const targetBox = await targetLocator.boundingBox();

  if (!sourceBox || !targetBox) {
    throw new Error('Nie znaleziono wymiarów boundingBox dla elementu źródłowego lub docelowego.');
  }

  const startX = sourceBox.x + sourceBox.width / 2;
  const startY = sourceBox.y + sourceBox.height / 2;
  const targetX = targetBox.x + targetBox.width / 2;
  const targetY = targetBox.y + targetBox.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  // Ruch o 15px, aby przekroczyć próg 8px PointerSensor
  await page.mouse.move(startX + 15, startY + 15, { steps: 5 });
  // Płynny ruch do punktu docelowego
  await page.mouse.move(targetX, targetY, { steps: 25 });
  // Krótka pauza na zarejestrowanie kolizji przez kanbanCollisionDetection
  await page.waitForTimeout(150);
  await page.mouse.up();
  await page.waitForTimeout(100);
}

test.describe('Organizer Pracy - Testy Scenariuszy Akceptacyjnych (E2E)', () => {
  test.beforeEach(async ({ page }) => {
    // Zapewnienie czystego stanu LocalStorage przed każdym testem
    await page.goto('/');
    await page.evaluate(() => {
      window.localStorage.clear();
    });
    await page.reload();
  });

  test('Scenariusz 1: Dodawanie zadania w Backlogu i walidacja', async ({ page }) => {
    const backlogColumn = page.getByTestId('column-backlog');
    const backlogCount = page.getByTestId('backlog-count');
    const taskInput = page.getByTestId('add-task-input');
    const submitBtn = page.getByTestId('add-task-submit');

    // Początkowy stan Backlogu: 0 zadań
    await expect(backlogCount).toHaveText('0');
    await expect(page.getByTestId('backlog-empty-state')).toBeVisible();

    // Blokada pustych zadań: przycisk wyłączony przy pustym tekście lub samych spacjach
    await expect(submitBtn).toBeDisabled();
    await taskInput.fill('   ');
    await expect(submitBtn).toBeDisabled();
    await taskInput.press('Enter');
    await expect(backlogCount).toHaveText('0');

    // Dodanie pierwszego zadania przez naciśnięcie klawisza Enter
    await taskInput.fill('Przygotować prezentację kwartalną');
    await expect(submitBtn).toBeEnabled();
    await taskInput.press('Enter');

    // Po zatwierdzeniu pole tekstowe zostaje wyczyszczone i zachowuje fokus
    await expect(taskInput).toHaveValue('');
    await expect(taskInput).toBeFocused();

    // W Backlogu pojawia się kafelek z poprawnymi danymi
    await expect(backlogCount).toHaveText('1');
    const taskCard = backlogColumn.getByTestId('task-card');
    await expect(taskCard).toBeVisible();
    await expect(taskCard.getByTestId('task-title')).toHaveText('Przygotować prezentację kwartalną');
    // Domyślny priorytet: średni
    await expect(taskCard).toHaveAttribute('data-priority', 'medium');
    await expect(taskCard).toHaveAttribute('data-status', 'todo');

    // Dodanie drugiego zadania za pomocą kliknięcia przycisku "+"
    await taskInput.fill('Napisać testy integracyjne');
    await submitBtn.click();

    await expect(backlogCount).toHaveText('2');
    await expect(backlogColumn.getByTestId('task-card')).toHaveCount(2);
  });

  test('Scenariusz 1b: Interakcje z kafelkiem zadania (status, priorytet, edycja inline, usuwanie)', async ({
    page,
  }) => {
    const taskInput = page.getByTestId('add-task-input');
    await taskInput.fill('Zadanie do edycji i testów');
    await taskInput.press('Enter');

    const taskCard = page.getByTestId('task-card').first();
    const checkbox = taskCard.getByTestId('task-checkbox');
    const titleSpan = taskCard.getByTestId('task-title');
    const priorityBtn = taskCard.getByTestId('task-priority-btn');
    const editBtn = taskCard.getByTestId('task-edit-btn');
    const deleteBtn = taskCard.getByTestId('task-delete-btn');

    // 1. Oznaczanie jako zrealizowane (done)
    await checkbox.click();
    await expect(taskCard).toHaveAttribute('data-status', 'done');
    await expect(titleSpan).toHaveClass(/line-through/);

    // Odznaczenie zadania (todo)
    await checkbox.click();
    await expect(taskCard).toHaveAttribute('data-status', 'todo');
    await expect(titleSpan).not.toHaveClass(/line-through/);

    // 2. Cykliczna zmiana priorytetu: medium -> high -> low -> medium
    await expect(taskCard).toHaveAttribute('data-priority', 'medium');
    await priorityBtn.click();
    await expect(taskCard).toHaveAttribute('data-priority', 'high');
    await priorityBtn.click();
    await expect(taskCard).toHaveAttribute('data-priority', 'low');
    await priorityBtn.click();
    await expect(taskCard).toHaveAttribute('data-priority', 'medium');

    // 3. Edycja tytułu inline (poprzez przycisk ołówka)
    await editBtn.click();
    const editInput = taskCard.getByTestId('task-edit-input');
    await expect(editInput).toBeVisible();
    await expect(editInput).toBeFocused();

    // Wpisanie nowej nazwy i zatwierdzenie Enter
    await editInput.fill('Zaktualizowana nazwa zadania');
    await editInput.press('Enter');
    await expect(editInput).not.toBeVisible();
    await expect(titleSpan).toHaveText('Zaktualizowana nazwa zadania');

    // Edycja przez podwójne kliknięcie i anulowanie klawiszem Escape
    await titleSpan.dblclick();
    const editInputDbl = taskCard.getByTestId('task-edit-input');
    await expect(editInputDbl).toBeVisible();
    await editInputDbl.fill('Nazwa, która ma zostać anulowana');
    await editInputDbl.press('Escape');
    await expect(editInputDbl).not.toBeVisible();
    await expect(titleSpan).toHaveText('Zaktualizowana nazwa zadania');

    // 4. Usunięcie zadania
    await deleteBtn.click();
    await expect(page.getByTestId('task-card')).toHaveCount(0);
    await expect(page.getByTestId('backlog-count')).toHaveText('0');
  });

  test('Scenariusz 2: Przenoszenie zadań (Drag & Drop)', async ({ page }) => {
    const taskInput = page.getByTestId('add-task-input');
    await taskInput.fill('Zadanie do zaplanowania');
    await taskInput.press('Enter');

    const backlogColumn = page.getByTestId('column-backlog');
    const taskCard = backlogColumn.getByTestId('task-card').first();
    const mondayDroppable = page.getByTestId('droppable-mon');
    const wednesdayDroppable = page.getByTestId('droppable-wed');
    const backlogDroppable = page.getByTestId('droppable-backlog');

    // 1. Przeciągnięcie z Backlogu do Poniedziałku
    await dragAndDropTask(page, taskCard, mondayDroppable);

    const mondayColumn = page.getByTestId('column-day-mon');
    await expect(mondayColumn.getByTestId('task-card')).toHaveCount(1);
    await expect(mondayColumn.getByTestId('task-title')).toHaveText('Zadanie do zaplanowania');
    await expect(page.getByTestId('backlog-count')).toHaveText('0');
    await expect(page.getByTestId('day-count-mon')).toHaveText('1');

    // 2. Przeciągnięcie z Poniedziałku do Środy
    const monTask = mondayColumn.getByTestId('task-card').first();
    await dragAndDropTask(page, monTask, wednesdayDroppable);

    const wednesdayColumn = page.getByTestId('column-day-wed');
    await expect(mondayColumn.getByTestId('task-card')).toHaveCount(0);
    await expect(wednesdayColumn.getByTestId('task-card')).toHaveCount(1);
    await expect(wednesdayColumn.getByTestId('task-title')).toHaveText('Zadanie do zaplanowania');
    await expect(page.getByTestId('day-count-mon')).toHaveText('0');
    await expect(page.getByTestId('day-count-wed')).toHaveText('1');

    // 3. Przeciągnięcie ze Środy z powrotem do Backlogu
    const wedTask = wednesdayColumn.getByTestId('task-card').first();
    await dragAndDropTask(page, wedTask, backlogDroppable);

    await expect(wednesdayColumn.getByTestId('task-card')).toHaveCount(0);
    await expect(backlogColumn.getByTestId('task-card')).toHaveCount(1);
    await expect(page.getByTestId('backlog-count')).toHaveText('1');
    await expect(page.getByTestId('day-count-wed')).toHaveText('0');

    // 4. Zmiana kolejności zadań w tej samej kolumnie (reordering)
    await taskInput.fill('Drugie zadanie na liście');
    await taskInput.press('Enter');

    const cardsBefore = backlogColumn.getByTestId('task-title');
    await expect(cardsBefore.nth(0)).toHaveText('Zadanie do zaplanowania');
    await expect(cardsBefore.nth(1)).toHaveText('Drugie zadanie na liście');

    // Przeciągnięcie drugiego zadania nad pierwsze
    const secondTaskCard = backlogColumn.getByTestId('task-card').nth(1);
    const firstTaskCard = backlogColumn.getByTestId('task-card').nth(0);
    await dragAndDropTask(page, secondTaskCard, firstTaskCard);

    const cardsAfter = backlogColumn.getByTestId('task-title');
    await expect(cardsAfter.nth(0)).toHaveText('Drugie zadanie na liście');
    await expect(cardsAfter.nth(1)).toHaveText('Zadanie do zaplanowania');
  });

  test('Scenariusz 3: Trwałość danych po przeładowaniu strony (F5 / Persistence)', async ({
    page,
  }) => {
    const taskInput = page.getByTestId('add-task-input');
    await taskInput.fill('Trwałe zadanie testowe');
    await taskInput.press('Enter');

    // Przeciągnięcie do Wtorku
    const taskCard = page.getByTestId('task-card').first();
    const tuesdayDroppable = page.getByTestId('droppable-tue');
    await dragAndDropTask(page, taskCard, tuesdayDroppable);

    const tuesdayColumn = page.getByTestId('column-day-tue');
    const tuesdayTask = tuesdayColumn.getByTestId('task-card').first();
    await expect(tuesdayTask).toBeVisible();

    // Zmiana priorytetu na wysoki (high) oraz oznaczenie jako ukończone (done)
    await tuesdayTask.getByTestId('task-priority-btn').click(); // medium -> high
    await tuesdayTask.getByTestId('task-checkbox').click(); // todo -> done

    await expect(tuesdayTask).toHaveAttribute('data-priority', 'high');
    await expect(tuesdayTask).toHaveAttribute('data-status', 'done');

    // Przeładowanie strony (F5)
    await page.reload();

    // Weryfikacja, że zadanie nadal znajduje się we Wtorku i zachowało wszystkie atrybuty
    const reloadedTuesdayColumn = page.getByTestId('column-day-tue');
    const reloadedTask = reloadedTuesdayColumn.getByTestId('task-card').first();
    await expect(reloadedTask).toBeVisible();
    await expect(reloadedTask.getByTestId('task-title')).toHaveText('Trwałe zadanie testowe');
    await expect(reloadedTask).toHaveAttribute('data-priority', 'high');
    await expect(reloadedTask).toHaveAttribute('data-status', 'done');
    await expect(page.getByTestId('day-count-tue')).toHaveText('1');
    await expect(page.getByTestId('backlog-count')).toHaveText('0');
  });

  test('Scenariusz 4: Wizualizacja zaległości i cofnięcie do Backlogu', async ({ page }) => {
    // Ustalamy datę w przeglądarce na Środę (2026-10-21T12:00:00), aby Poniedziałek był dniem przeszłym
    await page.clock.setFixedTime(new Date('2026-10-21T12:00:00'));

    // Przygotowanie zadania w Poniedziałku (przeszły dzień) w pamięci LocalStorage
    await page.evaluate(() => {
      const sampleTasks = [
        {
          id: 'task-overdue-1',
          title: 'Zadanie z poniedziałku (niewykonane)',
          status: 'todo',
          priority: 'high',
          day: 'mon',
          order: 0,
          createdAt: new Date('2026-10-19T10:00:00').toISOString(),
        },
        {
          id: 'task-done-1',
          title: 'Zadanie z poniedziałku (zrobione)',
          status: 'done',
          priority: 'medium',
          day: 'mon',
          order: 1,
          createdAt: new Date('2026-10-19T11:00:00').toISOString(),
        },
      ];
      window.localStorage.setItem('organizer_tasks', JSON.stringify(sampleTasks));
    });

    await page.reload();

    const mondayColumn = page.getByTestId('column-day-mon');
    const wednesdayColumn = page.getByTestId('column-day-wed');

    // Środa powinna posiadać plakietkę "DZISIAJ"
    await expect(wednesdayColumn.getByTestId('badge-today-wed')).toHaveText('DZISIAJ');

    // Zadanie niewykonane z Poniedziałku jest zaległe:
    const overdueCard = mondayColumn.locator('[data-task-id="task-overdue-1"]');
    await expect(overdueCard).toHaveAttribute('data-overdue', 'true');
    await expect(overdueCard.getByTestId('task-overdue-badge')).toBeVisible();
    await expect(overdueCard.getByTestId('task-overdue-badge')).toContainText('Zaległe');

    // Zadanie wykonane z Poniedziałku NIE jest zaległe:
    const doneCard = mondayColumn.locator('[data-task-id="task-done-1"]');
    await expect(doneCard).toHaveAttribute('data-overdue', 'false');
    await expect(doneCard.getByTestId('task-overdue-badge')).not.toBeVisible();

    // W nagłówku kolumny Poniedziałku wyświetla się przycisk zbiorczego przywracania zaległych
    await expect(page.getByTestId('day-return-overdue-btn-mon')).toBeVisible();

    // Szybka akcja 1: Kliknięcie przycisku "Przywróć do backlogu" bezpośrednio na kafelku
    const returnBtn = overdueCard.getByTestId('task-return-btn');
    await expect(returnBtn).toBeVisible();
    await returnBtn.click();

    // Zadanie wraca do Backlogu i nie jest już oznaczone jako zaległe
    const backlogColumn = page.getByTestId('column-backlog');
    const returnedCard = backlogColumn.locator('[data-task-id="task-overdue-1"]');
    await expect(returnedCard).toBeVisible();
    await expect(returnedCard).toHaveAttribute('data-overdue', 'false');
    await expect(returnedCard.getByTestId('task-overdue-badge')).not.toBeVisible();
    await expect(mondayColumn.locator('[data-task-id="task-overdue-1"]')).not.toBeVisible();

    // W Poniedziałku pozostało tylko wykonane zadanie, więc przycisk zbiorczy zaległych znika
    await expect(page.getByTestId('day-return-overdue-btn-mon')).not.toBeVisible();
  });

  test('Scenariusz 4b: Zbiorcze przywracanie wszystkich zaległych zadań z nagłówka kolumny', async ({
    page,
  }) => {
    await page.clock.setFixedTime(new Date('2026-10-21T12:00:00'));

    await page.evaluate(() => {
      const sampleTasks = [
        {
          id: 'task-overdue-a',
          title: 'Zaległe zadanie A',
          status: 'todo',
          priority: 'high',
          day: 'mon',
          order: 0,
          createdAt: new Date('2026-10-19T08:00:00').toISOString(),
        },
        {
          id: 'task-overdue-b',
          title: 'Zaległe zadanie B',
          status: 'todo',
          priority: 'medium',
          day: 'mon',
          order: 1,
          createdAt: new Date('2026-10-19T09:00:00').toISOString(),
        },
      ];
      window.localStorage.setItem('organizer_tasks', JSON.stringify(sampleTasks));
    });

    await page.reload();

    const mondayColumn = page.getByTestId('column-day-mon');
    await expect(mondayColumn.getByTestId('task-card')).toHaveCount(2);

    // Kliknięcie zbiorczego przycisku "Przenieś zaległe do backlogu" w nagłówku Poniedziałku
    const batchReturnBtn = page.getByTestId('day-return-overdue-btn-mon');
    await expect(batchReturnBtn).toBeVisible();
    await batchReturnBtn.click();

    // W Poniedziałku nie ma już zadań, a w Backlogu są 2 zadania
    await expect(mondayColumn.getByTestId('task-card')).toHaveCount(0);
    await expect(page.getByTestId('backlog-count')).toHaveText('2');
    const backlogColumn = page.getByTestId('column-backlog');
    await expect(backlogColumn.getByText('Zaległe zadanie A')).toBeVisible();
    await expect(backlogColumn.getByText('Zaległe zadanie B')).toBeVisible();
  });

  test('Scenariusz 5: Kopia zapasowa - Eksport do JSON i Import JSON z przywróceniem bazy', async ({
    page,
  }) => {
    // 1. Dodanie zadania do Backlogu i przeniesienie drugiego do Czwartku
    const taskInput = page.getByTestId('add-task-input');
    await taskInput.fill('Zadanie w Backlogu do backupu');
    await taskInput.press('Enter');

    await taskInput.fill('Zadanie w Czwartku do backupu');
    await taskInput.press('Enter');

    const thursdayDroppable = page.getByTestId('droppable-thu');
    const secondCard = page.getByTestId('task-card').nth(1);
    await dragAndDropTask(page, secondCard, thursdayDroppable);

    // 2. Eksport danych do pliku JSON
    const exportBtn = page.getByTestId('export-backup-btn');
    const downloadPromise = page.waitForEvent('download');
    await exportBtn.click();
    const download = await downloadPromise;

    // Sprawdzenie formatu nazwy pliku: organizer-backup-YYYY-MM-DD.json
    expect(download.suggestedFilename()).toMatch(/^organizer-backup-\d{4}-\d{2}-\d{2}\.json$/);

    // Zapisanie pliku na dysku tymczasowym przeglądarki i weryfikacja zawartości
    const downloadPath = await download.path();
    expect(downloadPath).toBeTruthy();

    // Powiadomienie o sukcesie eksportu w interfejsie
    await expect(page.getByTestId('backup-notification-message')).toContainText(
      /pomyślnie wyeksportowano/i
    );

    // 3. Wyczyszczenie danych w LocalStorage i odświeżenie strony (symulacja nowego środowiska/urządzenia)
    await page.evaluate(() => {
      window.localStorage.clear();
    });
    await page.reload();

    // Aplikacja jest pusta
    await expect(page.getByTestId('backlog-count')).toHaveText('0');
    await expect(page.getByTestId('day-count-thu')).toHaveText('0');
    await expect(page.getByTestId('task-card')).toHaveCount(0);

    // 4. Zaimportowanie pobranego pliku JSON
    // Obsługa okna potwierdzenia nadpisania bazy (window.confirm)
    page.on('dialog', async (dialog) => {
      expect(dialog.message()).toContain('Czy na pewno chcesz zastąpić obecną bazę zadań');
      await dialog.accept();
    });

    const fileInput = page.getByTestId('import-file-input');
    await fileInput.setInputFiles(downloadPath!);

    // Weryfikacja powiadomienia o udanym imporcie
    await expect(page.getByTestId('backup-notification-message')).toContainText(
      /pomyślnie zaimportowano 2/i
    );

    // Weryfikacja przywrócenia pełnego stanu zadań
    await expect(page.getByTestId('backlog-count')).toHaveText('1');
    await expect(page.getByTestId('day-count-thu')).toHaveText('1');
    await expect(
      page.getByTestId('column-backlog').getByText('Zadanie w Backlogu do backupu')
    ).toBeVisible();
    await expect(
      page.getByTestId('column-day-thu').getByText('Zadanie w Czwartku do backupu')
    ).toBeVisible();
  });
});
