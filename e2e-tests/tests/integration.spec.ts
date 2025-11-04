import { expect, test } from '@playwright/test';

/**
 * Integration tests for MCP server and Chat UI
 * These tests verify that both apps can run together and communicate
 */
test.describe('MCP Server + Chat UI Integration Tests', () => {
  test('should have both MCP server and Chat UI running', async ({ page, context }) => {
    const mcpPage = await context.newPage();
    await mcpPage.goto('http://localhost:8888');
    await mcpPage.waitForLoadState('domcontentloaded');

    const mcpRoot = mcpPage.locator('#root');
    await expect(mcpRoot).toBeAttached();

    await page.goto('http://localhost:5173');
    await page.waitForLoadState('domcontentloaded');

    const chatRoot = page.locator('#root');
    await expect(chatRoot).toBeAttached();

    expect(await mcpPage.title()).toBeTruthy();
    expect(await page.title()).toBeTruthy();

    await mcpPage.close();
  });

  test('should not have console errors on either app', async ({ page, context }) => {
    const errors: { app: string; error: string }[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push({ app: 'chat-ui', error: msg.text() });
      }
    });

    page.on('pageerror', (error) => {
      errors.push({ app: 'chat-ui', error: error.message });
    });

    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    const mcpPage = await context.newPage();

    mcpPage.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push({ app: 'mcp-server', error: msg.text() });
      }
    });

    mcpPage.on('pageerror', (error) => {
      errors.push({ app: 'mcp-server', error: error.message });
    });

    await mcpPage.goto('http://localhost:8888');
    await mcpPage.waitForLoadState('networkidle');

    const criticalErrors = errors.filter((error) => {
      return !error.error.includes('favicon.ico');
    });

    if (criticalErrors.length > 0) {
      console.log('Errors found:', criticalErrors);
    }

    expect(criticalErrors).toEqual([]);

    await mcpPage.close();
  });

  test('should verify both apps are responsive', async ({ page, context }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('domcontentloaded');

    const chatRoot = page.locator('#root');
    await expect(chatRoot).toBeVisible();

    const mcpPage = await context.newPage();
    await mcpPage.goto('http://localhost:8888');
    await mcpPage.waitForLoadState('domcontentloaded');

    const mcpRoot = mcpPage.locator('#root');
    await expect(mcpRoot).toBeVisible();

    await mcpPage.close();
  });
});
