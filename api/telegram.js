// POST /api/telegram — Telegram calls this when you tap a button under a review.
// ✅ Approve → review goes live on the site · ❌ Reject → ignored · 🗑 Remove → taken off the site.
import { tg, vercel } from './_telegram.js';
import { readApproved, writeApproved, storeReady, savePhoto, deletePhoto } from './_store.js';

// works for text reviews (entities) and photo reviews (caption_entities)
function unpack(message) {
  const link = (message?.entities || message?.caption_entities || []).find((e) => e.type === 'text_link' && e.url?.includes('/review#'));
  if (!link) return null;
  try { return JSON.parse(Buffer.from(link.url.split('#')[1], 'base64url').toString('utf8')); } catch { return null; }
}

export async function handle(update, env, headers) {
  // only Telegram knows this secret (set when the webhook is registered)
  if (!env.TELEGRAM_WEBHOOK_SECRET || headers['x-telegram-bot-api-secret-token'] !== env.TELEGRAM_WEBHOOK_SECRET) {
    return { ok: false, status: 401, error: 'Unauthorized' };
  }
  const q = update?.callback_query;
  if (!q) return { ok: true, status: 200 };
  const msg = q.message;
  // only you (the shop's chat) can approve
  if (String(msg?.chat?.id) !== String(env.TELEGRAM_CHAT_ID)) {
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

  if (q.data === 'approve') {
    const list = await readApproved(env, true);
    if (!list.some((r) => r.id === review.id)) {
      if (isPhoto) review.photo = await copyPhoto(review);
      await writeApproved([review, ...list].slice(0, 200), env);
    }
    await done('Published on the site ✨', '✅ Approved — live on the site within a minute', [{ text: '🗑 Remove from site', callback_data: 'remove' }]);
  } else if (q.data === 'remove') {
    const list = await readApproved(env, true);
    await deletePhoto(list.find((r) => r.id === review.id)?.photo, env);
    await writeApproved(list.filter((r) => r.id !== review.id), env);
    await done('Removed from the site', '🗑 Removed from the site', [{ text: '✅ Approve again', callback_data: 'approve' }]);
  } else if (q.data === 'reject') {
    await done('Rejected', '❌ Rejected — not shown on the site', [{ text: '✅ Approve anyway', callback_data: 'approve' }]);
  }
  return { ok: true, status: 200 };
}

export default vercel(handle);
