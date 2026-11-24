import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import ItemImage from '../components/ItemImage.jsx';
import Facets from '../components/Facets.jsx';
import Resin from '../components/Resin.jsx';
import ReviewForm from '../components/ReviewForm.jsx';
import { categories, colors, glitters, reviews, initialOf, fromPrice, lowestPrice } from '../data';

const combos = [
  ['pink', 'gold-foil'], ['white', 'rosegold-foil'], ['clear', 'gold-glitter'],
  ['peach', 'silver-foil'], ['pearl', 'purple-glitter'], ['champagne', 'teal-glitter'],
];

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const pick = (list, not) => { let x; do { x = list[Math.floor(Math.random() * list.length)]; } while (list.length > 1 && x === not); return x; };
const randomLook = (prev, letterFixed) => ({
  letter: letterFixed || pick(LETTERS, prev?.letter),
  combo: pick(combos, prev?.combo),
});

function Hero({ name, setName, start }) {
  const hasName = /^[A-Za-z]/.test(name.trim());
  const fixed = hasName ? initialOf(name) : null; // typed a name → stay on their initial
  // current look + the next one; the next is pre-built in idle time so the switch never stutters
  const [look, setLook] = useState(() => randomLook(null, fixed));
  const [next, setNext] = useState(() => randomLook(look, fixed));
  useEffect(() => {
    const t = setInterval(() => {
      setLook(next);
      setNext(randomLook(next, fixed));
    }, 2800);
    return () => clearInterval(t);
  }, [next, fixed]);
  useEffect(() => { // name typed or cleared: switch right away
    setLook((l) => ({ ...l, letter: fixed || l.letter }));
    setNext((n) => ({ ...n, letter: fixed || pick(LETTERS, n.letter) }));
  }, [fixed]);
  const letter = look.letter;
  const [color, glitter] = look.combo;
  const warm = useMemo(() => [{ kind: 'letter', value: next.letter, glitter: next.combo[1], placement: 'top' }], [next]);
  const display = name.trim() ? name.trim().split(' ')[0] : 'you';

  return (
    <div className="hero-wrap">
    <Facets className="hero-facets" />
    <section className="hero">
      <div className="hero-glow a" /><div className="hero-glow b" />
      <div className="hero-copy">
        <span className="eyebrow">Handmade resin art</span>
        <h1>
          Made for{' '}
          <span className="nowrap">
            <AnimatePresence mode="wait"><motion.em key={display} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>{display}</motion.em></AnimatePresence>.
          </span>
        </h1>
        <p className="lead">Keychains and pens poured by hand in the colours and sparkle <i>you</i> choose. Design it here and we'll make it just for you.</p>
        <label className="name-field">
          <span>What should we call you?</span>
          <input value={name} onChange={(e) => setName(e.target.value.slice(0, 24))} placeholder="Type your name" />
        </label>
        <div className="hero-cta">
          <button className="btn primary" onClick={() => start('personal')}>{hasName ? `Design your “${letter}”` : 'Design your initial'}</button>
          <a className="btn ghost" href="#collections" onClick={(e) => { e.preventDefault(); document.getElementById('collections').scrollIntoView({ behavior: 'smooth' }); }}>Browse collections</a>
        </div>
      </div>
      <div className="hero-art">
        <div className="hero-ring" />
        <div className="hero-ring inner" />
        <Resin kind="letter" value={letter} color={color} glitter={glitter} placement="top" warm={warm} />
        <div className="hero-chip">
          <span className="dot" style={{ background: colors.find((c) => c.id === color).hex }} />
          {colors.find((c) => c.id === color).name} · {glitters.find((g) => g.id === glitter).name}
        </div>
      </div>
    </section>
    </div>
  );
}

function Collections({ start }) {
  return (
    <section id="collections" className="section">
      <div className="section-head">
        <span className="eyebrow">Collections</span>
        <h2>Pick something to make yours</h2>
        <p>Every piece starts at <b>₹{lowestPrice()}</b> and is customised by you.</p>
      </div>
      <div className="cards">
        {categories.map((c, idx) => (
          <motion.button
            key={c.id}
            className="card"
            onClick={() => start(c.id)}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ delay: idx * 0.08, duration: 0.5 }}
            whileHover={{ y: -6 }}
          >
            {c.tag && <span className="tag">{c.tag}</span>}
            <div className="card-art"><ItemImage kind={c.kind} {...c.sample} /></div>
            <h3>{c.title}</h3>
            <p>{c.blurb}</p>
            <span className="card-foot">
              <span className="card-price">from <b>₹{fromPrice(c)}</b></span>
              <span className="card-cta">Customise <span aria-hidden>→</span></span>
            </span>
          </motion.button>
        ))}
      </div>
    </section>
  );
}

const steps = [
  { n: '01', t: 'Design it', d: 'Choose your letter or shape, a base colour and your favourite glitter or foil.' },
  { n: '02', t: 'Send your request', d: 'Leave your name and number. Your order reaches us instantly.' },
  { n: '03', t: 'We pour it for you', d: 'We confirm with you, then hand-pour, cure and polish your piece.' },
];

function How() {
  return (
    <section id="how" className="section how">
      <Facets dark seed={21} className="how-facets" />
      <div className="section-head">
        <span className="eyebrow">How it works</span>
        <h2>Three steps to something only you have</h2>
      </div>
      <div className="steps">
        {steps.map((s, i) => (
          <motion.div key={s.n} className="step" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
            <span className="step-n">{s.n}</span>
            <h3>{s.t}</h3>
            <p>{s.d}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

const MY_REVIEWS = 'crystanva-my-reviews';

function Reviews({ name }) {
  const [mine, setMine] = useState(() => { try { return JSON.parse(localStorage.getItem(MY_REVIEWS)) || []; } catch { return []; } });
  const [open, setOpen] = useState(false);
  const [thanks, setThanks] = useState(false);
  // reviews you approved from Telegram (live), plus any hand-added ones in data.js
  const [approved, setApproved] = useState([]);
  useEffect(() => {
    fetch('/api/reviews').then((r) => (r.ok ? r.json() : [])).then((list) => Array.isArray(list) && setApproved(list)).catch(() => {});
  }, []);
  const live = approved.map((r) => {
    const cat = categories.find((c) => c.id === r.category) || categories[0];
    return { ...r, item: { kind: cat.kind, ...cat.sample } };
  });
  // once your own review is approved, show the live one instead of the "awaiting" copy
  const same = (a, b) => a.name === b.name && a.text === b.text;
  const stillPending = mine.filter((m) => !live.some((l) => same(l, m)));
  const all = [...stillPending, ...live, ...reviews];

  const added = (r) => {
    const next = [r, ...mine];
    setMine(next);
    localStorage.setItem(MY_REVIEWS, JSON.stringify(next));
    setOpen(false);
    setThanks(true);
  };

  return (
    <section id="reviews" className="section">
      <div className="section-head">
        <span className="eyebrow">Happy customers</span>
        <h2>Little pieces, big smiles</h2>
        <p>{all.length ? 'What people say about the pieces we made for them.' : 'No reviews yet — got a Crystanva piece? Be the first to share how it turned out.'}</p>
      </div>

      <div className="review-cta">
        <AnimatePresence mode="wait">
          {open ? (
            <motion.div key="form" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <ReviewForm defaultName={name} onDone={added} onCancel={() => setOpen(false)} />
            </motion.div>
          ) : (
            <motion.div key="btn" className="review-cta-row" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {thanks && <p className="thanks">Thank you! Your review will appear for everyone once we approve it.</p>}
              <button className={`btn ${all.length ? 'ghost' : 'primary'}`} onClick={() => { setOpen(true); setThanks(false); }}>✎ {all.length ? 'Write a review' : 'Be the first to review'}</button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="reviews">
        {all.map((r, i) => (
          <motion.figure key={r.id || `${r.name}-${r.at || i}`} className={`review ${r.pending ? 'pending' : ''}`} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: (i % 3) * 0.08 }}>
            {r.photo || r.photoThumb ? (
              <a className="review-art review-photo" href={r.photo || r.photoThumb} target="_blank" rel="noreferrer" aria-label={`Photo from ${r.name}`}>
                <img src={r.photo || r.photoThumb} alt="" loading="lazy" decoding="async" />
              </a>
            ) : (
              <div className="review-art"><ItemImage {...r.item} /></div>
            )}
            <div>
              {r.pending && <span className="pending-chip">Awaiting approval · only you can see this</span>}
              <div className="stars" aria-label={`${r.rating || 5} stars`}>{'★'.repeat(r.rating || 5)}<span className="dim">{'★'.repeat(5 - (r.rating || 5))}</span></div>
              <blockquote>“{r.text}”</blockquote>
              <figcaption>
                <span className="avatar">{r.name[0]}</span>{r.name}
              </figcaption>
            </div>
          </motion.figure>
        ))}
      </div>
    </section>
  );
}

export default function Home({ name, setName, start }) {
  return (
    <>
      <Hero name={name} setName={setName} start={start} />
      <Collections start={start} />
      <How />
      <Reviews name={name} />
    </>
  );
}
