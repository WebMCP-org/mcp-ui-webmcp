import { createUIResource } from '@mcp-ui/server';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpAgent } from 'agents/mcp';

/**
 * WebMCP Vanilla Template MCP Server.
 * Minimal MCP server for vanilla HTML/JS template with no build step required.
 *
 * Provides:
 * - showTemplateApp: Tool to display the vanilla HTML embedded app
 * - sayHello: Example server-side tool without UI
 * - LaunchTemplate: Prompt to quickly launch the template
 * - BuildGame: Interactive prompt to scaffold vanilla JS games
 *
 * Uses pure HTML/CSS/JavaScript with @mcp-b/global IIFE build via script tag.
 * Perfect for learning WebMCP or building simple interactive tools.
 *
 * @example
 * ```typescript
 * // Cloudflare Worker instantiates this class via Durable Objects
 * export class VanillaTemplateMCP extends McpAgent<Cloudflare.Env> {
 *   async init() {
 *     // Register tools that serve static HTML from public/ directory
 *     this.server.tool('myTool', 'description', {}, async () => {...});
 *   }
 * }
 * ```
 */
export class VanillaTemplateMCP extends McpAgent<Cloudflare.Env> {
  server = new McpServer({
    name: 'webmcp-template-vanilla',
    version: '1.0.0',
  });

  async init() {
    /**
     * Tool: Show Template App
     *
     * Displays the vanilla HTML app in an iframe.
     * The app uses the @mcp-b/global IIFE build loaded via script tag.
     */
    this.server.tool(
      'showTemplateApp',
      `Display the template web application (vanilla HTML/JS version).

This template uses NO build step - just pure HTML, CSS, and JavaScript!

After calling this tool, the app will appear and register the following WebMCP tools:
- template_get_message: Get the current message from the app
- template_update_message: Update the message displayed in the app
- template_reset: Reset the message to default

Perfect for learning WebMCP or building simple interactive tools!`,
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
                text: `# Template App Started (Vanilla Version)

The template app is now displayed in the side panel.

**No build step required!** This version uses:
- Pure HTML/CSS/JavaScript
- Tailwind CSS via CDN
- @mcp-b/global IIFE build via script tag

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
     * Prompt: Launch Template
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
     * Helps users scaffold new games using vanilla HTML/JS.
     */
    this.server.prompt('BuildGame', 'Scaffold a new game in the vanilla template', async () => {
      try {
        return {
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `I want to build a game using the WebMCP vanilla template (NO build step required!).

The vanilla template uses:
- Pure HTML/CSS/JavaScript
- Tailwind CSS via CDN for styling
- @mcp-b/global IIFE build via script tag for WebMCP
- window.navigator.modelContext API for tool registration

Project structure:
- public/index.html - Everything in one file!

The template pattern is:
1. Build game logic in vanilla JavaScript
2. Register WebMCP tools using window.navigator.modelContext.provideContext()
3. Both UI buttons and WebMCP tools call the same game logic functions
4. No transpiling, no bundling - just refresh the browser!

Requirements:
- Use vanilla JavaScript (no frameworks)
- Use Tailwind CSS classes for styling
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
3. Provide the complete implementation for public/index.html
4. Provide the updated worker/mcpServer.ts
5. Explain how to test it (just open the HTML file in a browser!)

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
