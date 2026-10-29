import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';

/**
 * Lets index.html pull each page section's markup from that section's own folder:
 *
 *   <!-- @include src/sections/catalogue/catalogue.html -->
 *
 * Paths are relative to this package, and an included file may include others (up to 4 levels).
 * The output is the same single static HTML page as before — nothing is fetched or injected at runtime.
 * Works for every HTML entry (the landing site and the portal).
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
        let out = html;
        for (let depth = 0; depth < 4 && /<!--\s*@include\s/.test(out); depth++) {
          out = out.replace(/<!--\s*@include\s+(\S+)\s*-->/g, (_m, rel: string) => readFileSync(resolve(root, rel), 'utf8').replace(/\r?\n$/, ''));
        }
        return out;
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

/**
 * Dev server only: in development the CSS is added by the JavaScript modules, so on a refresh the raw HTML
 * is drawn unstyled for a moment. This keeps the page hidden until the modules have run (DOMContentLoaded
 * fires after them), with a 3 s fallback so a script error can never leave the page blank.
 * The production build links its stylesheets in <head> and is untouched by this.
 */
function devNoFlash(): Plugin {
  return {
    name: 'dev-no-flash',
    apply: 'serve',
    transformIndexHtml: () => [
      { tag: 'style', attrs: { id: 'dev-no-flash' }, children: 'html{visibility:hidden}', injectTo: 'head-prepend' },
      {
        tag: 'script',
        injectTo: 'head-prepend',
        children:
          "(function(){function show(){var s=document.getElementById('dev-no-flash');if(s)s.remove()}" +
          "document.addEventListener('DOMContentLoaded',function(){requestAnimationFrame(show)});setTimeout(show,3000)})()",
      },
    ],
  };
}

/** Where /api is forwarded in development. The backend (packages/backend) listens on 8787 by default. */
const API_TARGET = process.env['VITE_API_PROXY'] || 'http://localhost:8787';

export default defineConfig({
  plugins: [htmlInclude(), devNoFlash()],
  server: {
    port: 5173,
    // The site and the API share one address in the browser, so the session cookie needs no CORS setup.
    proxy: { '/api': { target: API_TARGET, changeOrigin: false } },
  },
  build: {
    target: 'es2020',
    sourcemap: true,
    rollupOptions: {
      // Two documents: the landing site (index.html) and the signed-in portal (portal/index.html).
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        portal: fileURLToPath(new URL('./portal/index.html', import.meta.url)),
      },
    },
  },
});
