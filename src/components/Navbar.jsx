import { useEffect, useState } from 'react';

export default function Navbar({ page, go }) {
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
      {/* phones: menu button + drop-down sheet */}
      <button className={`menu-btn ${open ? 'open' : ''}`} onClick={() => setOpen((o) => !o)} aria-label="Menu" aria-expanded={open}>
        <span />
      </button>
      {open && <div className="menu-sheet">{links}</div>}
    </header>
  );
}
