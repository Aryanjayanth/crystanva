// POST /api/review — sends a customer review to your Telegram for approval.
// To publish it, copy it into the `reviews` list in src/data.js.
import { esc, sendTelegram, vercel } from './_telegram.js';

export async function handle(r, env) {
  const rating = Math.max(1, Math.min(5, Number(r?.rating) || 0));
  if (!r?.name || !r?.text || String(r.text).trim().length < 10) return { ok: false, status: 400, error: 'Name and a short review are required.' };
  const text = [
    '⭐ <b>New review to approve</b>',
    '',
    `${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}  (${rating}/5)`,
    `<b>From:</b> ${esc(String(r.name).slice(0, 40))}`,
    `<b>Product:</b> ${esc(String(r.product || '').slice(0, 60))}`,
    '',
    `“${esc(String(r.text).slice(0, 500))}”`,
    '',
    '<i>To show it on the site, add it to reviews in src/data.js.</i>',
  ].join('\n');
  return sendTelegram(text, env);
}

export default vercel(handle);
