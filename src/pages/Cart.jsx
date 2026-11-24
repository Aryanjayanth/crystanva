import ItemImage from '../components/ItemImage.jsx';
import { describe, priceOf } from '../data';

export default function Cart({ cart, setCart, addMore, checkout }) {
  const total = cart.reduce((s, l) => s + priceOf(l.item) * l.qty, 0);
  const count = cart.reduce((s, l) => s + l.qty, 0);
  const setQty = (id, qty) => setCart((c) => c.map((l) => (l.id === id ? { ...l, qty: Math.max(1, Math.min(20, qty)) } : l)));
  const remove = (id) => setCart((c) => c.filter((l) => l.id !== id));

  if (!cart.length) {
    return (
      <section className="cart cart-empty">
        <h1>Your cart is empty</h1>
        <p className="muted">Design a keychain or pen and add it here.</p>
        <button className="btn primary" onClick={addMore}>Browse collections</button>
      </section>
    );
  }
  return (
    <section className="cart">
      <span className="eyebrow">Your cart</span>
      <h1>{count} {count === 1 ? 'piece' : 'pieces'} ready to pour</h1>
      <div className="cart-lines">
        {cart.map((l) => {
          const { title, details } = describe(l.item);
          return (
            <article className="cart-line" key={l.id}>
              <div className="cart-art"><ItemImage kind={l.item.kind} value={l.item.value} color={l.item.color} glitter={l.item.glitter} placement={l.item.placement} back={l.item.back} /></div>
              <div className="cart-info">
                <h3>{title}</h3>
                <p>{details.filter((d) => /Colour|Glitter:/.test(d.label)).map((d) => d.value).join(' · ')}</p>
                <div className="qty"><div>
                  <button type="button" onClick={() => setQty(l.id, l.qty - 1)} aria-label="Less">−</button>
                  <b>{l.qty}</b>
                  <button type="button" onClick={() => setQty(l.id, l.qty + 1)} aria-label="More">+</button>
                </div></div>
              </div>
              <div className="cart-side">
                <b>₹{priceOf(l.item) * l.qty}</b>
                <button type="button" className="link-btn" onClick={() => remove(l.id)}>Remove</button>
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
    </section>
  );
}
