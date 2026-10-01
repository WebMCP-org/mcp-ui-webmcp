import { expect, type Locator, type Page, test } from '@playwright/test';

const toolPanel = (page: Page, title: string) =>
  page
    .locator('div.rounded-xl')
    .filter({ has: page.getByRole('heading', { name: title, exact: true }) })
    .last();

async function runTool(panel: Locator, name: string, args: Record<string, string> = {}) {
  await panel.getByRole('button', { name: new RegExp(`^${name}`) }).click();
  for (const [key, value] of Object.entries(args)) {
    await panel.locator(`#root_${key}`).fill(value);
  }
  await panel.getByRole('button', { name: 'Submit' }).click();
}

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
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('#root')).toBeVisible();

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
    await mcpPage.waitForLoadState('domcontentloaded');
    await expect(mcpPage.locator('#root')).toBeVisible();

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

// chat-ui (:5173) embeds the tic-tac-toe app from mcp-server (:8888), a different origin.
// Without native WebMCP, the iframe can only register tools if chat-ui runs the polyfill.
test.describe('WebMCP tools from a cross-origin MCP-UI iframe', () => {
  test('chat-ui lists and calls the tools the iframe registers', async ({ page }) => {
    await page.goto('http://localhost:5173');

    const toolsButton = page.getByRole('button', { name: 'View available tools' });
    await toolsButton.click();
    await runTool(toolPanel(page, 'Available Tools'), 'showTicTacToeGame');
    await toolsButton.click();

    const game = page.frameLocator('iframe[src^="http://localhost:8888"]');
    await game.getByRole('button', { name: 'Play as X' }).click();
    await game.getByRole('gridcell', { name: 'Cell 0, empty' }).click();

    const iframeTools = page.getByRole('button', { name: 'View 3 tools from showTicTacToeGame' });
    await expect(iframeTools).toBeVisible({ timeout: 15_000 });

    await iframeTools.click();
    await runTool(toolPanel(page, 'Tools from showTicTacToeGame'), 'tictactoe_ai_move', {
      position: '4',
    });
    await expect(game.getByRole('gridcell', { name: 'Cell 4, O' })).toBeVisible();
  });
});
