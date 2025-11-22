import { createUIResource } from '@mcp-ui/server';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpAgent } from 'agents/mcp';

/**
 * WebMCP Template MCP Server.
 * Minimal MCP server demonstrating embedded web app serving with WebMCP integration.
 *
 * Provides:
 * - showTemplateApp: Tool to display the embedded web application
 * - sayHello: Example server-side tool without UI requirement
 * - LaunchTemplate: Prompt to quickly launch the template app
 * - BuildGame: Interactive prompt to scaffold new games
 *
 * @example
 * ```typescript
 * // Cloudflare Worker instantiates this class via Durable Objects
 * export class TemplateMCP extends McpAgent<Cloudflare.Env> {
 *   async init() {
 *     // Register tools and prompts
 *     this.server.tool('myTool', 'description', {}, async () => {...});
 *   }
 * }
 * ```
 */
export class TemplateMCP extends McpAgent<Cloudflare.Env> {
  server = new McpServer({
    name: 'webmcp-template',
    version: '1.0.0',
  });

  async init() {
    /**
     * Tool: Show Template App
     *
     * This tool displays your embedded web app in an iframe.
     * The app can then register its own WebMCP tools dynamically.
     */
    this.server.tool(
      'showTemplateApp',
      `Display the template web application with WebMCP integration.

After calling this tool, the app will appear and register the following WebMCP tools:
- template_get_message: Get the current message from the app
- template_update_message: Update the message displayed in the app
- template_reset: Reset the message to default

Use this as a starting point to build your own interactive apps!`,
      {},
      async () => {
        try {
          const iframeUrl = `${this.env.APP_URL}/`;

          const uiResource = createUIResource({
            uri: 'ui://template-app',
            content: {
              type: 'externalUrl',
              iframeUrl: iframeUrl,
            },
            encoding: 'blob',
          });

          return {
            content: [
              {
                type: 'text',
                text: `# Template App Started

The template app is now displayed in the side panel.

**Available tools** (registered via WebMCP):
- \`template_get_message\` - View the current message
- \`template_update_message\` - Change the message
- \`template_reset\` - Reset to default

Try calling these tools to interact with the app!`,
              },
              uiResource,
            ],
          };
        } catch (error) {
          console.error('Error creating template app resource:', error);
          throw error;
        }
      }
    );

    /**
     * Example Tool: Say Hello
     *
     * A simple server-side tool that doesn't require UI.
     * Use this pattern for tools that don't need WebMCP.
     */
    this.server.tool(
      'sayHello',
      'A simple greeting tool (server-side, no WebMCP needed)',
      {},
      async () => {
        return {
          content: [
            {
              type: 'text',
              text: 'Hello from the MCP server! 👋',
            },
          ],
        };
      }
    );

    /**
     * Example Prompt: Launch Template
     *
     * Pre-configured prompt that users can trigger to launch your app.
     */
    this.server.prompt('LaunchTemplate', 'Launch the template application', async () => {
      try {
        return {
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: 'Show me the template app',
              },
            },
          ],
        };
      } catch (error) {
        console.error('Error creating prompt:', error);
        throw error;
      }
    });

    /**
     * Prompt: Game Builder
     *
     * Helps users scaffold new games in the WebMCP template.
     * Asks the user what game they want to build, then provides complete implementation.
     */
    this.server.prompt('BuildGame', 'Scaffold a new game in the WebMCP template', async () => {
      try {
        return {
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `I want to build a game using the WebMCP template. The WebMCP template provides:

- A React app in src/App.tsx
- An MCP server in worker/mcpServer.ts
- WebMCP integration via the useWebMCP hook
- Tailwind CSS for styling

Project structure:
- src/App.tsx - Main React component
- src/main.tsx - Entry point (already set up)
- src/index.css - Styles (already has Tailwind)
- worker/mcpServer.ts - MCP server with tools
- worker/index.ts - Worker routing (already set up)

The template pattern is:
1. Build game logic and UI in src/App.tsx
2. Register WebMCP tools with useWebMCP() hook
3. Add an MCP tool in worker/mcpServer.ts to display the game
4. Both UI buttons and WebMCP tools should call the same game logic functions

Requirements:
- Use React hooks for state management
- Use Tailwind CSS for styling
- Register WebMCP tools that allow the AI to interact with the game
- Tools and UI should share the same game logic (single source of truth)
- Include proper error handling and validation
- Make the UI responsive and accessible

Before you start implementing, please ASK ME:
1. What game would you like to build? (e.g., Chess, Connect Four, Wordle, Hangman, Memory, etc.)
2. Any specific requirements or features you want?
3. Should it be single-player, two-player, or AI vs player?

After I tell you what game I want, please:
1. Explain the game rules and implementation plan
2. List the WebMCP tools you'll create
3. Provide the complete implementation for src/App.tsx
4. Provide the updated worker/mcpServer.ts
5. Explain how to test it

Let's start - what game would you like to build?`,
              },
            },
          ],
        };
      } catch (error) {
        console.error('Error creating prompt:', error);
        throw error;
      }
    });
  }
}
