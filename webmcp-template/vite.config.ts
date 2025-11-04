import { cloudflare } from '@cloudflare/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * Vite Configuration for WebMCP Template
 *
 * Build output:
 * - dist/client/ - Built web app
 * - dist/webmcp_template/ - Cloudflare Worker bundle
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
