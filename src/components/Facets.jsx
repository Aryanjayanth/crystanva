import { useMemo } from 'react';

// Low-poly "crystal facet" backdrop, echoing the faceted gem in the logo.
function rng(seed) {
  let a = seed;
  return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; };
}

export default function Facets({ dark = false, seed = 7, className = '' }) {
  const tris = useMemo(() => {
    const r = rng(seed), cols = 14, rows = 8, W = 1400, H = 800;
    const pts = [];
    for (let j = 0; j <= rows; j++) {
      const row = [];
      for (let i = 0; i <= cols; i++) {
        const edge = i === 0 || j === 0 || i === cols || j === rows;
        row.push([(i / cols) * W + (edge ? 0 : (r() - 0.5) * 70), (j / rows) * H + (edge ? 0 : (r() - 0.5) * 70)]);
      }
      pts.push(row);
    }
    const tints = dark ? ['#ffffff', '#7fd3d0', '#b28ad1', '#c9a45c'] : ['#2aa6a6', '#3a4a9e', '#5b2b6e', '#c9a45c'];
    const out = [];
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const a = pts[j][i], b = pts[j][i + 1], c = pts[j + 1][i], d = pts[j + 1][i + 1];
      const flip = r() > 0.5;
      const pair = flip ? [[a, b, d], [a, d, c]] : [[a, b, c], [b, d, c]];
      for (const t of pair) {
        out.push({ p: t.map((q) => q.map((n) => n.toFixed(1)).join(',')).join(' '), fill: tints[Math.floor(r() * tints.length)], o: (dark ? 0.015 : 0.02) + r() * (dark ? 0.05 : 0.07) });
      }
    }
    return out;
  }, [dark, seed]);

  return (
    <svg className={`facets ${className}`} viewBox="0 0 1400 800" preserveAspectRatio="xMidYMid slice" aria-hidden>
      {tris.map((t, i) => (
        <polygon key={i} points={t.p} fill={t.fill} fillOpacity={t.o} stroke="#c9a45c" strokeOpacity={dark ? 0.14 : 0.22} strokeWidth="0.7" />
      ))}
    </svg>
  );
}
