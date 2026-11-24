import { useEffect, useState } from 'react';

export default function Navbar({ page, go, cartCount = 0 }) {
  const onHome = page === 'home';
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [page]);

  const link = (id, label) => (
    <a
      key={id}
      href={`#${id}`}
      onClick={(e) => {
        e.preventDefault();
        setOpen(false);
        if (onHome) document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
        else go('home', { scrollTo: id });
      }}
    >
      {label}
    </a>
  );
  const links = [link('collections', 'Collections'), link('how', 'How it works'), link('reviews', 'Happy customers')];

  return (
    <header className="nav">
      <button className="brand" onClick={() => (onHome ? window.scrollTo({ top: 0, behavior: 'smooth' }) : go('home'))} aria-label="Crystanva home">
        <img src="/crystal.png" alt="" />
        <span>CRYSTANVA</span>
      </button>
      <nav>{links}</nav>
      <button className="cart-btn" onClick={() => go('cart')} aria-label={`Cart, ${cartCount} items`}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 4h2.2l2.1 10.2a1.5 1.5 0 0 0 1.5 1.2h8.2a1.5 1.5 0 0 0 1.5-1.1L20 8H6.2" /><circle cx="9.5" cy="19.5" r="1.3" /><circle cx="17" cy="19.5" r="1.3" /></svg>
        {cartCount > 0 && <b>{cartCount}</b>}
      </button>
      {/* phones: menu button + drop-down sheet */}
      <button className={`menu-btn ${open ? 'open' : ''}`} onClick={() => setOpen((o) => !o)} aria-label="Menu" aria-expanded={open}>
        <span />
      </button>
      {open && <div className="menu-sheet">{links}</div>}
    </header>
  );
}
