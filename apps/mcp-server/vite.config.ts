import { cloudflare } from '@cloudflare/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import type { Plugin } from 'vite';

/**
 * Vite plugin to inline all assets into a single HTML file
 * Required for MCP Apps spec (text/html+mcp)
 */
function inlineAssets(): Plugin {
  return {
    name: 'inline-assets',
    enforce: 'post',
    generateBundle(_, bundle) {
      const htmlFiles = Object.keys(bundle).filter((i) => i.endsWith('.html'));

      for (const htmlFile of htmlFiles) {
        const htmlChunk = bundle[htmlFile];
        if (htmlChunk.type !== 'asset') continue;

        let html = htmlChunk.source as string;

        // Inline all JavaScript files
        for (const [fileName, chunk] of Object.entries(bundle)) {
          if (chunk.type === 'chunk' && fileName.endsWith('.js')) {
            const scriptTag = `<script type="module" crossorigin src="/${fileName}"></script>`;
            const inlineScript = `<script type="module">${chunk.code}</script>`;
            html = html.replace(scriptTag, inlineScript);
            delete bundle[fileName]; // Remove the separate JS file
          }
        }

        // Inline all CSS files
        for (const [fileName, chunk] of Object.entries(bundle)) {
          if (chunk.type === 'asset' && fileName.endsWith('.css')) {
            const linkTag = `<link rel="stylesheet" crossorigin href="/${fileName}">`;
            const styleTag = `<style>${chunk.source}</style>`;
            html = html.replace(linkTag, styleTag);
            delete bundle[fileName]; // Remove the separate CSS file
          }
        }

        htmlChunk.source = html;
      }
    },
  };
}

/**
 * Vite Configuration for MCP UI + WebMCP Starter
 *
 * This config handles:
 * 1. React app compilation with React Compiler (babel plugin)
 * 2. Tailwind CSS via @tailwindcss/vite plugin
 * 3. Cloudflare Workers integration via @cloudflare/vite-plugin
 * 4. Single-file HTML bundling for MCP Apps (text/html+mcp)
 *
 * Build output:
 * - dist/client/index.html - Self-contained single HTML file (MCP Apps)
 * - dist/mcp_ui_with_webmcp_my_mcp_server/ - Cloudflare Worker bundle
 *
 * The inline assets plugin ensures all JS/CSS is embedded in the HTML.
 */
export default defineConfig(() => ({
  plugins: [
    react({
      babel: {
        plugins: ['babel-plugin-react-compiler'],
      },
    }),
    tailwindcss(),
    cloudflare(),
    inlineAssets(), // NEW: Inline all assets for single-file HTML
  ],
  build: {
    // Inline all assets (images, fonts, etc.) as data URLs
    assetsInlineLimit: 100000000, // 100MB - inline everything
    cssCodeSplit: false, // Single CSS bundle
    rollupOptions: {
      output: {
        // Single JS bundle (will be inlined by plugin)
        inlineDynamicImports: true,
        manualChunks: undefined,
      },
    },
  },
  server: {
    port: 8888,
    strictPort: true,
  },
  preview: {
    port: 8888,
    strictPort: true,
  },
}));
