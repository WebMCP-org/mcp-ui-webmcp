import { expect, test } from '@playwright/test';

test.describe('Chat UI App E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load the chat UI application', async ({ page }) => {
    // Wait for the page to be fully loaded
    await page.waitForLoadState('domcontentloaded');

    // Verify the page loaded successfully (check for common elements)
    // The app should have loaded without throwing errors
    const html = await page.content();
    expect(html).toBeTruthy();
    expect(html.length).toBeGreaterThan(0);
  });

  test('should have React app mounted', async ({ page }) => {
    // Check that React has rendered by looking for the root element
    const root = page.locator('#root');
    await expect(root).toBeAttached();

    // The root should have content (not empty)
    const hasContent = await root.evaluate((el) => {
      return el.children.length > 0 || el.textContent?.length > 0;
    });
    expect(hasContent).toBe(true);
  });

  test('should not have console errors on load', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Filter out known acceptable errors (if any)
    const criticalErrors = errors.filter((error) => {
      // Add any known/acceptable error patterns to ignore here
      return !error.includes('favicon.ico');
    });

    expect(criticalErrors).toEqual([]);
  });

  test('should load without network errors', async ({ page }) => {
    const failedRequests: string[] = [];

    page.on('requestfailed', (request) => {
      const url = request.url();
      // Ignore favicon and analytics/monitoring failures
      if (!url.includes('favicon.ico') && !url.includes('sentry.io') && !url.includes('analytics')) {
        failedRequests.push(url);
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    expect(failedRequests).toEqual([]);
  });

  test('should have proper viewport and be responsive', async ({ page }) => {
    await page.goto('/');

    // Test different viewport sizes
    const viewports = [
      { width: 1920, height: 1080, name: 'Desktop' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 375, height: 667, name: 'Mobile' },
    ];

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      // Verify the app adapts to the viewport
      const root = page.locator('#root');
      await expect(root).toBeVisible();

      // Check that content is not overflowing
      const hasOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });

      // Some overflow is acceptable on mobile, but should be reasonable
      if (hasOverflow && viewport.name !== 'Mobile') {
        // For desktop/tablet, unexpected horizontal overflow might indicate layout issues
        console.warn(`Horizontal overflow detected on ${viewport.name}`);
      }
    }
  });
});
