import { useState } from 'react';
import Resin from '../components/Resin.jsx';
import { categories, colors, glitters, shapes, plates, placements, describe, priceOf, FLORAL_PRICE } from '../data';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const sparkleBg = (hex) =>
  `radial-gradient(circle at 28% 30%, rgba(255,255,255,.95) 0 1.4px, transparent 2px),
   radial-gradient(circle at 66% 62%, rgba(255,255,255,.8) 0 1.4px, transparent 2px),
   radial-gradient(circle at 72% 26%, rgba(0,0,0,.18) 0 2px, transparent 3px),
   radial-gradient(circle at 36% 72%, rgba(0,0,0,.14) 0 2.4px, transparent 3.4px),
   radial-gradient(circle at 50% 45%, rgba(255,255,255,.35), transparent 70%), ${hex}`;

export default function Builder({ item, setItem, onAdd, onBuy, editing, back }) {
  const cat = categories.find((c) => c.id === item.category);
  const set = (patch) => setItem({ ...item, ...patch });
  const { details } = describe(item);
  let step = 1;
  // two-sided pieces: colour / glitter / style apply to the side being edited
  const [side, setSide] = useState('front');
  const twoSided = Boolean(cat.twoSided && item.back);
  const look = twoSided && side === 'back' ? item.back : item;
  const setLook = (patch) => (twoSided && side === 'back' ? set({ back: { ...item.back, ...patch } }) : set(patch));
  // pair = two keychains (Keychain 1 / 2); otherwise one piece with a front and back
  const names = item.kind === 'pair' ? ['Keychain 1', 'Keychain 2'] : ['Front', 'Back'];
  const sideName = side === 'back' ? names[1] : names[0];

  return (
    <section className="builder">
      <div className="builder-preview">
        <button className="back" onClick={back}>← Back</button>
        <div className="stage">
          <Resin kind={item.kind} value={item.value} color={item.color} glitter={item.glitter} placement={item.placement} back={twoSided ? item.back : undefined} showBack={twoSided && side === 'back'} />
        </div>
        <p className="stage-caption">{twoSided ? (item.kind === 'pair' ? `Designing ${sideName} · they join to make a heart` : `Showing the ${side} · tap Front / Back to switch`) : details.map((d) => d.value).join(' · ')}</p>
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

        {(item.kind === 'shape' || item.kind === 'plate') && !cat.twoSided && (
          <div className="opt">
            <h4><span>{step++}</span> Pick your shape</h4>
            <div className="shapes">
              {(item.kind === 'plate' ? plates : shapes.filter((x) => !x.special)).map((s) => (
                <button key={s.id} disabled={!s.inStock} className={`shape ${item.value === s.id ? 'on' : ''}`} onClick={() => set({ value: s.id })}>
                  <svg viewBox="0 0 400 400"><path d={s.d} /></svg>
                  <span>{s.name}</span>
                  <small className="shape-price">₹{priceOf({ ...item, value: s.id, floral: false })}</small>
                </button>
              ))}
            </div>
          </div>
        )}

        {twoSided && (
          <div className="opt">
            <h4><span>{step++}</span> {item.kind === 'pair' ? 'Pick a keychain to design' : 'Pick a side to design'}</h4>
            <div className="sides">
              {['front', 'back'].map((sd) => (
                <button key={sd} type="button" className={`side-tab ${side === sd ? 'on' : ''}`} onClick={() => setSide(sd)}>
                  <b>{sd === 'front' ? names[0] : names[1]}</b>
                  <small>{colors.find((c) => c.id === (sd === 'front' ? item : item.back).color)?.name} · {glitters.find((g) => g.id === (sd === 'front' ? item : item.back).glitter)?.name}</small>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="opt">
          <h4><span>{step++}</span> {twoSided ? `${sideName} colour` : 'Base colour'}</h4>
          <div className="swatches">
            {colors.map((c) => (
              <button key={c.id} disabled={!c.inStock} className={`swatch ${look.color === c.id ? 'on' : ''}`} onClick={() => setLook({ color: c.id })}>
                <i className={c.clear ? 'clear' : ''} style={c.clear ? undefined : { background: `radial-gradient(circle at 35% 30%, rgba(255,255,255,.55), transparent 60%), ${c.hex}` }} />
                <span>{c.name}{!c.inStock && <em> · sold out</em>}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="opt">
          <h4><span>{step++}</span> {twoSided ? `${sideName} glitter & foil` : 'Glitter & foil'}</h4>
          <div className="swatches">
            {glitters.map((g) => (
              <button key={g.id} disabled={!g.inStock} className={`swatch ${look.glitter === g.id ? 'on' : ''}`} onClick={() => setLook({ glitter: g.id })}>
                <i className={g.kind === 'none' ? 'plain' : ''} style={g.kind === 'none' ? undefined : { background: sparkleBg(g.hex) }} />
                <span>{g.name}{!g.inStock && <em> · sold out</em>}</span>
              </button>
            ))}
          </div>
        </div>

        {look.glitter !== 'none' && (
          <div className="opt">
            <h4><span>{step++}</span> Glitter style</h4>
            <div className="placements">
              {placements.map((p) => (
                <button key={p.id} className={`placement ${(look.placement || 'top') === p.id ? 'on' : ''}`} onClick={() => setLook({ placement: p.id })}>
                  <i className={`pl-${p.id}`} style={{ '--g': glitters.find((g) => g.id === look.glitter)?.hex }} />
                  <span>{p.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="opt">
          <h4><span>{step++}</span> Floral add-on</h4>
          <p className="opt-note">Real dried flowers set into your piece{FLORAL_PRICE ? ` (+₹${FLORAL_PRICE})` : ''}. We'll pick flowers that suit your colours.</p>
          <div className="yesno">
            {[[false, 'No flowers'], [true, 'Yes, add flowers']].map(([v, label]) => (
              <button key={label} type="button" className={`placement ${Boolean(item.floral) === v ? 'on' : ''}`} onClick={() => set({ floral: v })}>
                <span aria-hidden className="yn-icon">{v ? '❀' : '✕'}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="builder-foot">
          <div>
            <small>Price</small>
            <strong>₹{priceOf(item)}</strong>
          </div>
          <div className="foot-btns">
            {editing
              ? <button className="btn primary" onClick={onAdd}>Save changes</button>
              : <><button className="btn ghost" onClick={onAdd}>Add to cart</button><button className="btn primary" onClick={onBuy}>Buy now</button></>}
          </div>
        </div>
      </div>
    </section>
  );
}
