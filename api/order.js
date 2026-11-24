// POST /api/order — forwards a new order to your Telegram and logs it for the Excel sheet.
import { esc, sendTelegram, vercel } from './_telegram.js';
import { storeReady, updateOrders } from './_store.js';

export async function handle(order, env) {
  if (!order?.name || !order?.phone) return { ok: false, status: 400, error: 'Name and phone are required.' };
  // one or several pieces (cart); the old single-item shape still works
  const items = (Array.isArray(order.items) && order.items.length ? order.items : [{ category: order.category, details: order.details, quantity: order.quantity, total: order.total }]).slice(0, 30);
  const total = items.reduce((s, i) => s + (Number(i.total) || 0), 0);
  const qty = items.reduce((s, i) => s + (Number(i.quantity) || 1), 0);

  // number the order and log it (this is what the Excel sheet is made from)
  let no = null;
  let logErr = '';
  if (storeReady(env)) {
    try {
      await updateOrders(env, (list) => {
        no = list.reduce((m, o) => Math.max(m, o.no || 0), 0) + 1;
        return [...list, {
          no, date: new Date().toISOString(), name: String(order.name).slice(0, 120), phone: String(order.phone).slice(0, 40),
          item: items.map((i) => `${i.category} x${Number(i.quantity) || 1}`).join(', ').slice(0, 300), qty, total, txn: '',
          details: items.map((i) => (i.details || []).map((d) => `${d.label}: ${d.value}`).join('; ')).join(' | ').slice(0, 1500),
          address: String(order.address || '').slice(0, 400), notes: String(order.notes || '').slice(0, 400),
        }];
      });
    } catch (e) { no = null; logErr = `${e.name}: ${String(e.message).slice(0, 120)}`; console.error('order log failed', e); } // never lose an order because the log was busy
  }

  const block = (i, n) => [
    items.length > 1 ? `<b>— Item ${n + 1}: ${esc(i.category)}</b>` : `<b>Item:</b> ${esc(i.category)}`,
    ...(i.details || []).map((d) => `<b>${esc(d.label)}:</b> ${esc(d.value)}`),
    `<b>Quantity:</b> ${esc(i.quantity)}${items.length > 1 ? ` · ₹${esc(i.total)}` : ''}`,
  ].join('\n');
  const note = no
    ? `\n<i>After payment send /paid ${no} · when it is ready send /made ${no} · /sheet gives the Excel file.</i>`
    : storeReady(env) ? `\n<i>⚠️ Could not add this order to the sheet — please note it down. ${esc(logErr)}</i>` : null;
  const lines = [
    `🔮 <b>New Crystanva order${no ? ` #${no}` : ''}</b>`,
    '',
    items.map(block).join('\n\n'),
    `<b>Total:</b> ₹${esc(total)}`,
    '',
    `<b>Name:</b> ${esc(order.name)}`,
    `<b>Phone:</b> ${esc(order.phone)}`,
    order.address ? `<b>Address:</b> ${esc(order.address)}` : null,
    order.notes ? `<b>Notes:</b> ${esc(order.notes)}` : null,
    note,
  ].filter((l) => l !== null);
  const sent = await sendTelegram(lines.join('\n'), env);
  return sent.ok ? { ...sent, data: { ok: true, no } } : sent;
}

export default vercel(handle);
