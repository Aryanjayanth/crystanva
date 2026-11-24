import Resin from '../components/Resin.jsx';
import { categories, colors, glitters, shapes, plates, placements, describe, priceOf } from '../data';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const sparkleBg = (hex) =>
  `radial-gradient(circle at 28% 30%, rgba(255,255,255,.95) 0 1.4px, transparent 2px),
   radial-gradient(circle at 66% 62%, rgba(255,255,255,.8) 0 1.4px, transparent 2px),
   radial-gradient(circle at 72% 26%, rgba(0,0,0,.18) 0 2px, transparent 3px),
   radial-gradient(circle at 36% 72%, rgba(0,0,0,.14) 0 2.4px, transparent 3.4px),
   radial-gradient(circle at 50% 45%, rgba(255,255,255,.35), transparent 70%), ${hex}`;

export default function Builder({ item, setItem, next, back }) {
  const cat = categories.find((c) => c.id === item.category);
  const set = (patch) => setItem({ ...item, ...patch });
  const { details } = describe(item);
  let step = 1;

  return (
    <section className="builder">
      <div className="builder-preview">
        <button className="back" onClick={back}>← Back</button>
        <div className="stage">
          <Resin kind={item.kind} value={item.value} color={item.color} glitter={item.glitter} placement={item.placement} />
        </div>
        <p className="stage-caption">{details.map((d) => d.value).join(' · ')}</p>
        <p className="stage-hint">Drag to turn it in the light</p>
      </div>

      <div className="builder-panel">
        <span className="eyebrow">{cat.title}</span>
        <h1>Make it yours</h1>

        {item.kind === 'letter' && (
          <div className="opt">
            <h4><span>{step++}</span> Pick your letter</h4>
            <div className="letters">
              {LETTERS.map((l) => (
                <button key={l} className={`letter ${item.value === l ? 'on' : ''}`} onClick={() => set({ value: l })}>{l}</button>
              ))}
            </div>
          </div>
        )}

        {(item.kind === 'shape' || item.kind === 'plate') && (
          <div className="opt">
            <h4><span>{step++}</span> Pick your shape</h4>
            <div className="shapes">
              {(item.kind === 'plate' ? plates : shapes).map((s) => (
                <button key={s.id} disabled={!s.inStock} className={`shape ${item.value === s.id ? 'on' : ''}`} onClick={() => set({ value: s.id })}>
                  <svg viewBox="0 0 400 400"><path d={s.d} /></svg>
                  <span>{s.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="opt">
          <h4><span>{step++}</span> Base colour</h4>
          <div className="swatches">
            {colors.map((c) => (
              <button key={c.id} disabled={!c.inStock} className={`swatch ${item.color === c.id ? 'on' : ''}`} onClick={() => set({ color: c.id })}>
                <i style={{ background: `radial-gradient(circle at 35% 30%, rgba(255,255,255,.55), transparent 60%), ${c.hex}` }} />
                <span>{c.name}{!c.inStock && <em> · sold out</em>}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="opt">
          <h4><span>{step++}</span> Glitter &amp; foil</h4>
          <div className="swatches">
            {glitters.map((g) => (
              <button key={g.id} disabled={!g.inStock} className={`swatch ${item.glitter === g.id ? 'on' : ''}`} onClick={() => set({ glitter: g.id })}>
                <i className={g.kind === 'none' ? 'plain' : ''} style={g.kind === 'none' ? undefined : { background: sparkleBg(g.hex) }} />
                <span>{g.name}{!g.inStock && <em> · sold out</em>}</span>
              </button>
            ))}
          </div>
        </div>

        {item.glitter !== 'none' && (
          <div className="opt">
            <h4><span>{step++}</span> Glitter style</h4>
            <div className="placements">
              {placements.map((p) => (
                <button key={p.id} className={`placement ${(item.placement || 'top') === p.id ? 'on' : ''}`} onClick={() => set({ placement: p.id })}>
                  <i className={`pl-${p.id}`} style={{ '--g': glitters.find((g) => g.id === item.glitter)?.hex }} />
                  <span>{p.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="builder-foot">
          <div>
            <small>Price</small>
            <strong>₹{priceOf(item)}</strong>
          </div>
          <button className="btn primary" onClick={next}>Continue <span aria-hidden>→</span></button>
        </div>
      </div>
    </section>
  );
}
