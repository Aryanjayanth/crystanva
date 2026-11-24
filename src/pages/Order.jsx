import { useState } from 'react';
import Resin from '../components/Resin.jsx';
import { describe, priceOf } from '../data';

export default function Order({ item, name, setName, back, onSent }) {
  const [form, setForm] = useState({ phone: '', address: '', notes: '' });
  const [qty, setQty] = useState(1);
  const [status, setStatus] = useState('idle'); // idle | sending | error
  const [errors, setErrors] = useState({});
  const { title, details } = describe(item);
  const total = priceOf(item) * qty;

  const validate = () => {
    const e = {};
    if (name.trim().length < 2) e.name = 'Please tell us your name.';
    if (!/^[6-9]\d{9}$/.test(form.phone.replace(/\D/g, '').slice(-10)) || form.phone.replace(/\D/g, '').length < 10) e.phone = 'Enter a valid 10-digit mobile number.';
    if (form.address.trim().length < 3) e.address = 'Please add your address or "I\'ll pick it up".';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setStatus('sending');
    try {
      const res = await fetch('/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: title, details, quantity: qty, total, name: name.trim(), phone: form.phone.trim(), address: form.address.trim(), notes: form.notes.trim() }),
      });
      if (!res.ok) throw new Error();
      onSent({ name: name.trim(), phone: form.phone.trim(), item, qty, total });
    } catch {
      setStatus('error');
    }
  };

  const field = (key, label, props = {}) => (
    <label className={`field ${errors[key] ? 'bad' : ''}`}>
      <span>{label}</span>
      {props.textarea
        ? <textarea rows={3} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} placeholder={props.placeholder} />
        : <input value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} {...props} />}
      {errors[key] && <small>{errors[key]}</small>}
    </label>
  );

  return (
    <section className="order">
      <button className="back" onClick={back}>← Edit design</button>
      <div className="order-grid">
        <aside className="summary">
          <div className="summary-art"><Resin kind={item.kind} value={item.value} color={item.color} glitter={item.glitter} placement={item.placement} back={item.back} still interactive={false} /></div>
          <h3>{title}</h3>
          <ul>{details.map((d) => <li key={d.label}><span>{d.label}</span><b>{d.value}</b></li>)}</ul>
          <div className="qty">
            <span>Quantity</span>
            <div>
              <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Less">−</button>
              <b>{qty}</b>
              <button type="button" onClick={() => setQty((q) => Math.min(20, q + 1))} aria-label="More">+</button>
            </div>
          </div>
          <div className="total"><span>Total</span><b>₹{total}</b></div>
        </aside>

        <form className="order-form" onSubmit={submit} noValidate>
          <span className="eyebrow">Almost there</span>
          <h1>Where should we reach you?</h1>
          <p className="muted">Delivery charges are added at the time of payment. We'll message you to confirm your piece before we start pouring.</p>
          <p className="req-note"><b className="star">*</b> Required</p>

          <label className={`field ${errors.name ? 'bad' : ''}`}>
            <span>Your name <b className="star">*</b></span>
            <input value={name} onChange={(e) => setName(e.target.value.slice(0, 40))} placeholder="e.g. Jaya" autoComplete="name" />
            {errors.name && <small>{errors.name}</small>}
          </label>
          {field('phone', <>Phone number <b className="star">*</b></>, { type: 'tel', inputMode: 'numeric', placeholder: '10-digit mobile number', autoComplete: 'tel' })}
          {field('address', <>Delivery address or pickup spot <b className="star">*</b></>, { placeholder: 'Area, city — or "I’ll pick it up"' })}
          {field('notes', 'Anything else? (optional)', { textarea: true, placeholder: 'Gift wrap, a second letter, a different idea…' })}

          {status === 'error' && <p className="form-error">Couldn't send your request. Please check your connection and try again.</p>}
          <button className="btn primary wide" disabled={status === 'sending'}>
            {status === 'sending' ? 'Sending…' : `Send my request · ₹${total}`}
          </button>
        </form>
      </div>
    </section>
  );
}
