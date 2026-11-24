// POST /api/order — forwards a new order to your Telegram.
import { esc, sendTelegram, vercel } from './_telegram.js';

export async function handle(order, env) {
  if (!order?.name || !order?.phone) return { ok: false, status: 400, error: 'Name and phone are required.' };
  const lines = [
    '🔮 <b>New Crystanva order</b>',
    '',
    `<b>Item:</b> ${esc(order.category)}`,
    ...(order.details || []).map((d) => `<b>${esc(d.label)}:</b> ${esc(d.value)}`),
    `<b>Quantity:</b> ${esc(order.quantity)}`,
    `<b>Total:</b> ₹${esc(order.total)}`,
    '',
    `<b>Name:</b> ${esc(order.name)}`,
    `<b>Phone:</b> ${esc(order.phone)}`,
    order.address ? `<b>Address:</b> ${esc(order.address)}` : null,
    order.notes ? `<b>Notes:</b> ${esc(order.notes)}` : null,
  ].filter((l) => l !== null);
  return sendTelegram(lines.join('\n'), env);
}

export default vercel(handle);
