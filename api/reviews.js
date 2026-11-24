// GET /api/reviews — the approved reviews shown on the site.
import { vercel } from './_telegram.js';
import { readApproved } from './_store.js';

export async function handle(_body, env) {
  const list = await readApproved(env).catch(() => []);
  return {
    ok: true,
    status: 200,
    data: list.map(({ id, name, rating, category, text, at }) => ({ id, name, rating, category, text, at })),
    headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120' },
  };
}

export default vercel(handle, { methods: ['GET'] });
