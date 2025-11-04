import { cloudflare } from '@cloudflare/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * Vite Configuration for MCP UI + WebMCP Starter
 *
 * This config handles:
 * 1. React app compilation with React Compiler (babel plugin)
 * 2. Tailwind CSS via @tailwindcss/vite plugin
 * 3. Cloudflare Workers integration via @cloudflare/vite-plugin
 *
 * Build output:
 * - dist/client/ - Built TicTacToe web app
 * - dist/mcp_ui_with_webmcp_my_mcp_server/ - Cloudflare Worker bundle
 *
 * The Cloudflare plugin handles both dev and production builds.
 */
export default defineConfig(({ command }) => ({
  plugins: [
    react({
      babel: {
        plugins: ['babel-plugin-react-compiler'],
      },
    }),
    tailwindcss(),
    // Only use Cloudflare plugin in dev mode, not in preview
    ...(command === 'serve' && !process.env.CI ? [cloudflare()] : []),
  ],
  server: {
    port: 8888,
    strictPort: true,
  },
  preview: {
    port: 8888,
    strictPort: true,
  },
}));
