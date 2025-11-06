import { expect, test } from '@playwright/test';

test.describe('Remote MCP with UI Starter App E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load the remote MCP starter application', async ({ page }) => {
    await page.waitForLoadState('domcontentloaded');

    const html = await page.content();
    expect(html).toBeTruthy();
    expect(html.length).toBeGreaterThan(0);
  });

  test('should have React app mounted', async ({ page }) => {
    const root = page.locator('#root');
    await expect(root).toBeAttached();

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

    const criticalErrors = errors.filter((error) => {
      return !error.includes('favicon.ico');
    });

    expect(criticalErrors).toEqual([]);
  });

  test('should load without network errors', async ({ page }) => {
    const failedRequests: string[] = [];

    page.on('requestfailed', (request) => {
      const url = request.url();
      if (!url.includes('favicon.ico') && !url.includes('sentry.io') && !url.includes('analytics')) {
        failedRequests.push(url);
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    expect(failedRequests).toEqual([]);
  });

  test('should run on correct port (8888)', async ({ page }) => {
    const url = page.url();
    expect(url).toContain(':8888');
  });

  test('should have proper viewport and be responsive', async ({ page }) => {
    await page.goto('/');

    const viewports = [
      { width: 1920, height: 1080, name: 'Desktop' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 375, height: 667, name: 'Mobile' },
    ];

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      const root = page.locator('#root');
      await expect(root).toBeVisible();

      const hasOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });

      if (hasOverflow && viewport.name !== 'Mobile') {
        console.warn(`Horizontal overflow detected on ${viewport.name}`);
      }
    }
  });
});
