// POST /api/review — a customer posts a review. It goes to your Telegram with
// ✅ Approve / ❌ Reject buttons; approving publishes it on the site (see api/telegram.js).
import { randomBytes } from 'node:crypto';
import { esc, sendTelegram, vercel } from './_telegram.js';

const CATEGORY_IDS = ['personal', 'shapes', 'pens', 'plates'];

export async function handle(r, env) {
  const rating = Math.max(1, Math.min(5, Math.round(Number(r?.rating) || 0)));
  const name = String(r?.name || '').trim().slice(0, 40);
  const text = String(r?.text || '').trim().slice(0, 400);
  if (name.length < 2 || text.length < 10) return { ok: false, status: 400, error: 'Name and a short review are required.' };

  const review = {
    id: randomBytes(6).toString('hex'),
    name,
    rating,
    category: CATEGORY_IDS.includes(r?.category) ? r.category : 'personal',
    product: String(r?.product || '').slice(0, 60),
    text,
    at: Date.now(),
  };
  // the review travels inside the message (hidden in the ⭐ link), so nothing is stored until you approve it
  const packed = Buffer.from(JSON.stringify(review)).toString('base64url');
  const msg = [
    `<a href="https://crystanva.vercel.app/review#${packed}">⭐</a> <b>New review</b>`,
    '',
    `${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}  (${rating}/5)`,
    `<b>From:</b> ${esc(name)}`,
    `<b>Product:</b> ${esc(review.product)}`,
    '',
    `“${esc(text)}”`,
  ].join('\n');

  return sendTelegram(msg, env, {
    reply_markup: { inline_keyboard: [[{ text: '✅ Approve', callback_data: 'approve' }, { text: '❌ Reject', callback_data: 'reject' }]] },
  });
}

export default vercel(handle);
