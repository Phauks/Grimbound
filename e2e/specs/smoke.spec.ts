import { expect, test } from '@playwright/test';
import { BasePage } from '../pages/BasePage';

test.describe('Smoke Tests', () => {
  test('should load the app', async ({ page }) => {
    const basePage = new BasePage(page);

    await basePage.goto();
    await basePage.waitForReady();

    // Verify the page title
    const title = await basePage.getTitle();
    expect(title).toContain('Grimbound');
  });

  test('should have navigation tabs', async ({ page }) => {
    const basePage = new BasePage(page);

    await basePage.goto();
    await basePage.waitForReady();

    // Check for main navigation tabs
    await expect(page.getByRole('tab', { name: /projects/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /script/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /tokens/i })).toBeVisible();
  });

  test('should be able to switch tabs', async ({ page }) => {
    const basePage = new BasePage(page);

    await basePage.goto();
    await basePage.waitForReady();

    // Click on Script tab
    await basePage.clickTab('Script');

    // Verify Script tab is now active
    const isActive = await basePage.isTabActive('Script');
    expect(isActive).toBe(true);
  });
});
