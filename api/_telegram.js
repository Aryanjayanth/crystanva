// Shared helpers for the serverless functions. (Files starting with "_" are not public routes on Vercel.)
export const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Call any Telegram Bot API method.
export async function tg(method, payload, env) {
  const token = env.TELEGRAM_BOT_TOKEN;
  if (!token) return { ok: false, unconfigured: true };
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json().catch(() => ({ ok: false }));
}

// Everyone who receives orders: TELEGRAM_CHAT_ID can hold one id, several ids separated by commas, or a group id.
export const chatIds = (env) => String(env.TELEGRAM_CHAT_ID || '').split(/[\s,]+/).filter(Boolean);
const NOT_READY = { ok: false, status: 500, error: 'Telegram is not configured yet.', unconfigured: true };
const ready = (env) => env.TELEGRAM_BOT_TOKEN && chatIds(env).length;

// Send a photo (raw bytes) to every chat, with an HTML caption and optional buttons.
export async function sendTelegramPhoto(bytes, type, caption, env, extra = {}) {
  if (!ready(env)) return NOT_READY;
  const results = await Promise.all(chatIds(env).map(async (chat) => {
    const form = new FormData();
    form.append('chat_id', chat);
    form.append('photo', new Blob([bytes], { type }), 'review.jpg');
    form.append('caption', caption);
    form.append('parse_mode', 'HTML');
    for (const [k, v] of Object.entries(extra)) form.append(k, typeof v === 'string' ? v : JSON.stringify(v));
    const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendPhoto`, { method: 'POST', body: form });
    return (await res.json().catch(() => ({ ok: false }))).ok;
  }));
  return results.some(Boolean) ? { ok: true, status: 200 } : { ok: false, status: 502, error: 'Telegram rejected the photo.' };
}

// Send a file (e.g. the Excel sheet) to one chat.
export async function sendTelegramFile(chat, bytes, filename, type, caption, env) {
  const form = new FormData();
  form.append('chat_id', String(chat));
  form.append('document', new Blob([bytes], { type }), filename);
  if (caption) form.append('caption', caption);
  const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendDocument`, { method: 'POST', body: form });
  return res.json().catch(() => ({ ok: false }));
}

// Send a message to every chat (orders, reviews).
export async function sendTelegram(text, env, extra = {}) {
  if (!ready(env)) return NOT_READY;
  const results = await Promise.all(chatIds(env).map((chat) => tg('sendMessage', { chat_id: chat, text, parse_mode: 'HTML', disable_web_page_preview: true, ...extra }, env)));
  return results.some((r) => r.ok) ? { ok: true, status: 200 } : { ok: false, status: 502, error: 'Telegram rejected the message.' };
}

// Wraps handle(body, env, headers) → { ok, status, data?, error?, headers? } as a Vercel serverless handler.
export const vercel = (handle, { methods = ['POST'] } = {}) => async (req, res) => {
  if (!methods.includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });
  let body = {};
  if (req.method === 'POST') body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  const r = await handle(body, process.env, req.headers || {});
  for (const [k, v] of Object.entries(r.headers || {})) res.setHeader(k, v);
  return res.status(r.status).json(r.ok ? (r.data ?? { ok: true }) : { error: r.error });
};
