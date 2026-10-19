import { test, expect } from '@playwright/test';

test.describe('Organizer Pracy - Testy Responsywności Mobilnej (E2E Mobile & Tablet)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      window.localStorage.clear();
    });
    await page.reload();
  });

  test('Smartfon (viewport 375x667): weryfikacja MobileNav, kompaktowego nagłówka i dodawania zadań', async ({
    page,
  }) => {
    // 1. Ustawienie wymiarów smartfona (iPhone SE / mały ekran 375x667)
    await page.setViewportSize({ width: 375, height: 667 });

    // 2. Weryfikacja kompaktowego nagłówka Header
    const header = page.getByTestId('header');
    await expect(header).toBeVisible();

    const title = page.getByTestId('header-title');
    await expect(title).toBeVisible();
    await expect(title).toHaveText('ORGANIZER PRACY');

    // Przyciski akcji na telefonie posiadają pełne atrybuty aria-label
    const exportBtn = page.getByTestId('export-backup-btn');
    const importBtn = page.getByTestId('import-backup-btn');
    await expect(exportBtn).toBeVisible();
    await expect(importBtn).toBeVisible();

    // 3. Weryfikacja paska nawigacji mobilnej (MobileNav / Pills)
    const mobileNav = page.getByTestId('mobile-nav');
    await expect(mobileNav).toBeVisible();

    // Pigułka Backlogu
    const backlogPill = page.getByTestId('mobile-nav-pill-backlog');
    await expect(backlogPill).toBeVisible();
    await expect(backlogPill).toHaveAttribute('aria-selected', 'true');

    // 4. Dodanie zadania w Backlogu na ekranie mobilnym
    const taskInput = page.getByTestId('add-task-input');
    await taskInput.fill('Zadanie utworzone na smartfonie');
    await taskInput.press('Enter');

    // Licznik Backlogu aktualizuje się zarówno w kolumnie, jak i na pasku MobileNav
    await expect(page.getByTestId('backlog-count')).toHaveText('1');
    const taskCard = page.getByTestId('column-backlog').getByTestId('task-card');
    await expect(taskCard).toBeVisible();
    await expect(taskCard.getByTestId('task-title')).toHaveText('Zadanie utworzone na smartfonie');

    // 5. Nawigacja pigułkami MobileNav: kliknięcie w dzień (np. Środa)
    const wedPill = page.getByTestId('mobile-nav-pill-wed');
    await wedPill.click();
    await expect(wedPill).toHaveAttribute('aria-selected', 'true');
    await expect(backlogPill).toHaveAttribute('aria-selected', 'false');

    // Kolumna Środy jest dostępna
    const wedColumn = page.getByTestId('column-day-wed');
    await expect(wedColumn).toBeVisible();
  });

  test('Smartfon (viewport 390x844): Szybkie przeniesienie zadania (Quick Move) z Backlogu do wybranego dnia', async ({
    page,
  }) => {
    // 1. Ustawienie wymiarów typowego nowoczesnego smartfona (iPhone 12/13/14: 390x844)
    await page.setViewportSize({ width: 390, height: 844 });

    // 2. Dodanie zadania w Backlogu
    const taskInput = page.getByTestId('add-task-input');
    await taskInput.fill('Zadanie do szybkiego przeniesienia');
    await taskInput.press('Enter');

    const backlogColumn = page.getByTestId('column-backlog');
    const taskCard = backlogColumn.getByTestId('task-card');
    await expect(taskCard).toBeVisible();

    // 3. Użycie kontrolki szybkiego przeniesienia (Quick Move)
    const moveSelect = taskCard.getByTestId('task-move-select');
    await expect(moveSelect).toBeAttached();

    // Wybór 'thu' (Czwartek)
    await moveSelect.selectOption('thu');

    // Zadanie natychmiast znika z Backlogu
    await expect(page.getByTestId('backlog-count')).toHaveText('0');
    await expect(backlogColumn.getByTestId('task-card')).toHaveCount(0);

    // Zadanie pojawia się w kolumnie Czwartku
    const thuColumn = page.getByTestId('column-day-thu');
    const thuTaskCard = thuColumn.getByTestId('task-card');
    await expect(thuTaskCard).toBeVisible();
    await expect(thuTaskCard.getByTestId('task-title')).toHaveText('Zadanie do szybkiego przeniesienia');
    await expect(page.getByTestId('day-count-thu')).toHaveText('1');

    // 4. Ponowne przeniesienie z Czwartku z powrotem do Backlogu przez Quick Move
    const thuMoveSelect = thuTaskCard.getByTestId('task-move-select');
    await thuMoveSelect.selectOption('backlog');

    // Zadanie wraca do Backlogu
    await expect(page.getByTestId('backlog-count')).toHaveText('1');
    await expect(page.getByTestId('day-count-thu')).toHaveText('0');
  });

  test('Tablet (viewport 768x1024): weryfikacja responsywności w orientacji pionowej (iPad Portrait)', async ({
    page,
  }) => {
    // 1. Ustawienie wymiarów tabletu w pionie
    await page.setViewportSize({ width: 768, height: 1024 });

    // 2. Weryfikacja obecności paska MobileNav i kontenera tablicy
    await expect(page.getByTestId('mobile-nav')).toBeVisible();
    await expect(page.getByTestId('column-backlog')).toBeVisible();
    await expect(page.getByTestId('week-grid')).toBeVisible();

    // 3. Dodanie zadania i weryfikacja interakcji
    const taskInput = page.getByTestId('add-task-input');
    await taskInput.fill('Zadanie na tablecie');
    await taskInput.press('Enter');

    const taskCard = page.getByTestId('column-backlog').getByTestId('task-card');
    await expect(taskCard).toBeVisible();

    // Zmiana statusu i priorytetu
    const priorityBtn = taskCard.getByTestId('task-priority-btn');
    await priorityBtn.click();
    await expect(taskCard).toHaveAttribute('data-priority', 'high');

    const checkbox = taskCard.getByTestId('task-checkbox');
    await checkbox.click();
    await expect(taskCard).toHaveAttribute('data-status', 'done');
  });
});
