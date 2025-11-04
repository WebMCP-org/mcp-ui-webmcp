import { expect, test } from '@playwright/test';

/**
 * Integration tests for MCP server and Chat UI
 * These tests verify that both apps can run together and communicate
 */
test.describe('MCP Server + Chat UI Integration Tests', () => {
  test('should have both MCP server and Chat UI running', async ({ page, context }) => {
    // Open MCP server in a new page
    const mcpPage = await context.newPage();
    await mcpPage.goto('http://localhost:8888');
    await mcpPage.waitForLoadState('domcontentloaded');

    // Verify MCP server loaded
    const mcpRoot = mcpPage.locator('#root');
    await expect(mcpRoot).toBeAttached();

    // Open Chat UI in the main page
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('domcontentloaded');

    // Verify Chat UI loaded
    const chatRoot = page.locator('#root');
    await expect(chatRoot).toBeAttached();

    // Both apps are running
    expect(await mcpPage.title()).toBeTruthy();
    expect(await page.title()).toBeTruthy();

    await mcpPage.close();
  });

  test('should not have console errors on either app', async ({ page, context }) => {
    const errors: { app: string; error: string }[] = [];

    // Monitor Chat UI errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push({ app: 'chat-ui', error: msg.text() });
      }
    });

    page.on('pageerror', (error) => {
      errors.push({ app: 'chat-ui', error: error.message });
    });

    // Open Chat UI
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    // Open MCP server
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

    // Filter out known acceptable errors
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
    // Test Chat UI responsiveness
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('domcontentloaded');

    const chatRoot = page.locator('#root');
    await expect(chatRoot).toBeVisible();

    // Test MCP server responsiveness
    const mcpPage = await context.newPage();
    await mcpPage.goto('http://localhost:8888');
    await mcpPage.waitForLoadState('domcontentloaded');

    const mcpRoot = mcpPage.locator('#root');
    await expect(mcpRoot).toBeVisible();

    await mcpPage.close();
  });
});
