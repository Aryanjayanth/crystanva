import { useEffect, useId, useMemo, useState } from 'react';
import { colors, glitters, shapes, plates, bookmarkShape, penBarrel } from '../data';

/* ---------- helpers ---------- */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hashStr = (s) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const rgbOf = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
function mix(hex, to, amt) {
  const a = rgbOf(hex), b = rgbOf(to);
  return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * amt)).join(',')})`;
}
const lum = (hex) => { const [r, g, b] = rgbOf(hex); return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// vertical span of the glitter area per product (in the 400×400 design space)
const BOUNDS = { letter: [88, 312], shape: [40, 362], plate: [40, 362], bookmark: [30, 366], pen: [92, 278] };

/* ---------- glitter that settles like real resin pours ---------- */
function GlitterLayer({ glitter, placement, y0, y1, uid }) {
  // Two overlapping repeating tiles (different sizes/angles so no visible repeat),
  // faded by a density mask so glitter settles at the top / bottom like a real pour.
  const tiles = useMemo(() => {
    if (!glitter || glitter.kind === 'none') return null;
    const r = rng(hashStr(glitter.id));
    // darken toward a deep tone of the same colour (pure black turns gold olive)
    const deep = mix(glitter.hex, '#000000', 0.55).replace(/rgb\((\d+),(\d+),(\d+)\)/, (_, a, b, c) => '#' + [a, b, c].map((n) => (+n).toString(16).padStart(2, '0')).join(''));
    const shade = () => { const light = r() > 0.25; return light ? mix(glitter.hex, '#fff6dc', r() * 0.65) : mix(glitter.hex, deep, r() * 0.5); };
    const make = (size, count) => {
      const out = [];
      for (let i = 0; i < count; i++) {
        const cx = r() * size, cy = r() * size;
        if (glitter.kind === 'foil') {
          const n = 4 + Math.floor(r() * 3), rad = 6 + r() * 15;
          const pts = Array.from({ length: n }, (_, k) => {
            const a = (k / n) * Math.PI * 2 + r() * 0.9, rr = rad * (0.45 + r() * 0.7);
            return `${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`;
          }).join(' ');
          out.push(<polygon key={i} points={pts} fill={shade()} opacity=".93" />);
        } else if (r() > 0.7) {
          const s = 1 + r() * 2;
          out.push(<rect key={i} x={(cx - s).toFixed(1)} y={(cy - s).toFixed(1)} width={(s * 2).toFixed(1)} height={(s * 2).toFixed(1)} fill={shade()} transform={`rotate(${Math.round(r() * 90)} ${cx.toFixed(1)} ${cy.toFixed(1)})`} />);
        } else {
          out.push(<circle key={i} cx={cx.toFixed(1)} cy={cy.toFixed(1)} r={(1.2 + r() * 1.8).toFixed(2)} fill={shade()} opacity={(0.85 + r() * 0.15).toFixed(2)} />);
        }
      }
      for (let i = 0; i < (glitter.kind === 'foil' ? 8 : 18); i++) out.push(<circle key={`w${i}`} cx={(r() * size).toFixed(1)} cy={(r() * size).toFixed(1)} r={(0.8 + r() * 1.2).toFixed(2)} fill="#fff" />);
      return out;
    };
    const foil = glitter.kind === 'foil';
    return { a: make(foil ? 120 : 70, foil ? 26 : 150), b: make(foil ? 87 : 53, foil ? 12 : 70), sa: foil ? 120 : 70, sb: foil ? 87 : 53 };
  }, [glitter]);

  // a few individually twinkling sparkles in the dense area
  const sparkles = useMemo(() => {
    if (!glitter || glitter.kind === 'none') return [];
    const r = rng(hashStr(glitter.id + placement));
    const out = [];
    while (out.length < 16) {
      const y = y0 + r() * (y1 - y0), t = (y - y0) / (y1 - y0);
      const p = placement === 'top' ? 1 - t : placement === 'bottom' ? t : 0.6;
      if (r() < p) out.push({ x: 40 + r() * 320, y, d: r() * 4 });
    }
    return out;
  }, [glitter, placement, y0, y1]);

  if (!tiles) return null;
  const stops = placement === 'top'
    ? [[0, 1], [0.3, 0.85], [0.62, 0.25], [0.85, 0.04], [1, 0]]
    : placement === 'bottom' ? [[0, 0], [0.15, 0.04], [0.38, 0.25], [0.7, 0.85], [1, 1]] : [[0, 0.8], [1, 0.8]];

  return (
    <g>
      <defs>
        <pattern id={`${uid}pa`} width={tiles.sa} height={tiles.sa} patternUnits="userSpaceOnUse">{tiles.a}</pattern>
        <pattern id={`${uid}pb`} width={tiles.sb} height={tiles.sb} patternUnits="userSpaceOnUse" patternTransform="rotate(33)">{tiles.b}</pattern>
        <linearGradient id={`${uid}dg`} gradientUnits="userSpaceOnUse" x1="0" y1={y0} x2="0" y2={y1}>
          {stops.map(([o, a]) => <stop key={o} offset={o} stopColor="#fff" stopOpacity={a} />)}
        </linearGradient>
        <mask id={`${uid}dm`} maskUnits="userSpaceOnUse" x="-60" y="-100" width="520" height="520">
          <rect x="-60" y="-100" width="520" height="520" fill={`url(#${uid}dg)`} />
        </mask>
        <linearGradient id={`${uid}haze`} gradientUnits="userSpaceOnUse" x1="0" y1={y0} x2="0" y2={y1}>
          {stops.map(([o, a]) => <stop key={o} offset={o} stopColor={glitter.hex} stopOpacity={a * 0.55} />)}
        </linearGradient>
      </defs>
      <rect x="-60" y="-100" width="520" height="520" fill={`url(#${uid}haze)`} />
      <g mask={`url(#${uid}dm)`}>
        <rect x="-60" y="-100" width="520" height="520" fill={`url(#${uid}pa)`} />
        <rect x="-60" y="-100" width="520" height="520" fill={`url(#${uid}pb)`} />
      </g>
      {sparkles.map((s, i) => <circle key={i} className="pv-twinkle" style={{ animationDelay: `${s.d.toFixed(2)}s` }} cx={s.x.toFixed(1)} cy={s.y.toFixed(1)} r="1.6" fill="#fff" />)}
    </g>
  );
}

/* ---------- where to drill the keyring hole in a letter ---------- */
const holeCache = new Map();
function findHole(letter) {
  if (holeCache.has(letter)) return Promise.resolve(holeCache.get(letter));
  return document.fonts.load('300px "Archivo Black"').catch(() => {}).then(() => {
    const c = document.createElement('canvas'); c.width = c.height = 400;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.font = '300px "Archivo Black"'; x.textAlign = 'center'; x.fillStyle = '#000'; x.fillText(letter, 200, 310);
    const d = x.getImageData(0, 0, 400, 400).data;
    const ink = (px, py) => px >= 0 && px < 400 && py >= 0 && py < 400 && d[(py * 400 + px) * 4 + 3] > 128;
    let top = -1;
    for (let y = 0; y < 400 && top < 0; y++) for (let xx = 0; xx < 400; xx++) if (ink(xx, y)) { top = y; break; }
    let res = { x: 200, y: 112 };
    if (top >= 0) {
      for (let y = top + 22; y < top + 110; y += 2) {
        let best = null, start = null;
        for (let xx = 0; xx <= 400; xx++) {
          if (ink(xx, y) && start === null) start = xx;
          if (!ink(xx, y) && start !== null) { if (!best || xx - start > best.w) best = { s: start, w: xx - start }; start = null; }
        }
        if (best && best.w >= 46) {
          const cx = Math.round(best.s + best.w / 2);
          if (ink(cx, y - 16) && ink(cx, y + 16) && ink(cx - 16, y) && ink(cx + 16, y)) { res = { x: cx, y }; break; }
        }
      }
    }
    holeCache.set(letter, res);
    return res;
  });
}

/* ---------- keyring hardware: jump ring, chain, split ring, charm ---------- */
function Chain({ pos, uid }) {
  const top = { x: pos.x, y: pos.y - 58 };
  const ring = { x: pos.x, y: pos.y - 150, R: 46 }; // hangs straight up from the hole
  const ang = Math.atan2(top.y - ring.y, top.x - ring.x);
  const att = { x: ring.x + ring.R * Math.cos(ang), y: ring.y + ring.R * Math.sin(ang) };
  const deg = (Math.atan2(att.y - top.y, att.x - top.x) * 180) / Math.PI;
  const n = 4;
  const links = Array.from({ length: n }, (_, i) => {
    const t = (i + 0.5) / n;
    return { x: top.x + (att.x - top.x) * t, y: top.y + (att.y - top.y) * t };
  });
  const metal = `url(#${uid}metal)`;
  return (
    <g>
      {links.map((l, i) => (
        <g key={i} transform={`translate(${l.x.toFixed(1)} ${l.y.toFixed(1)}) rotate(${deg.toFixed(1)})`}>
          {i % 2 === 0
            ? <ellipse rx="12" ry="6.5" fill="none" stroke={metal} strokeWidth="3.6" />
            : <rect x="-12" y="-2.2" width="24" height="4.4" rx="2.2" fill={metal} />}
        </g>
      ))}
      {/* split ring (two coils) */}
      <circle cx={ring.x} cy={ring.y} r={ring.R} fill="none" stroke="#5f6672" strokeOpacity=".35" strokeWidth="9" />
      <circle cx={ring.x} cy={ring.y} r={ring.R} fill="none" stroke={metal} strokeWidth="4.2" />
      <circle cx={ring.x} cy={ring.y} r={ring.R - 4.6} fill="none" stroke={metal} strokeWidth="4.2" />
    </g>
  );
}

function Tassel({ pos, uid, hex }) {
  const knot = { x: pos.x + 46, y: pos.y - 64 };
  return (
    <g>
      <path d={`M${pos.x - 6} ${pos.y} C${pos.x - 26} ${pos.y - 60}, ${pos.x + 20} ${pos.y - 80}, ${knot.x} ${knot.y}`} fill="none" stroke="#1d2b55" strokeWidth="4" strokeLinecap="round" />
      <path d={`M${pos.x + 6} ${pos.y} C${pos.x + 4} ${pos.y - 40}, ${pos.x + 30} ${pos.y - 70}, ${knot.x} ${knot.y}`} fill="none" stroke="#2a3a6e" strokeWidth="4" strokeLinecap="round" />
      {Array.from({ length: 11 }, (_, i) => {
        const a = (-10 + i * 5) * (Math.PI / 180);
        const L = 64 + (i % 3) * 6;
        return <path key={i} d={`M${knot.x} ${knot.y} q 14 18 ${(Math.cos(a) * L * 0.55).toFixed(1)} ${(Math.sin(a) * L * 0.3 + L * 0.75).toFixed(1)}`} fill="none" stroke={i % 2 ? hex : mix(hex, '#000000', 0.25)} strokeWidth="2.6" strokeLinecap="round" transform={`translate(${i - 5} 0)`} />;
      })}
      <circle cx={knot.x} cy={knot.y} r="9" fill={`url(#${uid}gold)`} />
    </g>
  );
}

/* ---------- the resin piece ---------- */
/* ---------- Special Keychains: two tags whose cut-outs form a heart (light 2D version) ---------- */
const HEART_D = 'M200 350 C60 250 38 150 88 104 C135 62 192 84 200 130 C208 84 265 62 312 104 C362 150 340 250 200 350 Z';
function PairPreview({ color = 'pink', glitter = 'gold-foil', back, float = true, className = '' }) {
  const uid = useId().replace(/:/g, '');
  const b = back || { color: 'clear', glitter: 'silver-glitter' };
  const tag = (c, g, x0, seed) => {
    const col = colors.find((k) => k.id === c), gl = glitters.find((k) => k.id === g);
    const r = rng(hashStr(seed + g));
    const dots = gl && gl.kind !== 'none' ? Array.from({ length: 70 }, () => ({ x: x0 + r() * 140, y: 95 + Math.pow(r(), 1.8) * 230, s: 1.5 + r() * (gl.kind === 'foil' ? 6 : 3) })) : [];
    return (
      <g>
        <rect x={x0} y="90" width="140" height="240" rx="16" fill={col?.hex ?? '#fff'} opacity={col?.clear ? 0.35 : 1} />
        {dots.map((d, i) => <circle key={i} cx={d.x} cy={d.y} r={d.s} fill={gl.hex} opacity="0.85" />)}
        <rect x={x0} y="90" width="140" height="240" rx="16" fill="none" stroke="#fff" strokeOpacity=".7" strokeWidth="3" />
      </g>
    );
  };
  return (
    <div className={`pv ${float ? 'pv-float' : ''} ${className}`}>
      <svg viewBox="-60 -100 520 520" role="img" aria-label="pair of keychains that form a heart">
        <defs>
          <mask id={`${uid}hm`} maskUnits="userSpaceOnUse" x="-60" y="-100" width="520" height="520">
            <rect x="-60" y="-100" width="520" height="520" fill="#fff" />
            <path d={HEART_D} transform="translate(200 212) scale(0.34) translate(-200 -206)" fill="#000" />
            <circle cx="80" cy="112" r="9" fill="#000" /><circle cx="320" cy="112" r="9" fill="#000" />
          </mask>
        </defs>
        <ellipse cx="200" cy="372" rx="150" ry="10" fill="#1a2a55" opacity=".15" />
        <circle cx="80" cy="84" r="24" fill="none" stroke="#c9ced6" strokeWidth="5" />
        <circle cx="320" cy="84" r="24" fill="none" stroke="#c9ced6" strokeWidth="5" />
        <g mask={`url(#${uid}hm)`}>
          {tag(color, glitter, 56, 'L')}
          {tag(b.color, b.glitter, 204, 'R')}
        </g>
      </svg>
    </div>
  );
}

export default function Preview(props) {
  return props.kind === 'pair' ? <PairPreview {...props} /> : <SinglePreview {...props} />;
}

function SinglePreview({ kind = 'letter', value = 'J', color = 'pink', glitter = 'gold-foil', placement = 'top', float = true, className = '' }) {
  const uid = useId().replace(/:/g, '');
  const base = colors.find((c) => c.id === color)?.hex ?? '#ffffff';
  const isClear = Boolean(colors.find((c) => c.id === color)?.clear);
  const g = glitters.find((x) => x.id === glitter);
  const [hole, setHole] = useState({ x: 200, y: 112 });

  useEffect(() => {
    if (kind !== 'letter') return;
    let live = true;
    findHole(value).then((h) => live && setHole(h));
    return () => { live = false; };
  }, [kind, value]);

  const shape = kind === 'shape' ? shapes.find((s) => s.id === value) ?? shapes[0]
    : kind === 'plate' ? plates.find((s) => s.id === value) ?? plates[0] : null;
  const pos = kind === 'letter' ? hole : kind === 'shape' ? { x: shape.hole[0], y: shape.hole[1] } : kind === 'bookmark' ? { x: 200, y: 76 } : null;
  const [y0, y1] = BOUNDS[kind];
  const isDark = lum(base) < 0.3;
  const b = penBarrel;
  const charmHex = g && g.kind !== 'none' ? g.hex : '#D8B04B';

  // side wall of the poured piece (stacked layers = real thickness)
  const N = kind === 'pen' ? 0 : kind === 'bookmark' ? 6 : 13;
  const layers = [];
  for (let i = N; i >= 1; i--) {
    const t = i / N;
    layers.push({ dx: i * 0.8, dy: i * 1.1, fill: isDark ? mix(base, '#ffffff', 0.05 + 0.1 * (1 - t)) : mix(base, '#000000', 0.1 + 0.3 * t) });
  }

  const sil = (fill, extra = {}) => {
    if (kind === 'letter') return <text x="200" y="310" textAnchor="middle" fontSize="300" fontFamily="'Archivo Black', sans-serif" fill={fill} strokeLinejoin="round" {...extra}>{value}</text>;
    if (kind === 'shape' || kind === 'plate') return <path d={shape.d} fill={fill} strokeLinejoin="round" {...extra} />;
    if (kind === 'bookmark') return <path d={bookmarkShape} fill={fill} strokeLinejoin="round" {...extra} />;
    return <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={b.r} fill={fill} {...extra} />;
  };
  const edge = (stroke, w, op) => (
    <>
      {sil('none', { stroke, strokeWidth: w, strokeOpacity: op })}
      {pos && <circle cx={pos.x} cy={pos.y} r="11" fill="none" stroke={stroke} strokeWidth={w} strokeOpacity={op} />}
    </>
  );
  const rot = kind === 'pen' ? 'rotate(38 200 200)' : undefined;
  const M = `url(#${uid}m)`;

  return (
    <div className={`pv ${float ? 'pv-float' : ''} ${className}`}>
      <svg viewBox="-60 -100 520 520" role="img" aria-label={`${kind} preview`}>
        <defs>
          <linearGradient id={`${uid}gold`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#F8E7AE" /><stop offset=".5" stopColor="#D2A95A" /><stop offset="1" stopColor="#8F6B2C" />
          </linearGradient>
          <linearGradient id={`${uid}metal`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffffff" /><stop offset=".3" stopColor="#a9b0bb" /><stop offset=".55" stopColor="#eef1f5" /><stop offset=".8" stopColor="#7d8593" /><stop offset="1" stopColor="#d9dde3" />
          </linearGradient>
          <linearGradient id={`${uid}silver`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#8C93A0" /><stop offset=".45" stopColor="#F1F3F7" /><stop offset="1" stopColor="#8C93A0" />
          </linearGradient>
          <linearGradient id={`${uid}charmGloss`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity=".55" /><stop offset=".5" stopColor="#fff" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity=".3" />
          </linearGradient>
          <linearGradient id={`${uid}tint`} gradientUnits="userSpaceOnUse" x1="0" y1="40" x2="0" y2="360">
            <stop offset="0" stopColor="#fff" stopOpacity={isDark ? 0.1 : 0.18} /><stop offset="1" stopColor="#000" stopOpacity={isDark ? 0.25 : 0.12} />
          </linearGradient>
          <linearGradient id={`${uid}cyl`} gradientUnits="userSpaceOnUse" x1={b.x} y1="0" x2={b.x + b.w} y2="0">
            <stop offset="0" stopColor="#000" stopOpacity=".45" /><stop offset=".22" stopColor="#fff" stopOpacity=".1" />
            <stop offset=".3" stopColor="#fff" stopOpacity=".65" /><stop offset=".38" stopColor="#fff" stopOpacity=".05" />
            <stop offset=".8" stopColor="#000" stopOpacity=".15" /><stop offset="1" stopColor="#000" stopOpacity=".5" />
          </linearGradient>
          <linearGradient id={`${uid}sw`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset=".5" stopColor="#fff" stopOpacity=".5" /><stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <filter id={`${uid}b2`} x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2" /></filter>
          <filter id={`${uid}b4`} x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="4" /></filter>
          <filter id={`${uid}b8`} x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="8" /></filter>
          <mask id={`${uid}m`} maskUnits="userSpaceOnUse" x="-60" y="-100" width="520" height="520">
            {sil('#fff')}
            {pos && <circle cx={pos.x} cy={pos.y} r="11" fill="#000" />}
          </mask>
        </defs>

        {/* contact shadow */}
        <ellipse cx="212" cy="384" rx="135" ry="11" fill="#1a2a55" opacity=".2" filter={`url(#${uid}b8)`} />

        {/* jump ring goes through the hole (drawn behind the piece) */}
        {pos && kind !== 'bookmark' && <circle cx={pos.x} cy={pos.y - 28} r="30" fill="none" stroke={`url(#${uid}metal)`} strokeWidth="4.5" />}
        {pos && kind === 'bookmark' && <Tassel pos={pos} uid={uid} hex={charmHex} />}

        <g transform={rot}>
          {/* thickness */}
          {layers.map((l, i) => (
            <g key={i} transform={`translate(${l.dx.toFixed(1)} ${l.dy.toFixed(1)})`}>
              <rect x="-60" y="-100" width="520" height="520" fill={l.fill} mask={M} opacity={isClear ? 0.45 : 1} />
            </g>
          ))}

          {/* front face */}
          <g mask={M}>
            <rect x="-60" y="-100" width="520" height="520" fill={base} opacity={isClear ? 0.35 : 1} />
            <rect x="-60" y="-100" width="520" height="520" fill={`url(#${uid}tint)`} />
            <GlitterLayer glitter={g} placement={placement} y0={y0} y1={y1} uid={uid} />
            {kind === 'pen' ? (
              <rect x="-60" y="-100" width="520" height="520" fill={`url(#${uid}cyl)`} />
            ) : (
              <>
                {/* domed edge: shade bottom-right, light top-left */}
                <g filter={`url(#${uid}b8)`} transform="translate(-7 -8)">{edge('#000', 26, isDark ? 0.7 : 0.38)}</g>
                <g filter={`url(#${uid}b4)`} transform="translate(5 6)">{edge('#fff', 12, isDark ? 0.4 : 0.75)}</g>
              </>
            )}
            {/* studio reflections */}
            <ellipse cx="120" cy="130" rx="130" ry="30" transform="rotate(-32 120 130)" fill="#fff" opacity={isDark ? 0.14 : 0.2} filter={`url(#${uid}b8)`} />
            <path d="M40 300 Q 150 250 330 40" fill="none" stroke="#fff" strokeOpacity={isDark ? 0.12 : 0.16} strokeWidth="14" filter={`url(#${uid}b4)`} />
            <g className="pv-sweep"><rect x="0" y="-60" width="70" height="520" fill={`url(#${uid}sw)`} /></g>
            {kind !== 'pen' && <g transform="translate(1.5 1.5)" filter={`url(#${uid}b2)`}>{edge('#fff', 3, isDark ? 0.55 : 0.8)}</g>}
          </g>

          {kind === 'pen' && (
            <g>
              <rect x={b.x + 3} y={b.y + b.h - 6} width={b.w - 6} height="12" rx="3" fill={`url(#${uid}gold)`} />
              <path d={`M${b.x + 4} ${b.y + b.h + 6} L${b.x + b.w - 4} ${b.y + b.h + 6} L${b.x + b.w - 20} ${b.y + b.h + 46} L${b.x + 20} ${b.y + b.h + 46} Z`} fill={`url(#${uid}silver)`} />
              <path d={`M${b.x + 20} ${b.y + b.h + 46} L${b.x + b.w - 20} ${b.y + b.h + 46} L200 ${b.y + b.h + 74} Z`} fill="#2a2a33" />
              <rect x={b.x + 2} y={b.y - 40} width={b.w - 4} height="52" rx="12" fill={`url(#${uid}gold)`} />
              <rect x={b.x + b.w - 8} y={b.y - 34} width="10" height="96" rx="5" fill={`url(#${uid}gold)`} stroke="#8F6B2C" strokeOpacity=".4" />
              <rect x={b.x + 8} y={b.y - 34} width="10" height="40" rx="5" fill="#fff" opacity=".35" />
            </g>
          )}
        </g>

        {pos && kind !== 'bookmark' && <Chain pos={pos} uid={uid} />}
      </svg>
    </div>
  );
}
