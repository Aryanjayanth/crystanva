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

// Send a message to your own chat (orders, reviews).
export async function sendTelegram(text, env, extra = {}) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return { ok: false, status: 500, error: 'Telegram is not configured yet.', unconfigured: true };
  const r = await tg('sendMessage', { chat_id: env.TELEGRAM_CHAT_ID, text, parse_mode: 'HTML', disable_web_page_preview: true, ...extra }, env);
  return r.ok ? { ok: true, status: 200 } : { ok: false, status: 502, error: 'Telegram rejected the message.' };
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
