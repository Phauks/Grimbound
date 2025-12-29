import type { Page, Locator } from '@playwright/test';

/**
 * Base page object with common utilities.
 */
export class BasePage {
  constructor(protected readonly page: Page) {}

  /**
   * Navigate to the app.
   */
  async goto(): Promise<void> {
    await this.page.goto('/');
  }

  /**
   * Wait for the app to be ready (initial load complete).
   */
  async waitForReady(): Promise<void> {
    // Wait for the app container to be visible
    await this.page.waitForSelector('[data-testid="app"]', { timeout: 30000 });
  }

  /**
   * Get the current page title.
   */
  async getTitle(): Promise<string> {
    return this.page.title();
  }

  /**
   * Take a screenshot.
   */
  async screenshot(name: string): Promise<void> {
    await this.page.screenshot({ path: `playwright-report/${name}.png` });
  }

  /**
   * Click a tab in the navigation.
   */
  async clickTab(tabName: string): Promise<void> {
    await this.page.getByRole('tab', { name: tabName }).click();
  }

  /**
   * Check if a tab is active.
   */
  async isTabActive(tabName: string): Promise<boolean> {
    const tab = this.page.getByRole('tab', { name: tabName });
    const ariaSelected = await tab.getAttribute('aria-selected');
    return ariaSelected === 'true';
  }
}
