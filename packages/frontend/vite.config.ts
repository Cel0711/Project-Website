import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';

/**
 * Lets index.html pull each page section's markup from that section's own folder:
 *
 *   <!-- @include src/sections/catalogue/catalogue.html -->
 *
 * Paths are relative to this package. The output is the same single static HTML
 * page as before — nothing is fetched or injected at runtime.
 */
function htmlInclude(): Plugin {
  let root = process.cwd();
  return {
    name: 'html-include',
    configResolved(cfg) {
      root = cfg.root;
    },
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        return html.replace(/<!--\s*@include\s+(\S+)\s*-->/g, (_m, rel: string) =>
          readFileSync(resolve(root, rel), 'utf8').replace(/\r?\n$/, ''),
        );
      },
    },
    // Partials aren't in the module graph, so tell the dev server to reload when one changes.
    handleHotUpdate({ file, server }) {
      if (file.endsWith('.html') && file.includes('/src/sections/')) {
        server.ws.send({ type: 'full-reload' });
        return [];
      }
    },
  };
}

export default defineConfig({
  plugins: [htmlInclude()],
  server: {
    port: 5173,
  },
  build: {
    target: 'es2020',
    sourcemap: true,
  },
});
