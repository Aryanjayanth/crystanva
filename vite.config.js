import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { handle as order } from './api/order.js';
import { handle as review } from './api/review.js';
import { handle as reviews } from './api/reviews.js';
import { handle as telegram } from './api/telegram.js';

// Local dev: serves the /api routes the same way Vercel will in production.
const routes = { '/api/order': order, '/api/review': review, '/api/reviews': reviews, '/api/telegram': telegram };

function devApi(env) {
  return {
    name: 'dev-api',
    configureServer(server) {
      // dev-only: saves images made by the render studio (#render) — never part of the live site
      server.middlewares.use('/__render', (req, res) => {
        let body = '';
        req.on('data', (c) => (body += c));
        req.on('end', () => {
          try {
            const { key, data } = JSON.parse(body);
            if (!/^[a-zA-Z0-9_-]+$/.test(key) || !data.startsWith('data:image/webp;base64,')) throw new Error('bad input');
            mkdirSync('public/renders', { recursive: true });
            writeFileSync(`public/renders/${key}.webp`, Buffer.from(data.split(',')[1], 'base64'));
            const list = new Set(JSON.parse(readFileSync('src/renders.json', 'utf8')));
            list.add(key);
            writeFileSync('src/renders.json', JSON.stringify([...list].sort(), null, 2) + '\n');
            res.end('ok');
          } catch (e) {
            res.statusCode = 400;
            res.end(String(e.message));
          }
        });
      });
      for (const [path, handle] of Object.entries(routes)) {
        server.middlewares.use(path, (req, res) => {
          let body = '';
          req.on('data', (c) => (body += c));
          req.on('end', async () => {
            res.setHeader('Content-Type', 'application/json');
            try {
              const data = JSON.parse(body || '{}');
              const r = await handle(data, env, req.headers);
              if (!r.ok && r.unconfigured) {
                console.log(`\n[demo mode – Telegram not configured] ${path} received:\n`, data, '\n');
                res.end(JSON.stringify({ ok: true, demo: true }));
                return;
              }
              res.statusCode = r.status;
              res.end(JSON.stringify(r.ok ? (r.data ?? { ok: true }) : { error: r.error }));
            } catch {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Bad request' }));
            }
          });
        });
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // three.js is lazy-loaded only where the 3D viewer appears, so a larger chunk is expected
  return { plugins: [react(), devApi(env)], build: { chunkSizeWarningLimit: 1200 } };
});
