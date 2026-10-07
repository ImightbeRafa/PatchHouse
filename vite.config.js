import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import { generatePages, GENERATED } from './scripts/build-pages.js';

const root = path.dirname(fileURLToPath(import.meta.url));

/** Every generated HTML file is a Rollup entry (multi-page app). */
function htmlInputs() {
  const inputs = {};
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.html')) inputs[path.relative(root, full).replace(/\\|\//g, '_').replace(/\.html$/, '')] = full;
    }
  };
  for (const name of GENERATED) {
    const full = path.join(root, name);
    if (!fs.existsSync(full)) continue;
    if (fs.statSync(full).isDirectory()) walk(full);
    else inputs[name.replace(/\.html$/, '')] = full;
  }
  return inputs;
}

/**
 * Dev-only: serves /api/* from the same handlers production runs, so
 * `npm run dev` exercises the real checkout code (SINPE, config, Tilopay create-payment).
 * Also regenerates pages when templates or the shared catalog change.
 */
function devApiPlugin() {
  return {
    name: 'patchhouse-dev-api',
    apply: 'serve',
    configureServer(server) {
      // Safety: local dev never emails customers, writes to the CRM or fires Meta events unless explicitly disabled.
      if (process.env.ORDER_DRY_RUN === undefined) process.env.ORDER_DRY_RUN = 'true';
      const env = loadEnv('development', root, '');
      for (const [k, v] of Object.entries(env)) if (process.env[k] === undefined) process.env[k] = v;

      const regenerate = (file) => {
        if (!/[\\/](shared|src[\\/]templates)[\\/]/.test(file)) return;
        try {
          execFileSync(process.execPath, [path.join(root, 'scripts/build-pages.js')], { stdio: 'inherit', env: { ...process.env, NODE_ENV: 'development' } });
          server.ws.send({ type: 'full-reload' });
        } catch (err) {
          server.config.logger.error(`[pages] ${err.message}`);
        }
      };
      server.watcher.add([path.join(root, 'shared'), path.join(root, 'src/templates')]);
      server.watcher.on('change', regenerate);

      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url, 'http://localhost');
        if (!url.pathname.startsWith('/api/')) return next();

        const rel = url.pathname.replace(/^\/api\//, '').replace(/\/+$/, '');
        const file = path.join(root, 'api', `${rel}.js`);
        if (rel.startsWith('_') || rel.includes('..') || !fs.existsSync(file)) {
          res.statusCode = 404;
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ error: 'Not found' }));
        }

        let raw = '';
        for await (const chunk of req) raw += chunk;
        req.body = undefined;
        if (raw) {
          try { req.body = JSON.parse(raw); } catch { req.body = raw; }
        }
        res.status = (code) => { res.statusCode = code; return res; };
        res.json = (data) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(data)); return res; };

        try {
          const mod = await server.ssrLoadModule(file);
          await mod.default(req, res);
        } catch (err) {
          server.config.logger.error(`[api] ${err.stack || err.message}`);
          if (!res.writableEnded) res.status(500).json({ error: 'Internal error' });
        }
      });
    }
  };
}

export default defineConfig(({ command }) => {
  if (command === 'build') generatePages('production');
  return {
    appType: 'mpa',
    server: { port: 3000, open: false },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false,
      modulePreload: { polyfill: false },
      minify: 'terser',
      cssMinify: true,
      rollupOptions: { input: htmlInputs() }
    },
    plugins: [devApiPlugin()]
  };
});
