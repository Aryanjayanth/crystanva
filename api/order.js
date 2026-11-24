// POST /api/order — forwards a new order to your Telegram.
import { esc, sendTelegram, vercel } from './_telegram.js';
import { storeReady, updateOrders } from './_store.js';

export async function handle(order, env) {
  if (!order?.name || !order?.phone) return { ok: false, status: 400, error: 'Name and phone are required.' };
  // number the order and log it (this is what the Excel sheet is made from)
  let no = null;
  if (storeReady(env)) {
    try {
      await updateOrders(env, (list) => {
        no = list.reduce((m, o) => Math.max(m, o.no || 0), 0) + 1;
        return [...list, {
          no, date: new Date().toISOString(), name: String(order.name).slice(0, 120), phone: String(order.phone).slice(0, 40),
          item: String(order.category || '').slice(0, 80), qty: Number(order.quantity) || 1, total: Number(order.total) || 0, txn: '',
          details: (order.details || []).map((d) => `${d.label}: ${d.value}`).join('; ').slice(0, 600),
          address: String(order.address || '').slice(0, 400), notes: String(order.notes || '').slice(0, 400),
        }];
      });
    } catch { no = null; } // never lose an order because the log was busy
  }
  const lines = [
    `🔮 <b>New Crystanva order${no ? ` #${no}` : ''}</b>`,
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
    no ? '\n<i>↩️ Reply to this message with the transaction ID to log it. Send /sheet for the Excel file.</i>' : null,
  ].filter((l) => l !== null);
  return sendTelegram(lines.join('\n'), env);
}

export default vercel(handle);
