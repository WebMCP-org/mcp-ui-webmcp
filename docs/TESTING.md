# Testing Infrastructure

This repo relies on Playwright end-to-end tests that live in the `e2e-tests/` package. The suite spins up both apps (the React chat UI and the Cloudflare Worker starter) and exercises them exactly the way a user would interact with the deployed system.

## Overview

- **Framework**: Playwright 1.49 (Chromium)
- **Location**: `e2e-tests/`
- **Entrypoint scripts**: `pnpm test`, `pnpm test:chat-ui`, `pnpm test:remote-mcp`, `pnpm test:integration`
- **Why E2E-first**: The most critical behaviors (rendering MCP UI resources, WebMCP tool registration, chat orchestration) require a real browser + iframe context, so browser automation gives the most confidence.

## Test Suites

| Suite | Config | Verifies |
|-------|--------|----------|
| Chat UI | `playwright-chat-ui.config.ts` | Chat interface loads, no console errors, MCP client wiring |
| Remote MCP | `playwright-remote-mcp.config.ts` | Worker dev server boots, TicTacToe iframe renders, API routes respond |
| Integration | `playwright.config.ts` | Both apps run together, bidirectional tool flow works end-to-end |

Each config starts only the services it needs, so you can iterate quickly on the area you are touching.

## Running Tests

From the repo root:

```bash
# Install deps once
pnpm install

# Run every suite headlessly (spins up both apps)
pnpm test

# Focused runs
pnpm test:chat-ui
pnpm test:remote-mcp
pnpm test:integration

# Debugging helpers
pnpm test:ui        # Playwright UI mode
pnpm test:headed    # Visible browser
pnpm test:debug     # Inspector
pnpm test:report    # View last HTML report
```

Inside `e2e-tests/` you get the same commands without the workspace filters. Playwright browsers are not checked in, so run:

```bash
pnpm --filter @mcp-b/e2e-tests exec playwright install --with-deps chromium
```

## Project Structure (`e2e-tests/`)

```
e2e-tests/
├── tests/
│   ├── chat-ui.spec.ts
│   ├── remote-mcp-starter.spec.ts
│   └── integration.spec.ts
├── playwright.config.ts                # Starts both apps
├── playwright-chat-ui.config.ts        # Chat UI only
├── playwright-remote-mcp.config.ts     # Worker only
├── playwright-integration.config.ts    # Explicit integration run
├── package.json
└── README.md                           # Detailed instructions
```

## CI Expectations

- `.github/workflows/ci.yml` runs lint, type-check, and build on every push/PR using Node 24.3.0 (from `.nvmrc`).
- `.github/workflows/e2e.yml` is a manual workflow (`workflow_dispatch`) because GitHub-hosted runners currently lack the Cloudflare metadata services needed for the Worker dev server. Until that restriction is lifted, contributors **must** run `pnpm test` locally before opening a PR.

Mention any E2E results in your PR description so reviewers know they were exercised.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Port already in use (`5173` or `8888`) | `lsof -ti:5173 | xargs kill` (same for 8888) |
| Playwright browsers missing | `pnpm --filter @mcp-b/e2e-tests exec playwright install --with-deps chromium` |
| Worker cannot reach Cloudflare APIs | Use `pnpm dev` locally (works offline) or run in an env with CF access for CI |
| Tests keep timing out | Confirm both dev servers are printing “ready” before tests start; increase `timeout` in the relevant config if needed |

## Further Reading

- `e2e-tests/README.md` – canonical doc for the suite
- [Playwright docs](https://playwright.dev/docs/intro)
- [CONTRIBUTING.md](../CONTRIBUTING.md#testing) – repo-wide expectations
