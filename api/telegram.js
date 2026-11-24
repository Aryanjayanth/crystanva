// POST /api/telegram — Telegram calls this when you tap a button under a review.
// ✅ Approve → review goes live on the site · ❌ Reject → ignored · 🗑 Remove → taken off the site.
import { chatIds, sendTelegramFile, tg, vercel } from './_telegram.js';
import { storeReady, savePhoto, deletePhoto, updateApproved, patchOrder, readOrders, addOrder, resetOrders } from './_store.js';
import { xlsx } from './_xlsx.js';

// works for text reviews (entities) and photo reviews (caption_entities)
function unpack(message) {
  const link = (message?.entities || message?.caption_entities || []).find((e) => e.type === 'text_link' && e.url?.includes('/review#'));
  if (!link) return null;
  try { return JSON.parse(Buffer.from(link.url.split('#')[1], 'base64url').toString('utf8')); } catch { return null; }
}

// Excel sheet of every order: Order No, Name, Phone, Item, Price, Paid, Made, Transaction ID (+ date, qty, details)
const when = (iso) => new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const yn = (v) => (v ? 'Yes' : 'No');
async function sendSheet(chat, env) {
  const orders = await readOrders(env);
  if (!orders.length) return tg('sendMessage', { chat_id: chat, text: 'No orders yet — the sheet will appear after the first one.' }, env);
  const rows = [['Order No', 'Name', 'Phone', 'Item', 'Price (₹)', 'Paid', 'Made', 'Transaction ID', 'Date', 'Qty', 'Details', 'Address', 'Notes'],
    ...orders.map((o) => [o.no, o.name, o.phone, o.item, o.total, yn(o.paid || o.txn), yn(o.made), o.txn || '', when(o.date), o.qty, o.details || '', o.address || '', o.notes || ''])];
  const bytes = xlsx(rows, [10, 22, 15, 28, 11, 7, 7, 20, 20, 6, 60, 36, 30]);
  const unpaid = orders.filter((o) => !(o.paid || o.txn)).length;
  const todo = orders.filter((o) => !o.made).length;
  const day = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  return sendTelegramFile(chat, bytes, `crystanva-orders-${day}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    `${orders.length} order${orders.length > 1 ? 's' : ''} · ${unpaid} unpaid · ${todo} not made yet`, env);
}

const HELP = ['Crystanva orders', '',
  '/sheet — Excel sheet of all orders',
  '/paid 12 — mark order #12 as paid (add a transaction ID after it if you want: /paid 12 UTR123)',
  '/made 12 — mark order #12 as made',
  '/unpaid 12 and /unmade 12 — undo',
  'You can also reply to an order message with the transaction ID.'].join(String.fromCharCode(10));

// what each command changes on an order
const ACTIONS = {
  paid: (o, rest) => ({ ...o, paid: true, ...(rest ? { txn: rest.slice(0, 80) } : {}) }),
  unpaid: (o) => ({ ...o, paid: false, txn: '' }),
  made: (o) => ({ ...o, made: true }),
  unmade: (o) => ({ ...o, made: false }),
};
const DONE = { paid: 'marked as paid', unpaid: 'marked as not paid', made: 'marked as made', unmade: 'marked as not made' };

// Commands and replies typed in the shop chats (you and your friends).
async function handleMessage(m, env) {
  const chat = String(m.chat?.id);
  if (!m.text) return { ok: true, status: 200 };
  if (!chatIds(env).includes(chat)) {
    // a friend (or a group) that is not on the list yet: tell them their chat ID so it can be added
    if (m.text.trim().toLowerCase().split(/[\s@]/)[0].match(/^\/(start|id)$/)) {
      await tg('sendMessage', { chat_id: chat, text: `This chat's ID is ${chat}${String.fromCharCode(10)}Send it to the Crystanva owner to get orders here.` }, env);
    }
    return { ok: true, status: 200 };
  }
  const say = (text) => tg('sendMessage', { chat_id: chat, text, reply_to_message_id: m.message_id, allow_sending_without_reply: true }, env);
  const text = m.text.trim();
  const cmd = text.match(/^\/(\w+)(?:@\w+)?\s*([\s\S]*)$/);
  const name = cmd ? cmd[1].toLowerCase() : '';

  if (['sheet', 'orders', 'excel'].includes(name)) {
    if (!storeReady(env)) await say('Order storage is not connected yet.');
    else { try { await sendSheet(chat, env); } catch (e) { await say(`Could not make the sheet: ${e.name} ${String(e.message).slice(0, 200)}`); } }
    return { ok: true, status: 200 };
  }
  if (name === 'reset') {
    // wipes the whole order list and restarts numbering at #1 — owner's chat only, needs a confirmation word
    if (chat !== chatIds(env)[0]) await say('Only the shop owner can reset the orders.');
    else if (cmd[2].trim().toLowerCase() !== 'confirm') await say('This deletes ALL orders from the sheet and restarts numbering at #1. It cannot be undone. Send /reset confirm to do it.');
    else { try { const n = await resetOrders(env); await say(`🧹 Order list cleared (${n} orders removed). The next order will be #1.`); } catch (e) { await say(`Could not reset: ${e.name} ${String(e.message).slice(0, 150)}`); } }
    return { ok: true, status: 200 };
  }
  if (['start', 'help'].includes(name)) { await say(HELP); return { ok: true, status: 200 }; }

  // an old order message (from before numbering) forwarded to the bot: add it to the sheet
  if (!cmd && text.includes('New Crystanva order') && !/order #\d+/.test(text)) {
    if (!storeReady(env)) { await say('Order storage is not connected yet.'); return { ok: true, status: 200 }; }
    const f = {}; const extra = [];
    for (const line of text.split(String.fromCharCode(10))) {
      const kv = line.replace(/^[—-]\s*/, '').match(/^([^:]{1,40}):\s*(.*)$/);
      if (!kv) continue;
      const key = kv[1].toLowerCase();
      if (['name', 'phone', 'address', 'notes', 'quantity', 'total'].includes(key)) f[key] = kv[2].trim();
      else if (key === 'item' || /^item \d+$/.test(key)) f.item = [f.item, kv[2].trim()].filter(Boolean).join(', ');
      else extra.push(`${kv[1]}: ${kv[2].trim()}`);
    }
    if (!f.name || !f.phone) { await say('I could not read that order. Forward the full order message.'); return { ok: true, status: 200 }; }
    const when0 = m.forward_date || m.forward_origin?.date || m.date;
    const date = new Date((when0 || Date.now() / 1000) * 1000).toISOString();
    try {
      const same = (await readOrders(env)).find((o) => o.phone === f.phone && o.name === f.name && o.date === date);
      if (same) { await say(`Already in the sheet as order #${same.no}.`); return { ok: true, status: 200 }; }
      const saved = await addOrder(env, (no) => ({
        no, date, name: f.name.slice(0, 120), phone: f.phone.slice(0, 40), item: (f.item || '').slice(0, 300),
        qty: Number(f.quantity) || 1, total: Number((f.total || '').replace(/[^\d.]/g, '')) || 0, txn: '', paid: false, made: false,
        details: extra.join('; ').slice(0, 1500), address: (f.address || '').slice(0, 400), notes: (f.notes || '').slice(0, 400),
      }));
      await say(`✅ Added to the sheet as order #${saved.no} (${f.name}).`);
    } catch (e) { await say(`Could not add it: ${e.name} ${String(e.message).slice(0, 150)}`); }
    return { ok: true, status: 200 };
  }

  // "/paid 12", "/paid 12 UTR123", "/made 12" — or a plain reply to an order message (saves the transaction ID)
  let action = null; let no = null; let rest = '';
  if (ACTIONS[name]) {
    const p = cmd[2].match(/^#?(\d+)\s*([\s\S]*)$/);
    if (!p) { await say(`Add the order number, like: /${name} 12`); return { ok: true, status: 200 }; }
    action = name; no = Number(p[1]); rest = p[2].trim();
  } else if (!cmd && m.reply_to_message?.text?.includes('New Crystanva order')) {
    action = 'paid'; no = Number((m.reply_to_message.text.match(/order #(\d+)/) || [])[1]); rest = text;
  }
  if (!action || !no) return { ok: true, status: 200 };
  if (!storeReady(env)) { await say('Order storage is not connected yet.'); return { ok: true, status: 200 }; }
  let found = false;
  try {
    found = await patchOrder(env, no, (o) => ACTIONS[action](o, rest));
  } catch (e) { await say(`Could not save: ${e.name} ${String(e.message).slice(0, 150)}`); return { ok: true, status: 200 }; }
  await say(found ? `✅ Order #${no} ${DONE[action]}${action === 'paid' && rest ? ` · transaction ID ${rest.slice(0, 80)}` : ''}` : `Order #${no} was not found.`);
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
