// Finds your Telegram chat ID and sends a test message.
// Usage: put TELEGRAM_BOT_TOKEN in .env, send any message to your bot in Telegram, then run:
//   npm run telegram
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const envPath = new URL('../.env', import.meta.url);
if (!existsSync(envPath)) {
  console.log('No .env file yet. Copy .env.example to .env and paste your bot token into TELEGRAM_BOT_TOKEN.');
  process.exit(1);
}
let env = readFileSync(envPath, 'utf8');
const get = (k) => (env.match(new RegExp(`^${k}=(.*)$`, 'm')) || [])[1]?.trim();
const token = get('TELEGRAM_BOT_TOKEN');
if (!token) { console.log('TELEGRAM_BOT_TOKEN is empty in .env. Paste the token from @BotFather first.'); process.exit(1); }

const api = (m, body) => fetch(`https://api.telegram.org/bot${token}/${m}`, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : undefined).then((r) => r.json());

const me = await api('getMe');
if (!me.ok) { console.log('That token was rejected by Telegram. Double-check it in .env.'); process.exit(1); }
console.log(`Bot found: @${me.result.username}`);

let chatId = get('TELEGRAM_CHAT_ID');
if (!chatId) {
  const up = await api('getUpdates');
  const chat = [...(up.result || [])].reverse().map((u) => u.message?.chat || u.my_chat_member?.chat).find(Boolean);
  if (!chat) { console.log(`No messages yet. Open Telegram, send "hi" to @${me.result.username}, then run this again.`); process.exit(1); }
  chatId = String(chat.id);
  env = /^TELEGRAM_CHAT_ID=.*$/m.test(env) ? env.replace(/^TELEGRAM_CHAT_ID=.*$/m, `TELEGRAM_CHAT_ID=${chatId}`) : `${env.trimEnd()}\nTELEGRAM_CHAT_ID=${chatId}\n`;
  writeFileSync(envPath, env);
  console.log(`Chat ID ${chatId} (${chat.first_name || chat.title || ''}) saved to .env`);
}

const sent = await api('sendMessage', { chat_id: chatId, text: '✅ Crystanva is connected! New orders and reviews will arrive here.' });
console.log(sent.ok ? 'Test message sent. Check Telegram! Restart "npm run dev" to start receiving orders.' : `Could not send test message: ${sent.description}`);
