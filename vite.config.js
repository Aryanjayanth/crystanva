import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { categories, colors, glitters, fromPrice } from './src/data.js';
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

// SEO at build time: structured data (store + products with current prices from src/data.js) and sitemap.xml
const SITE = 'https://crystanva.vercel.app';
const CARD_IMAGES = { personal: 'letter_M_clear_gold-glitter_top', shapes: 'shape_star_white_rosegold-foil_top', pens: 'pen_pen_clear_gold-glitter_top', plates: 'plate_hexagon_white_gold-foil_top' };
function seo() {
  const today = new Date().toISOString().slice(0, 10);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'OnlineStore', '@id': `${SITE}/#store`, name: 'Crystanva', url: `${SITE}/`,
        slogan: 'Made for you', logo: `${SITE}/icon-512.png`, image: `${SITE}/og-image.jpg`,
        description: 'Personalised handmade resin keychains, pens and coasters, designed by you in a live 3D preview.',
        areaServed: 'IN', address: { '@type': 'PostalAddress', addressLocality: 'Hyderabad', addressRegion: 'Telangana', addressCountry: 'IN' },
      },
      { '@type': 'WebSite', '@id': `${SITE}/#website`, name: 'Crystanva', url: `${SITE}/`, inLanguage: 'en-IN', publisher: { '@id': `${SITE}/#store` } },
      ...categories.map((c) => ({
        '@type': 'Product', name: c.title, description: `${c.blurb} Handmade resin, customised by you.`,
        image: `${SITE}/renders/${CARD_IMAGES[c.id]}.webp`, brand: { '@type': 'Brand', name: 'Crystanva' },
        color: colors.filter((x) => x.inStock).map((x) => x.name).join(', '),
        material: 'Resin', additionalProperty: [{ '@type': 'PropertyValue', name: 'Glitter options', value: glitters.filter((g) => g.inStock && g.kind !== 'none').map((g) => g.name).join(', ') }],
        offers: { '@type': 'Offer', price: fromPrice(c), priceCurrency: 'INR', availability: 'https://schema.org/MadeToOrder', url: `${SITE}/#collections`, seller: { '@id': `${SITE}/#store` } },
      })),
    ],
  };
  return {
    name: 'seo',
    transformIndexHtml: () => [{ tag: 'script', attrs: { type: 'application/ld+json' }, children: JSON.stringify(jsonLd), injectTo: 'head' }],
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>${SITE}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
${Object.values(CARD_IMAGES).map((k) => `    <image:image><image:loc>${SITE}/renders/${k}.webp</image:loc></image:image>`).join('\n')}
  </url>
</urlset>
` });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // three.js is lazy-loaded only where the 3D viewer appears, so a larger chunk is expected
  return { plugins: [react(), devApi(env), seo()], build: { chunkSizeWarningLimit: 1200 } };
});
