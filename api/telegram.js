// POST /api/telegram — Telegram calls this when you tap a button under a review.
// ✅ Approve → review goes live on the site · ❌ Reject → ignored · 🗑 Remove → taken off the site.
import { chatIds, sendTelegramFile, tg, vercel } from './_telegram.js';
import { storeReady, savePhoto, deletePhoto, updateApproved, updateOrders, readOrders } from './_store.js';
import { xlsx } from './_xlsx.js';

// works for text reviews (entities) and photo reviews (caption_entities)
function unpack(message) {
  const link = (message?.entities || message?.caption_entities || []).find((e) => e.type === 'text_link' && e.url?.includes('/review#'));
  if (!link) return null;
  try { return JSON.parse(Buffer.from(link.url.split('#')[1], 'base64url').toString('utf8')); } catch { return null; }
}

// Excel sheet of every order: Order No, Name, Phone, Item, Price, Transaction ID (+ date, qty, details)
const when = (iso) => new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
async function sendSheet(chat, env) {
  const orders = await readOrders(env);
  if (!orders.length) return tg('sendMessage', { chat_id: chat, text: 'No orders yet — the sheet will appear after the first one.' }, env);
  const rows = [['Order No', 'Name', 'Phone', 'Item', 'Price (₹)', 'Transaction ID', 'Date', 'Qty', 'Details', 'Address', 'Notes'],
    ...orders.map((o) => [o.no, o.name, o.phone, o.item, o.total, o.txn || '', when(o.date), o.qty, o.details || '', o.address || '', o.notes || ''])];
  const bytes = xlsx(rows, [10, 22, 15, 24, 11, 22, 20, 6, 60, 36, 30]);
  const missing = orders.filter((o) => !o.txn).length;
  const day = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  return sendTelegramFile(chat, bytes, `crystanva-orders-${day}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    `${orders.length} order${orders.length > 1 ? 's' : ''}${missing ? ` · ${missing} without a transaction ID yet` : ''}`, env);
}

const HELP = 'Crystanva orders\n\n/sheet — get the Excel sheet of all orders\n/paid 12 UTR123456 — save the transaction ID for order #12\nOr just reply to an order message with the transaction ID.';

// Commands and replies typed in the shop chats (you and your friends).
async function handleMessage(m, env) {
  const chat = String(m.chat?.id);
  if (!m.text) return { ok: true, status: 200 };
  if (!chatIds(env).includes(chat)) {
    // a friend (or a group) that is not on the list yet: tell them their chat ID so it can be added
    if (m.text.trim().toLowerCase().split(/[\s@]/)[0].match(/^\/(start|id)$/)) {
      await tg('sendMessage', { chat_id: chat, text: `This chat's ID is ${chat}\nSend it to the Crystanva owner to get orders here.` }, env);
    }
    return { ok: true, status: 200 };
  }
  const say = (text) => tg('sendMessage', { chat_id: chat, text, reply_to_message_id: m.message_id, allow_sending_without_reply: true }, env);
  const text = m.text.trim();
  const cmd = text.match(/^\/(\w+)(?:@\w+)?\s*([\s\S]*)$/);

  if (cmd && ['sheet', 'orders', 'excel'].includes(cmd[1].toLowerCase())) {
    if (!storeReady(env)) await say('Order storage is not connected yet.');
    else await sendSheet(chat, env);
    return { ok: true, status: 200 };
  }
  if (cmd && ['start', 'help'].includes(cmd[1].toLowerCase())) { await say(HELP); return { ok: true, status: 200 }; }

  // transaction ID: "/paid 12 TXN" or a reply to an order message
  let no = null; let txn = '';
  if (cmd && cmd[1].toLowerCase() === 'paid') {
    const p = cmd[2].match(/^#?(\d+)\s+(\S[\s\S]*)$/);
    if (!p) { await say('Use it like: /paid 12 UTR123456'); return { ok: true, status: 200 }; }
    no = Number(p[1]); txn = p[2].trim();
  } else if (!cmd && m.reply_to_message?.text?.includes('New Crystanva order')) {
    no = Number((m.reply_to_message.text.match(/order #(\d+)/) || [])[1]);
    txn = text;
  }
  if (!no || !txn) return { ok: true, status: 200 };
  if (!storeReady(env)) { await say('Order storage is not connected yet.'); return { ok: true, status: 200 }; }
  txn = txn.slice(0, 80);
  let found = false;
  try {
    await updateOrders(env, (list) => list.map((o) => { if (o.no === no) { found = true; return { ...o, txn }; } return o; }));
  } catch { await say('Busy for a moment — please send it again.'); return { ok: true, status: 200 }; }
  await say(found ? `✅ Order #${no} · transaction ID saved: ${txn}` : `Order #${no} was not found.`);
  return { ok: true, status: 200 };
}

export async function handle(update, env, headers) {
  // only Telegram knows this secret (set when the webhook is registered)
  if (!env.TELEGRAM_WEBHOOK_SECRET || headers['x-telegram-bot-api-secret-token'] !== env.TELEGRAM_WEBHOOK_SECRET) {
    return { ok: false, status: 401, error: 'Unauthorized' };
  }
  if (update?.message) return handleMessage(update.message, env);
  const q = update?.callback_query;
  if (!q) return { ok: true, status: 200 };
  const msg = q.message;
  // only the shop's chats (you and your friends) can approve
  if (!chatIds(env).includes(String(msg?.chat?.id))) {
    await tg('answerCallbackQuery', { callback_query_id: q.id, text: 'Not allowed' }, env);
    return { ok: true, status: 200 };
  }

  const isPhoto = Array.isArray(msg?.photo) && msg.photo.length > 0;
  const done = async (toast, status, buttons = []) => {
    await tg('answerCallbackQuery', { callback_query_id: q.id, text: toast }, env);
    const base = (isPhoto ? msg.caption : msg.text).split('\n\n— ')[0];
    const markup = { inline_keyboard: buttons.length ? [buttons] : [] };
    // keep the hidden review data (entities) so the buttons keep working
    if (isPhoto) {
      await tg('editMessageCaption', { chat_id: msg.chat.id, message_id: msg.message_id, caption: `${base}\n\n— ${status}`, caption_entities: msg.caption_entities, reply_markup: markup }, env);
    } else {
      await tg('editMessageText', { chat_id: msg.chat.id, message_id: msg.message_id, text: `${base}\n\n— ${status}`, entities: msg.entities, disable_web_page_preview: true, reply_markup: markup }, env);
    }
  };

  // copy the photo from Telegram into the review storage (only happens on approve)
  const copyPhoto = async (review) => {
    const biggest = msg.photo[msg.photo.length - 1];
    const f = await tg('getFile', { file_id: biggest.file_id }, env);
    if (!f.ok) return null;
    const img = await fetch(`https://api.telegram.org/file/bot${env.TELEGRAM_BOT_TOKEN}/${f.result.file_path}`);
    if (!img.ok) return null;
    return savePhoto(review.id, Buffer.from(await img.arrayBuffer()), env);
  };

  if (!storeReady(env)) {
    await tg('answerCallbackQuery', { callback_query_id: q.id, text: 'Review storage is not connected yet', show_alert: true }, env);
    return { ok: true, status: 200 };
  }

  const review = unpack(msg);
  if (!review) {
    await tg('answerCallbackQuery', { callback_query_id: q.id, text: 'Could not read this review' }, env);
    return { ok: true, status: 200 };
  }

  try {
    if (q.data === 'approve') {
      if (isPhoto) review.photo = await copyPhoto(review);
      await updateApproved(env, (list) => (list.some((r) => r.id === review.id) ? list : [review, ...list].slice(0, 200)));
      await done('Published on the site ✨', '✅ Approved — live on the site within a minute', [{ text: '🗑 Remove from site', callback_data: 'remove' }]);
      return { ok: true, status: 200 };
    }
    if (q.data === 'remove') {
      let photo = null;
      await updateApproved(env, (list) => {
        photo = list.find((r) => r.id === review.id)?.photo || photo;
        return list.filter((r) => r.id !== review.id);
      });
      await deletePhoto(photo, env);
      await done('Removed from the site', '🗑 Removed from the site', [{ text: '✅ Approve again', callback_data: 'approve' }]);
      return { ok: true, status: 200 };
    }
  } catch (e) {
    await tg('answerCallbackQuery', { callback_query_id: q.id, text: 'Busy for a moment, please tap again', show_alert: true }, env);
    return { ok: true, status: 200 };
  }
  if (q.data === 'reject') {
    await done('Rejected', '❌ Rejected — not shown on the site', [{ text: '✅ Approve anyway', callback_data: 'approve' }]);
  }
  return { ok: true, status: 200 };
}

export default vercel(handle);
