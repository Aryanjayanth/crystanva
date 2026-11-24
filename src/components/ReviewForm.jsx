import { useState } from 'react';
import { categories } from '../data';

// Shrink a phone photo before upload (fast on mobile data, small to store).
async function shrink(file, max, quality) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((ok, fail) => { const i = new Image(); i.onload = () => ok(i); i.onerror = fail; i.src = url; });
    const s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * s);
    c.height = Math.round(img.naturalHeight * s);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function ReviewForm({ defaultName, onDone, onCancel }) {
  const [name, setName] = useState(defaultName || '');
  const [product, setProduct] = useState(categories[0].id);
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [text, setText] = useState('');
  const [photo, setPhoto] = useState(null); // { full, thumb }
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const pickPhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) return setError('Please choose a photo.');
    try {
      setError('');
      const [full, thumb] = await Promise.all([shrink(file, 1280, 0.82), shrink(file, 360, 0.75)]);
      setPhoto({ full, thumb });
    } catch {
      setError("Couldn't read that photo. Try a different one.");
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (name.trim().length < 2) return setError('Please add your name.');
    if (text.trim().length < 10) return setError('Tell us a little more (at least 10 characters).');
    setError('');
    setStatus('sending');
    const cat = categories.find((c) => c.id === product);
    const review = { name: name.trim(), product: cat.title, category: cat.id, rating, text: text.trim() };
    try {
      const res = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...review, photo: photo?.full }),
      });
      if (!res.ok) throw new Error();
      onDone({ ...review, photoThumb: photo?.thumb, item: { kind: cat.kind, ...cat.sample }, pending: true, at: Date.now() });
    } catch {
      setStatus('idle');
      setError("Couldn't send your review. Please try again.");
    }
  };

  return (
    <form className="review-form" onSubmit={submit} noValidate>
      <h3>Share your experience</h3>
      <div className="rf-row">
        <label className="field">
          <span>Your name</span>
          <input value={name} onChange={(e) => setName(e.target.value.slice(0, 40))} placeholder="e.g. Jaya" />
        </label>
        <label className="field">
          <span>What did you get?</span>
          <select value={product} onChange={(e) => setProduct(e.target.value)}>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </label>
      </div>
      <div className="field">
        <span>Your rating</span>
        <div className="rate" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button type="button" key={n} className={(hover || rating) >= n ? 'lit' : ''} onMouseEnter={() => setHover(n)} onClick={() => setRating(n)} aria-label={`${n} star${n > 1 ? 's' : ''}`}>★</button>
          ))}
        </div>
      </div>
      <label className="field">
        <span>Your review</span>
        <textarea rows={3} value={text} onChange={(e) => setText(e.target.value.slice(0, 400))} placeholder="How did it turn out? How did it feel to receive it?" />
      </label>
      <div className="field">
        <span>Add a photo of your piece (optional)</span>
        {photo ? (
          <div className="photo-picked">
            <img src={photo.thumb} alt="Your photo" />
            <button type="button" className="btn ghost" onClick={() => setPhoto(null)}>Remove photo</button>
          </div>
        ) : (
          <label className="photo-pick">
            <input type="file" accept="image/*" onChange={pickPhoto} hidden />
            <span aria-hidden>📷</span> Choose a photo
          </label>
        )}
      </div>
      {error && <p className="form-error">{error}</p>}
      <div className="rf-actions">
        <button type="button" className="btn ghost" onClick={onCancel}>Cancel</button>
        <button className="btn primary" disabled={status === 'sending'}>{status === 'sending' ? 'Sending…' : 'Post review'}</button>
      </div>
    </form>
  );
}
