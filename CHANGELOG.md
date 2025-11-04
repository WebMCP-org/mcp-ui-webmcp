# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-11-04

### Added

- **Initial release** of MCP UI + WebMCP Demo Monorepo
- Modern React chat interface (`chat-ui`) with MCP and WebMCP integration
  - AI assistant UI with side panel for embedded apps
  - MCP client with HTTP/SSE transport
  - WebMCP integration for bidirectional tool registration
  - Mobile-responsive design with swipe gestures
  - Dark mode support
- MCP server (`remote-mcp-with-ui-starter`) running on Cloudflare Workers
  - MCP protocol implementation with UI resource support
  - TicTacToe game example with WebMCP integration
  - Durable Objects for persistent game statistics
  - Static asset serving for embedded apps
- End-to-end testing suite with Playwright
  - Chat UI tests
  - MCP server tests
  - Integration tests
- Comprehensive documentation
  - Main README with quick start guide
  - CONTRIBUTING.md with development standards
  - AGENTS.md for AI agent navigation
  - Architecture documentation
  - Environment setup guide
  - Testing documentation
- Development tooling
  - TypeScript 5.8.3 with strict configuration
  - pnpm workspace configuration
  - Turborepo for task orchestration
  - ESLint for code quality
  - Vitest for unit testing
- CI/CD with GitHub Actions
  - Lint and typecheck on PR
  - Build verification
- GitHub templates
  - Bug report template
  - Feature request template
  - Pull request template
- MIT License
- Project metadata in all package.json files
- VSCode workspace configuration

### Technology Stack

- **Frontend**: React 19.1.1, TypeScript 5.8.3, Vite 7.1.12
- **Styling**: Tailwind CSS 4.1.10, Radix UI components
- **AI Integration**: Vercel AI SDK, Anthropic provider
- **MCP**: @modelcontextprotocol/sdk, @mcp-ui/*, @mcp-b/* packages
- **Backend**: Cloudflare Workers, Hono, Durable Objects
- **Testing**: Playwright 1.49.2, Vitest 2.1.8
- **Monorepo**: pnpm 10.14.0, Turborepo 2.5.6

## [Unreleased]

### Planned

- Refactor large components into smaller, focused hooks (see REFACTORING_ANALYSIS.md)
- Add unit tests for custom hooks
- Add more example embedded apps
- Performance optimizations
- Bundle size analysis
- Deployment guides for production

---

For upgrade instructions and migration guides, see [CONTRIBUTING.md](./CONTRIBUTING.md).

[1.0.0]: https://github.com/WebMCP-org/mcp-ui-webmcp/releases/tag/v1.0.0
[Unreleased]: https://github.com/WebMCP-org/mcp-ui-webmcp/compare/v1.0.0...HEAD
