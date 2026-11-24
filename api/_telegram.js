// Shared helper: sends a message to your Telegram chat. (Files starting with "_" are not public routes on Vercel.)
export const esc = (s = '') => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

export async function sendTelegram(text, env) {
  const token = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return { ok: false, status: 500, error: 'Telegram is not configured yet.', unconfigured: true };
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  });
  if (!res.ok) return { ok: false, status: 502, error: 'Telegram rejected the message.' };
  return { ok: true, status: 200 };
}

// Wraps a handle(body, env) function as a Vercel serverless handler.
export const vercel = (handle) => async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  const r = await handle(body, process.env);
  return res.status(r.status).json(r.ok ? { ok: true } : { error: r.error });
};
