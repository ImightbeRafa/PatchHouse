import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function perfHtmlPlugin() {
  const criticalCss = fs.readFileSync(
    path.resolve(__dirname, 'src/styles/critical.css'),
    'utf-8'
  );

  return {
    name: 'perf-html',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        const moduleScriptMatch = html.match(
          /<script type="module" crossorigin src="([^"]+)"><\/script>/
        );
        const moduleScriptTag = moduleScriptMatch ? moduleScriptMatch[0] : '';
        const moduleScriptSrc = moduleScriptMatch ? moduleScriptMatch[1] : '';

        let out = html;

        if (moduleScriptTag) {
          out = out.replace(moduleScriptTag, '');
        }

        out = out.replace(
          /<link rel="stylesheet" crossorigin href="([^"]+\.css)">/,
          '<link rel="preload" as="style" href="$1" crossorigin onload="this.onload=null;this.rel=\'stylesheet\'">\n  <noscript><link rel="stylesheet" crossorigin href="$1"></noscript>'
        );

        out = out.replace(
          /<link rel="stylesheet" href="\/src\/styles\/main\.css">/,
          '<link rel="preload" as="style" href="/src/styles/main.css" onload="this.onload=null;this.rel=\'stylesheet\'">\n  <noscript><link rel="stylesheet" href="/src/styles/main.css"></noscript>'
        );

        if (moduleScriptSrc) {
          out = out.replace(
            '</body>',
            `  <script type="module" crossorigin src="${moduleScriptSrc}"></script>\n</body>`
          );
        }

        out = out.replace('</head>', `<style>${criticalCss}</style>\n</head>`);
        return out;
      }
    }
  };
}

export default defineConfig({
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    modulePreload: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false,
        passes: 2
      }
    },
    cssMinify: true,
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  },
  plugins: [perfHtmlPlugin()]
});
