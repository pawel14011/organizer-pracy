import { expect, test } from '@playwright/test';

test.describe('E2E Smoke Test', () => {
  test('loads home page and displays the application title', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1, name: /organizer pracy/i })).toBeVisible();
    await expect(page.getByText(/priorytet: wysoki/i)).toBeVisible();
  });
});
