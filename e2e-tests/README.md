# E2E Tests

End-to-end tests for the MCP UI WebMCP monorepo.

## Overview

This package contains Playwright-based E2E tests for:

1. **Chat UI App** - Tests for the main chat UI application
2. **Remote MCP Starter** - Tests for the MCP server with UI starter
3. **Integration Tests** - Tests that verify both apps work together

## Running Tests

### From Root Directory

```bash
# Run all E2E tests (runs all apps)
pnpm test

# Run only integration tests (starts both servers)
pnpm test:integration

# Run only chat-ui tests
pnpm test:chat-ui

# Run only remote-mcp tests
pnpm test:remote-mcp

# Run with Playwright UI
pnpm test:ui

# Run in debug mode
pnpm test:debug

# Run in headed mode (see browser)
pnpm test:headed

# View test report
pnpm test:report
```

### From E2E Tests Directory

```bash
cd e2e-tests

# Run all tests
pnpm test

# Run specific test suite
pnpm test:chat-ui
pnpm test:remote-mcp
pnpm test:integration

# Run with UI
pnpm test:ui
```

## Test Structure

```
e2e-tests/
├── tests/
│   ├── chat-ui.spec.ts          # Chat UI app tests
│   ├── remote-mcp-starter.spec.ts  # Remote MCP tests
│   └── integration.spec.ts      # Integration tests
├── playwright.config.ts         # Default config (runs all tests with both servers)
├── playwright-chat-ui.config.ts    # Chat UI specific config
├── playwright-remote-mcp.config.ts # Remote MCP specific config
├── playwright-integration.config.ts # Integration specific config
└── package.json
```

## Test Suites

### Chat UI Tests

Tests the main chat UI application:
- Application loads correctly
- React app mounts
- No console errors
- Network requests succeed
- Responsive design works

### Remote MCP Starter Tests

Tests the MCP server with UI:
- Application loads correctly
- React app mounts
- No console errors
- Runs on correct port (8888)
- Responsive design works

### Integration Tests

Tests both apps running together:
- Both servers start successfully
- Both apps load in parallel
- No cross-app errors
- Both apps remain responsive

## Configuration

Each test suite has its own Playwright config:

- **playwright.config.ts** - Starts both servers, runs all tests
- **playwright-chat-ui.config.ts** - Starts chat-ui only (port 5173)
- **playwright-remote-mcp.config.ts** - Starts remote-mcp only (port 8888)
- **playwright-integration.config.ts** - Starts both servers for integration tests

## CI/CD

Tests are configured to:
- Retry failed tests 2 times on CI
- Run serially on CI (workers: 1)
- Capture screenshots on failure
- Generate HTML reports
- Output GitHub Actions annotations

## Debugging

### Playwright UI Mode (Recommended)

```bash
pnpm test:ui
```

Provides:
- Visual test execution
- Time travel debugging
- DOM snapshots
- Console logs
- Network activity

### Debug Mode

```bash
pnpm test:debug
```

Opens Playwright Inspector for step-by-step debugging.

### Viewing Reports

After running tests:

```bash
pnpm test:report
```

## Troubleshooting

### Port Already in Use

Kill processes using the ports:

```bash
lsof -ti:5173 | xargs kill
lsof -ti:8888 | xargs kill
```

### Playwright Not Installed

Install Playwright browsers:

```bash
cd e2e-tests
pnpm exec playwright install
```

### Tests Timeout

Increase timeout in the relevant config file:

```typescript
timeout: 180000, // 3 minutes
```
