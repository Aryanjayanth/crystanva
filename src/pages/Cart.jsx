import ItemImage from '../components/ItemImage.jsx';
import { describe, priceOf } from '../data';

const brief = (item) => describe(item).details.filter((d) => /Colour|Glitter:/.test(d.label)).map((d) => d.value).join(' · ');
const day = (iso) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export default function Cart({ cart, setCart, history, reorder, edit, addMore, checkout }) {
  const total = cart.reduce((s, l) => s + priceOf(l.item) * l.qty, 0);
  const count = cart.reduce((s, l) => s + l.qty, 0);
  const setQty = (id, qty) => setCart((c) => c.map((l) => (l.id === id ? { ...l, qty: Math.max(1, Math.min(20, qty)) } : l)));
  const remove = (id) => setCart((c) => c.filter((l) => l.id !== id));

  const previous = history.length > 0 && (
    <div className="prev-orders">
      <h2>Your previous orders</h2>
      {history.map((o) => (
        <article className="prev-order" key={`${o.no}-${o.date}`}>
          <div className="prev-head">
            <b>{o.no ? `Order #${o.no}` : 'Order'}</b>
            <span>{day(o.date)}</span>
            <strong>₹{o.total}</strong>
          </div>
          <ul>
            {o.lines.map((l, i) => (
              <li key={i}>
                <span className="prev-art"><ItemImage kind={l.item.kind} value={l.item.value} color={l.item.color} glitter={l.item.glitter} placement={l.item.placement} back={l.item.back} /></span>
                <span><b>{describe(l.item).title}</b> × {l.qty}<small>{brief(l.item)}</small></span>
              </li>
            ))}
          </ul>
          <button className="btn ghost" onClick={() => reorder(o)}>Order again</button>
        </article>
      ))}
    </div>
  );

  if (!cart.length) {
    return (
      <section className="cart">
        <div className="cart-empty">
          <h1>Your cart is empty</h1>
          <p className="muted">Design a keychain or pen and add it here.</p>
          <button className="btn primary" onClick={addMore}>Browse collections</button>
        </div>
        {previous}
      </section>
    );
  }
  return (
    <section className="cart">
      <span className="eyebrow">Your cart</span>
      <h1>{count} {count === 1 ? 'piece' : 'pieces'} ready to pour</h1>
      <div className="cart-lines">
        {cart.map((l) => {
          const { title } = describe(l.item);
          return (
            <article className="cart-line" key={l.id}>
              <div className="cart-art"><ItemImage kind={l.item.kind} value={l.item.value} color={l.item.color} glitter={l.item.glitter} placement={l.item.placement} back={l.item.back} /></div>
              <div className="cart-info">
                <h3>{title}</h3>
                <p>{brief(l.item)}</p>
                <div className="qty"><div>
                  <button type="button" onClick={() => setQty(l.id, l.qty - 1)} aria-label="Less">−</button>
                  <b>{l.qty}</b>
                  <button type="button" onClick={() => setQty(l.id, l.qty + 1)} aria-label="More">+</button>
                </div></div>
              </div>
              <div className="cart-side">
                <b>₹{priceOf(l.item) * l.qty}</b>
                <span className="cart-links">
                  <button type="button" className="link-btn" onClick={() => edit(l)}>Edit</button>
                  <button type="button" className="link-btn" onClick={() => remove(l.id)}>Remove</button>
                </span>
              </div>
            </article>
          );
        })}
      </div>
      <div className="cart-foot">
        <div><small>Total</small><strong>₹{total}</strong></div>
        <div className="cart-actions">
          <button className="btn ghost" onClick={addMore}>Add more</button>
          <button className="btn primary" onClick={checkout}>Checkout <span aria-hidden>→</span></button>
        </div>
      </div>
      <p className="muted small">Delivery charges are added at the time of payment.</p>
      {previous}
    </section>
  );
}
