# Contributing Guide for AI Agents

This guide outlines the development standards and best practices for AI assistants contributing to this codebase. Our philosophy prioritizes type safety, single source of truth, modularity, and clean, self-documenting code.

## Core Principles

### 0. Adhere to the principals of working with legacy codebases
 * Deeply investigate and understand existing code before making changes.
 * Adhere to existing coding styles and patterns.
 * Minimize changes to working code; prioritize stability.
 * Read documentation, check that it is accurate, and update it if it is not

### 1. Type Safety First

**Always leverage TypeScript's type system fully:**

✅ **Good:**
```typescript
interface GameState {
  board: (string | null)[];
  currentPlayer: 'X' | 'O';
  winner: 'X' | 'O' | 'draw' | null;
}

function checkWinner(board: (string | null)[]): 'X' | 'O' | null {
  // Implementation
}
```

❌ **Bad:**
```typescript
function checkWinner(board: any) {
  // Implementation
}
```

**Guidelines:**
- Never use `any` - use `unknown` if type is truly unknown, then narrow it
- Prefer union types over enums for string constants
- Use strict TypeScript settings (already configured in tsconfig files)
- Leverage type inference but annotate function signatures
- Use Zod for runtime validation (already used in MCP tool schemas)

**Verify types:** Run `pnpm typecheck` before committing.

### 2. Single Source of Truth

**Never duplicate information - always reference the canonical source.**

✅ **Good:**
```typescript
/**
 * Available MCP tools
 * See: worker/mcpServer.ts for tool implementations
 */
export const TOOL_NAMES = ['showTicTacToeGame', 'showExternalUrl'] as const;
```

❌ **Bad:**
```typescript
// Duplicating tool list that already exists in mcpServer.ts
export const TOOL_NAMES = ['showTicTacToeGame', 'showExternalUrl'];
```

**Guidelines:**
- Configuration lives in one place (e.g., `.env.development`, `vite.config.ts`)
- Constants are exported from a single module and imported elsewhere
- Types are defined once and shared via imports
- Documentation references other docs rather than duplicating content

**This applies to documentation too:**
- README.md has the project overview
- AGENTS.md links to other documentation (not duplicating it)
- Package READMEs describe their specific package
- ARCHITECTURE.md has design decisions

### 3. Modularity

**Write small, focused, reusable modules with clear boundaries.**

✅ **Good:**
```typescript
// src/game/logic.ts - Pure game logic
export function calculateWinner(board: Board): Winner {
  // Logic only, no UI or side effects
}

// src/components/TicTacToe.tsx - UI component
import { calculateWinner } from '../game/logic';

export function TicTacToe() {
  const winner = calculateWinner(board);
  // Render UI
}
```

❌ **Bad:**
```typescript
// Everything in one file
export function TicTacToe() {
  // Game logic mixed with UI
  const checkWinner = () => { /* ... */ };
  // Render UI
}
```

**Guidelines:**
- One responsibility per file/function
- Separate concerns: logic, UI, API, types
- Components should be composable and testable
- Pure functions for business logic
- Side effects isolated to specific modules

**File organization:**
```
src/
├── components/        # React components (UI only)
├── lib/              # Pure utility functions
├── types/            # Shared TypeScript types
├── hooks/            # React hooks (isolated logic)
└── constants/        # Configuration constants
```

### 4. Code Cleanliness

**Code should be self-documenting. Use JSDoc for public APIs, not inline comments.**

✅ **Good:**
```typescript
/**
 * Register a tool with the MCP server dynamically
 *
 * @param name - Unique tool identifier (e.g., "tictactoe_move")
 * @param schema - Zod schema defining tool parameters
 * @param handler - Async function that executes the tool
 * @returns Cleanup function to unregister the tool
 *
 * @example
 * ```ts
 * useWebMCP({
 *   name: "my_tool",
 *   schema: z.object({ value: z.string() }),
 *   handler: async (params) => ({ content: [{ type: "text", text: params.value }] })
 * });
 * ```
 */
export function useWebMCP<T>(config: ToolConfig<T>) {
  // Implementation
}
```

❌ **Bad:**
```typescript
export function useWebMCP<T>(config: ToolConfig<T>) {
  // Initialize transport
  const transport = getTransport();

  // Register the tool
  transport.register(config.name);

  // Set up handler
  const handler = config.handler;

  // Return cleanup
  return () => transport.unregister(config.name);
}
```

**Guidelines:**
- Write clear function/variable names instead of comments
- Use JSDoc for all exported functions, classes, and types
- Include `@param`, `@returns`, and `@example` in JSDoc
- No inline comments explaining "what" - code should be clear
- Only use inline comments for "why" if truly necessary (rare)
- Keep functions small and focused (easier to understand without comments)

**JSDoc best practices:**
- Document the interface, not the implementation
- Include examples for complex APIs
- Link to related documentation: `@see worker/mcpServer.ts`
- Keep it concise but complete

## Practical Guidelines

### Adding New Features

**Before writing code:**
1. Check existing patterns in the codebase
2. Review relevant documentation (ARCHITECTURE.md, package READMEs)
3. Ensure the feature fits the existing architecture
4. Identify where types, logic, and UI should live

**When writing code:**
1. Define TypeScript types/interfaces first
2. Write pure logic functions (testable)
3. Create UI components that use the logic
4. Add JSDoc to public APIs
5. Update relevant documentation if needed

**After writing code:**
```bash
pnpm check     # Lint and typecheck
pnpm build     # Ensure builds succeed
pnpm test      # Run E2E tests locally (REQUIRED before submitting PR)
```

**IMPORTANT - Running E2E Tests Before PR Submission:**

E2E tests require Cloudflare Workers runtime and do **NOT** run in CI due to network restrictions. You **MUST** run them locally before submitting a PR:

```bash
# Run all E2E tests (REQUIRED)
pnpm test

# Or run specific test suites
pnpm test:chat-ui          # Chat UI tests only
pnpm test:remote-mcp       # Remote MCP tests only
pnpm test:integration      # Integration tests

# Useful for debugging
pnpm test:ui               # Run with Playwright UI
pnpm test:headed           # See browser while testing
pnpm test:report           # View test results
```

The E2E tests will automatically start the dev servers for both applications. All tests must pass before your PR can be merged.

### Modifying Existing Code

**Follow the existing patterns:**
- If file uses named exports, continue using named exports
- If types are in a separate file, add new types there
- Match the JSDoc style of the module
- Maintain the same level of abstraction

**Don't refactor unnecessarily:**
- If code works and follows these principles, leave it
- Only refactor if fixing a bug or adding a feature
- Refactoring should improve clarity, not just change style

### Documentation Updates

**When documentation needs updating:**
- Update the canonical source (e.g., README.md, not AGENTS.md)
- AGENTS.md should only link, never duplicate
- Keep documentation close to code when possible
- Package-specific docs go in package READMEs
- Architecture decisions go in ARCHITECTURE.md

### Testing

**Write tests when:**
- Adding complex business logic
- Creating reusable utilities
- Implementing critical features

**Test structure:**
```typescript
/**
 * Tests for game winner calculation
 * @see src/game/logic.ts
 */
describe('calculateWinner', () => {
  it('returns X when X wins horizontally', () => {
    const board = ['X', 'X', 'X', null, null, null, null, null, null];
    expect(calculateWinner(board)).toBe('X');
  });
});
```

**Current test setup:**
- E2E tests: Playwright (see [tests/e2e/README.md](./tests/e2e/README.md))
- Unit tests: Not yet configured (would use Vitest)

## Code Review Checklist

Before submitting changes, verify:

- [ ] **Type safety**: No `any`, all types are explicit
- [ ] **No duplication**: Information lives in one place
- [ ] **Modularity**: Functions/components have single responsibility
- [ ] **Clean code**: JSDoc on public APIs, no inline comments
- [ ] **Lint & typecheck pass**: `pnpm check` succeeds with no errors
- [ ] **Build succeeds**: `pnpm build` completes without errors
- [ ] **E2E tests pass**: `pnpm test` runs successfully (REQUIRED - the GitHub `e2e.yml` workflow is manual, so run locally and share the results)
- [ ] **Documentation updated**: If changing APIs or architecture
- [ ] **Follows patterns**: Matches existing code style and structure

## Common Patterns

### MCP Tool Definition

```typescript
/**
 * Register an MCP tool that displays a UI resource
 * Tool implementations live in worker/mcpServer.ts
 */
this.server.tool(
  "toolName",
  "Clear description of what this tool does",
  { /* Optional JSON schema */ },
  async (params) => {
    // Implementation
    return {
      content: [/* UI resource or text */]
    };
  }
);
```

### WebMCP Hook Usage

```typescript
/**
 * Register a tool that can be called by the AI
 * The tool is automatically unregistered when component unmounts
 */
useWebMCP({
  name: "tool_name",
  description: "What the tool does",
  schema: z.object({ /* Zod schema */ }),
  handler: async (params) => {
    // Type-safe params from schema
    return { content: [{ type: "text", text: "Result" }] };
  }
});
```

### React Component Structure

```typescript
/**
 * TicTacToe game component with WebMCP integration
 * Manages game state and registers MCP tools for AI interaction
 */
export function TicTacToeWithWebMCP() {
  // State
  const [board, setBoard] = useState<Board>(initialBoard);

  // Logic (extracted to separate module)
  const winner = calculateWinner(board);

  // WebMCP integration
  useWebMCP({ /* ... */ });

  // Render
  return <div>{/* UI */}</div>;
}
```

### Error Handling

```typescript
/**
 * Handle tool execution errors gracefully
 * Always return valid MCP response even on error
 */
try {
  const result = await executeTool(params);
  return { content: [{ type: "text", text: result }] };
} catch (error) {
  console.error('Tool execution failed:', error);
  return {
    content: [{
      type: "text",
      text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }],
    isError: true
  };
}
```

## Resources

### Primary Documentation
- [README.md](./README.md) - Project overview and quick start
- [AGENTS.md](./AGENTS.md) - Navigation hub for all documentation
- [ARCHITECTURE.md](./apps/mcp-server/ARCHITECTURE.md) - Design decisions

### External Resources
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)
- [MCP Specification](https://spec.modelcontextprotocol.io/)
- [Zod Documentation](https://zod.dev/)

## Questions?

If you're unsure about a pattern or approach:
1. Check existing code for similar patterns
2. Review [ARCHITECTURE.md](./apps/mcp-server/ARCHITECTURE.md) for design decisions
3. Look at [apps/mcp-server/src/TicTacToeWithWebMCP.tsx](./apps/mcp-server/src/TicTacToeWithWebMCP.tsx) for a complete example
4. When in doubt, prioritize clarity and type safety

---

**Remember**: These principles exist to make the codebase maintainable and understandable. When followed consistently, they reduce bugs, improve collaboration, and make the code self-documenting.
