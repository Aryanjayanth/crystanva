import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TTFLoader } from 'three/examples/jsm/loaders/TTFLoader.js';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import fallbackJson from 'three/examples/fonts/helvetiker_bold.typeface.json';
import moldFontUrl from '@fontsource/archivo-black/files/archivo-black-latin-400-normal.woff?url';
import { colors, glitters, shapes as shapeList, plates, bookmarkShape } from '../data';

/* A real-time 3D resin piece:
   coloured core + clear resin shell (refraction, domed bevel, clear-coat)
   + thousands of metallic glitter flakes suspended between them
   + metal jump ring through the drilled hole, chain and split ring. */

// Archivo Black: thick block letters like the alphabet molds. Loaded once; React waits (Suspense) until ready.
let moldFont = null;
const fontPromise = fetch(moldFontUrl)
  .then((r) => r.arrayBuffer())
  .then((buf) => { moldFont = new FontLoader().parse(new TTFLoader().parse(buf)); })
  .catch(() => { moldFont = new FontLoader().parse(fallbackJson); });
function useMoldFont() {
  if (!moldFont) throw fontPromise;
  return moldFont;
}
const V2 = THREE.Vector2;
const IS_SMALL = typeof window !== 'undefined' && window.matchMedia('(max-width: 700px)').matches;
// phones & low-power devices: skip the costly refraction pass and render at a lower pixel ratio
const LITE = IS_SMALL || (typeof navigator !== 'undefined' && (navigator.hardwareConcurrency || 8) <= 4);

/* ---------- geometry helpers ---------- */
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

function inPoly(p, poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) c = !c;
  }
  return c;
}
// bounding boxes let us skip most polygon tests (big speed-up for glitter + hole placement)
const inBox = (p, b, pad = 0) => p.x >= b.minX - pad && p.x <= b.maxX + pad && p.y >= b.minY - pad && p.y <= b.maxY + pad;
const inside = (p, contours) => contours.some((c) => inBox(p, c.bb) && inPoly(p, c.outer) && !c.holes.some((h) => inPoly(p, h)));
function segDist2(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, l = dx * dx + dy * dy;
  let t = l ? ((p.x - a.x) * dx + (p.y - a.y) * dy) / l : 0;
  t = Math.max(0, Math.min(1, t));
  const x = a.x + t * dx - p.x, y = a.y + t * dy - p.y;
  return x * x + y * y;
}
// true if no edge is closer than `need` (stops at the first edge that is too close)
function clearOf(p, contours, need) {
  const n2 = need * need;
  for (const c of contours) {
    if (!inBox(p, c.bb, need)) continue;
    for (const poly of [c.outer, ...c.holes])
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) if (segDist2(p, poly[j], poly[i]) < n2) return false;
  }
  return true;
}
const boxOf = (pts) => ({
  minX: Math.min(...pts.map((p) => p.x)), maxX: Math.max(...pts.map((p) => p.x)),
  minY: Math.min(...pts.map((p) => p.y)), maxY: Math.max(...pts.map((p) => p.y)),
});

function rawShapes(kind, value, font) {
  if (kind === 'letter') return { shapes: font.generateShapes(value, 1), flip: false };
  const d = kind === 'shape' ? (shapeList.find((s) => s.id === value) ?? shapeList[0]).d
    : kind === 'plate' ? (plates.find((s) => s.id === value) ?? plates[0]).d
    : bookmarkShape;
  const data = new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${d}"/></svg>`);
  return { shapes: data.paths.flatMap((p) => SVGLoader.createShapes(p)), flip: true };
}

const DIMS = {
  thick: { D: 0.12, bt: 0.035, bs: 0.02, cd: 0.065, r: 0.062 },
  thin: { D: 0.075, bt: 0.025, bs: 0.014, cd: 0.045, r: 0.08 },
  plate: { D: 0.1, bt: 0.04, bs: 0.03, cd: 0.05, r: 0 },
};

function buildPiece(kind, value, font) {
  const { shapes, flip } = rawShapes(kind, value, font);
  let contours = shapes.map((s) => {
    const { shape, holes } = s.extractPoints(12);
    const f = (p) => new V2(p.x, flip ? -p.y : p.y);
    return { outer: shape.map(f), holes: holes.map((h) => h.map(f)) };
  });
  const all = contours.flatMap((c) => c.outer);
  const minX = Math.min(...all.map((p) => p.x)), maxX = Math.max(...all.map((p) => p.x));
  const minY = Math.min(...all.map((p) => p.y)), maxY = Math.max(...all.map((p) => p.y));
  const target = kind === 'bookmark' ? 1.75 : kind === 'plate' ? 2.4 : 1.45;
  const s = kind === 'letter' ? target / (maxY - minY) : target / Math.max(maxX - minX, maxY - minY);
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  const tf = (p) => new V2((p.x - cx) * s, (p.y - cy) * s);
  contours = contours.map((c) => { const outer = c.outer.map(tf); return { outer, holes: c.holes.map((h) => h.map(tf)), bb: boxOf(outer) }; });
  const bbox = { minX: (minX - cx) * s, maxX: (maxX - cx) * s, minY: (minY - cy) * s, maxY: (maxY - cy) * s };
  const dims = kind === 'bookmark' ? DIMS.thin : kind === 'plate' ? DIMS.plate : DIMS.thick;

  // drill the keyring hole: highest spot near the centre with enough material around it
  // thin strokes (I, J, L, T…) get a smaller hole and a thinner wall
  let hole = null;
  const xs = [];
  for (let x = bbox.minX; x <= bbox.maxX; x += 0.015) xs.push(x);
  xs.sort((a, b) => Math.abs(a) - Math.abs(b));
  const p = new V2();
  for (const [r, m] of kind === 'plate' ? [] : [[dims.r, 0.045], [dims.r * 0.85, 0.036], [dims.r * 0.72, 0.03]]) {
    const need = r + m;
    search: for (let y = bbox.maxY - need; y > bbox.maxY - 0.75; y -= 0.012) {
      for (const x of xs) {
        p.set(x, y);
        if (inside(p, contours) && clearOf(p, contours, need)) { hole = { x, y, r, m }; break search; }
      }
    }
    if (hole) break;
  }

  const three = contours.map((c) => {
    const sh = new THREE.Shape(c.outer);
    c.holes.forEach((h) => sh.holes.push(new THREE.Path(h)));
    return sh;
  });
  if (hole) {
    const i = contours.findIndex((c) => inPoly(new V2(hole.x, hole.y), c.outer));
    if (i >= 0) three[i].holes.push(new THREE.Path().absarc(hole.x, hole.y, hole.r, 0, Math.PI * 2, true));
  }

  const shell = new THREE.ExtrudeGeometry(three, { depth: dims.D, bevelEnabled: true, bevelThickness: dims.bt, bevelSize: dims.bs, bevelSegments: 6, curveSegments: 28 });
  shell.translate(0, 0, -dims.D / 2);
  const core = new THREE.ExtrudeGeometry(three, { depth: dims.cd, bevelEnabled: false, curveSegments: 28 });
  core.translate(0, 0, -dims.cd / 2);
  return { shell, core, contours, bbox, hole, dims };
}

// Built pieces and glitter are cached, so switching back to a letter/colour is instant.
const pieceCache = new Map();
function getPiece(kind, value, font) {
  const key = `${kind}|${value}`;
  if (!pieceCache.has(key)) pieceCache.set(key, buildPiece(kind, value, font));
  return pieceCache.get(key);
}
const flakeCache = new Map();
function getFlakes(kind, value, piece, glitter, placement, clear = false) {
  if (!glitter || glitter.kind === 'none') return null;
  const key = `${kind}|${value}|${glitter.id}|${placement}|${clear}`;
  if (!flakeCache.has(key)) flakeCache.set(key, kind === 'pen' ? makePenFlakes(glitter, placement, clear) : makeFlakes(piece, glitter, placement, clear));
  return flakeCache.get(key);
}
// warm the cache in idle time (e.g. the hero's next colour/glitter combos) so changes never stutter
const idle = (fn) => (window.requestIdleCallback ? window.requestIdleCallback(fn, { timeout: 2000 }) : setTimeout(fn, 200));
export function prewarm(list) {
  if (!moldFont) { fontPromise.then(() => prewarm(list)); return; }
  const queue = [...list];
  const next = () => {
    const it = queue.shift();
    if (!it) return;
    const piece = it.kind === 'pen' ? null : getPiece(it.kind, it.value, moldFont);
    getFlakes(it.kind, it.value, piece, glitters.find((g) => g.id === it.glitter), it.placement || 'top', colors.find((c) => c.id === it.color)?.clear);
    idle(next);
  };
  idle(next);
}

/* ---------- glitter flakes ---------- */
const HEX_GEO = new THREE.CircleGeometry(1, 6);
const FOIL_GEO = (() => {
  const r = rng(99), pts = [];
  for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2 + r() * 0.5; const rr = 0.6 + r() * 0.5; pts.push(new V2(Math.cos(a) * rr, Math.sin(a) * rr)); }
  return new THREE.ShapeGeometry(new THREE.Shape(pts));
})();

function densityAt(t, placement) {
  if (placement === 'top') return Math.pow(t, 1.6);
  if (placement === 'bottom') return Math.pow(1 - t, 1.6);
  return 0.6;
}
// draw a height (0..1) already distributed like the glitter settles — no wasted samples
function sampleT(u, placement) {
  if (placement === 'top') return Math.pow(u, 1 / 2.6);
  if (placement === 'bottom') return 1 - Math.pow(u, 1 / 2.6);
  return u;
}

function flakeData(points, glitter, r) {
  const foil = glitter.kind === 'foil';
  const base = new THREE.Color(glitter.hex);
  const white = new THREE.Color('#fff8e6');
  const dummy = new THREE.Object3D();
  const matrices = [], cols = [];
  for (const p of points) {
    dummy.position.set(p.x, p.y, p.z);
    if (foil) {
      dummy.rotation.set((r() - 0.5) * 0.8, (r() - 0.5) * 0.8, r() * Math.PI * 2);
      const s = 0.028 + r() * 0.05;
      dummy.scale.set(s, s * (0.5 + r() * 0.6), 1);
    } else {
      dummy.rotation.set(r() * Math.PI * 2, r() * Math.PI * 2, r() * Math.PI * 2);
      dummy.scale.setScalar(0.008 + r() * 0.01);
    }
    if (p.rot) dummy.rotation.y += p.rot;
    dummy.updateMatrix();
    matrices.push(dummy.matrix.clone());
    const c = base.clone();
    if (r() > 0.3) c.lerp(white, r() * 0.45); else c.multiplyScalar(0.65 + r() * 0.3);
    cols.push(c);
  }
  return { matrices, cols, count: points.length, foil, id: `${glitter.id}-${points.length}-${r()}` };
}

function makeFlakes(piece, glitter, placement, clear) {
  if (!piece || !glitter || glitter.kind === 'none') return null;
  const r = rng(hashStr(glitter.id + placement));
  const N = glitter.kind === 'foil' ? 320 : IS_SMALL ? 1300 : 2200;
  const { contours, bbox, hole, dims } = piece;
  const z0 = dims.cd / 2 + 0.006, z1 = dims.D / 2 + dims.bt * 0.6;
  const pts = [];
  const v = new V2();
  for (let tries = 0; pts.length < N && tries < N * 6; tries++) {
    const t = r() < 0.03 ? r() : sampleT(r(), placement); // a few strays everywhere, like a real pour
    const x = bbox.minX + r() * (bbox.maxX - bbox.minX), y = bbox.minY + t * (bbox.maxY - bbox.minY);
    if (!inside(v.set(x, y), contours)) continue;
    if (hole && Math.hypot(x - hole.x, y - hole.y) < hole.r + 0.035) continue;
    // coloured resin: glitter sits in the clear layer over the colour; clear resin: all the way through
    pts.push({ x, y, z: clear ? (r() * 2 - 1) * z1 : (z0 + r() * (z1 - z0)) * (r() < 0.55 ? 1 : -1) });
  }
  return flakeData(pts, glitter, r);
}

const PEN = { core: 0.12, shell: 0.15, len: 1.2 };
function makePenFlakes(glitter, placement, clear) {
  if (!glitter || glitter.kind === 'none') return null;
  const r = rng(hashStr('pen' + glitter.id + placement));
  const N = glitter.kind === 'foil' ? 240 : IS_SMALL ? 1000 : 1600;
  const pts = [];
  for (let tries = 0; pts.length < N && tries < N * 2; tries++) {
    const t = r() < 0.03 ? r() : sampleT(r(), placement);
    const y = (t - 0.5) * (PEN.len - 0.06);
    const a = r() * Math.PI * 2, rad = clear ? 0.02 + Math.sqrt(r()) * (PEN.shell - 0.036) : PEN.core + 0.006 + r() * (PEN.shell - PEN.core - 0.014);
    pts.push({ x: Math.cos(a) * rad, y, z: Math.sin(a) * rad, rot: -a + Math.PI / 2 });
  }
  return flakeData(pts, glitter, r);
}

function Flakes({ data }) {
  const ref = useRef();
  // phones render tiny flakes at low resolution, where pure mirror-metal averages out dark —
  // a softer, partly-diffuse metal keeps the glitter as light and golden as on a computer
  const mat = useMemo(() => new THREE.MeshStandardMaterial(LITE
    ? { metalness: 0.55, roughness: 0.32, side: THREE.DoubleSide, envMapIntensity: 2.3 }
    : { metalness: 1, roughness: 0.22, side: THREE.DoubleSide, envMapIntensity: 1.8 }), []);
  useLayoutEffect(() => {
    if (!data || !ref.current) return;
    const m = ref.current;
    data.matrices.forEach((mx, i) => { m.setMatrixAt(i, mx); m.setColorAt(i, data.cols[i]); });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [data]);
  if (!data || !data.count) return null;
  mat.roughness = LITE ? (data.foil ? 0.36 : 0.32) : data.foil ? 0.3 : 0.2;
  return <instancedMesh key={data.id} ref={ref} args={[data.foil ? FOIL_GEO : HEX_GEO, mat, data.count]} />;
}

/* ---------- materials ---------- */
function useMaterials(base, clear = false) {
  const m = useMemo(() => ({
    shell: LITE
      ? new THREE.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: 0.22, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.5, depthWrite: false })
      : new THREE.MeshPhysicalMaterial({
        color: '#ffffff', transmission: 1, thickness: 0.35, roughness: 0.03, ior: 1.52,
        clearcoat: 1, clearcoatRoughness: 0.03, specularIntensity: 1, envMapIntensity: 1.25,
      }),
    // a pen barrel is a thin coat over the core: low refraction so the glitter isn't distorted into stripes
    penShell: LITE
      ? new THREE.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: 0.2, roughness: 0.04, clearcoat: 1, envMapIntensity: 1.4, depthWrite: false })
      : new THREE.MeshPhysicalMaterial({
      color: '#ffffff', transmission: 1, thickness: 0.04, roughness: 0.04, ior: 1.2,
      clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.1,
    }),
    // Crystal Clear: truly see-through glossy resin (refraction would turn it milky against the light page)
    clearShell: new THREE.MeshPhysicalMaterial({ color: '#f2fbfb', transparent: true, opacity: 0.16, roughness: 0.02, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.02, specularIntensity: 1, envMapIntensity: 1.8, depthWrite: false }),
    core: new THREE.MeshPhysicalMaterial({ roughness: 0.32, clearcoat: 0.4, envMapIntensity: 0.9 }),
    metal: new THREE.MeshStandardMaterial({ color: '#e8ebef', metalness: 1, roughness: 0.12, envMapIntensity: 1.4 }),
    gold: new THREE.MeshStandardMaterial({ color: '#d9b25a', metalness: 1, roughness: 0.18, envMapIntensity: 1.3 }),
    nib: new THREE.MeshStandardMaterial({ color: '#2a2a30', metalness: 0.8, roughness: 0.3 }),
    cord: new THREE.MeshStandardMaterial({ color: '#1d2b55', roughness: 0.6 }),
  }), []);
  useEffect(() => {
    m.core.color.set(base);
    const lum = m.core.color.getHSL({}).l;
    m.core.roughness = lum < 0.2 ? 0.18 : 0.32; // dark resin reads glossier
    // phones (no refraction pass): make clear resin a touch more visible so the piece doesn't vanish
    m.clearShell.opacity = LITE ? 0.3 : 0.26;
  }, [base, clear, m]);
  useEffect(() => () => Object.values(m).forEach((x) => x.dispose()), [m]);
  return m;
}

/* ---------- keyring hardware ---------- */
function KeyRing({ piece, mat }) {
  const { hole, dims } = piece;
  const T = dims.D / 2 + dims.bt;
  const bridge = hole.m + dims.bs;
  const R = Math.sqrt(T * T + (bridge / 2) ** 2) + 0.035;
  // Like the mold: a small pin hole just under the top edge. The jump ring wraps the thin
  // bridge of resin above the hole, and the chain + split ring hang straight up from it.
  const cy = hole.y + hole.r + bridge / 2;
  const Ry = Math.min(R, cy - hole.y + hole.r * 0.7); // keep the ring's bottom inside the hole
  const top = cy + Ry;
  const n = 3, step = 0.1;
  const ringR = 0.25;
  const ringY = top + 0.05 + (n - 1) * step + 0.07 + ringR;
  return (
    <group>
      <mesh position={[hole.x, cy, 0]} rotation={[0, Math.PI / 2, 0]} scale={[1, Ry / R, 1]} material={mat.metal}>
        <torusGeometry args={[R, 0.013, 18, 72]} />
      </mesh>
      {Array.from({ length: n }, (_, i) => (
        <group key={i} position={[hole.x, top + 0.05 + i * step, 0]} rotation={[0, i % 2 ? 0 : Math.PI / 2, Math.PI / 2]}>
          <mesh scale={[1.6, 1, 1]} material={mat.metal}>
            <torusGeometry args={[0.04, 0.01, 12, 28]} />
          </mesh>
        </group>
      ))}
      {/* split ring: two coils, turned slightly so it reads as 3D */}
      <group position={[hole.x, ringY, 0]} rotation={[0, 0.55, 0]}>
        <mesh position={[0, 0, 0.012]} material={mat.metal}><torusGeometry args={[ringR, 0.015, 18, 110]} /></mesh>
        <mesh position={[0, 0, -0.012]} material={mat.metal}><torusGeometry args={[ringR, 0.015, 18, 110]} /></mesh>
      </group>
    </group>
  );
}

function Tassel({ piece, mat, hex }) {
  const { hole, dims, bbox } = piece;
  const T = dims.D / 2 + dims.bt;
  const top = hole.y + hole.r + 0.06;
  const knot = new THREE.Vector3(bbox.maxX + 0.2, top + 0.02, 0.06);
  // silky cord: through the hole, over the top edge, out to the knot
  const cordGeo = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(hole.x, hole.y - hole.r * 0.3, -T - 0.03),
      new THREE.Vector3(hole.x, top + 0.08, -0.02),
      new THREE.Vector3(hole.x, hole.y - hole.r * 0.3, T + 0.03),
      new THREE.Vector3(hole.x + 0.08, top + 0.02, T + 0.06),
      new THREE.Vector3((hole.x + knot.x) / 2, top + 0.14, 0.08),
      knot,
    ]);
    return new THREE.TubeGeometry(curve, 80, 0.016, 10, false);
  }, [hole, T, top, knot.x]);
  const strands = useMemo(() => [hex, new THREE.Color(hex).multiplyScalar(0.7).getStyle()].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, metalness: 0.25 })), [hex]);
  useEffect(() => () => { strands.forEach((s) => s.dispose()); cordGeo.dispose(); }, [strands, cordGeo]);
  const L = 0.62;
  return (
    <group>
      <mesh geometry={cordGeo} material={mat.cord} />
      <mesh position={knot} material={mat.gold}><sphereGeometry args={[0.055, 24, 16]} /></mesh>
      <mesh position={[knot.x, knot.y - 0.07, knot.z]} material={mat.gold}><cylinderGeometry args={[0.04, 0.05, 0.06, 24]} /></mesh>
      {Array.from({ length: 18 }, (_, i) => {
        const a = ((i % 6) - 2.5) * 0.075;
        const zz = (Math.floor(i / 6) - 1) * 0.03;
        return (
          <mesh key={i} position={[knot.x + Math.sin(-a) * L * 0.5, knot.y - 0.1 - L / 2, knot.z + zz]} rotation={[0, 0, a]} material={strands[i % 2]}>
            <cylinderGeometry args={[0.009, 0.007, L - (i % 3) * 0.04, 6]} />
          </mesh>
        );
      })}
    </group>
  );
}

/* ---------- the piece ---------- */
function Piece({ kind, value, color, glitter, placement, font, still }) {
  const col = colors.find((c) => c.id === color);
  const base = col?.hex ?? '#ffffff';
  const clear = Boolean(col?.clear);
  const g = glitters.find((x) => x.id === glitter);
  const mat = useMaterials(base, clear);
  const piece = useMemo(() => (kind === 'pen' ? null : getPiece(kind, value, font)), [kind, value, font]);
  const flakes = useMemo(() => getFlakes(kind, value, piece, g, placement, clear), [kind, value, piece, g, placement, clear]);

  const group = useRef();
  const pop = useRef(0);
  const { invalidate } = useThree();
  useEffect(() => { pop.current = 0; }, [kind, value]);
  // still mode (collection cards): one nicely angled frame, no animation loop
  useLayoutEffect(() => {
    if (!still || !group.current) return;
    group.current.scale.setScalar(1);
    group.current.rotation.set(0, -0.32, 0);
    invalidate();
  }, [still, piece, flakes, invalidate]);
  useFrame((state, dt) => {
    if (still) return;
    const t = state.clock.elapsedTime;
    pop.current = Math.min(1, pop.current + dt * 2.2);
    const e = 1 - Math.pow(1 - pop.current, 3);
    group.current.scale.setScalar(0.75 + 0.25 * e);
    group.current.rotation.y = Math.sin(t * 0.55) * 0.42 + (1 - e) * -0.8;
    group.current.rotation.x = Math.sin(t * 0.35) * 0.05;
  });

  if (kind === 'pen') {
    const half = PEN.len / 2;
    return (
      <group ref={group}>
        <group rotation={[0, 0, -0.62]} scale={1.3}>
          {!clear && <mesh material={mat.core}><cylinderGeometry args={[PEN.core, PEN.core, PEN.len - 0.02, 48]} /></mesh>}
          <Flakes data={flakes} />
          <mesh material={clear ? mat.clearShell : mat.penShell}><cylinderGeometry args={[PEN.shell, PEN.shell, PEN.len, 64]} /></mesh>
          <mesh position={[0, -half - 0.02, 0]} material={mat.gold}><cylinderGeometry args={[0.153, 0.153, 0.05, 48]} /></mesh>
          <mesh position={[0, -half - 0.17, 0]} material={mat.metal}><cylinderGeometry args={[0.15, 0.065, 0.26, 48]} /></mesh>
          <mesh position={[0, -half - 0.34, 0]} material={mat.nib}><cylinderGeometry args={[0.065, 0.004, 0.09, 24]} /></mesh>
          <mesh position={[0, half + 0.17, 0]} material={mat.gold}><cylinderGeometry args={[0.16, 0.16, 0.34, 48]} /></mesh>
          <mesh position={[0, half + 0.36, 0]} material={mat.gold}><sphereGeometry args={[0.16, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
          <mesh position={[0.175, half + 0.05, 0]} material={mat.gold}><boxGeometry args={[0.035, 0.5, 0.05]} /></mesh>
        </group>
      </group>
    );
  }

  return (
    <group ref={group}>
      {/* coasters / platters are shown lying back a little so you see the poured surface */}
      <group rotation={[kind === 'plate' ? -0.75 : 0, 0, 0]}>
        {!clear && <mesh geometry={piece.core} material={mat.core} />}
        <Flakes data={flakes} />
        <mesh geometry={piece.shell} material={clear ? mat.clearShell : mat.shell} />
        {piece.hole && (kind === 'bookmark'
          ? <Tassel piece={piece} mat={mat} hex={g && g.kind !== 'none' ? g.hex : '#c9a45c'} />
          : <KeyRing piece={piece} mat={mat} />)}
      </group>
    </group>
  );
}

function Env() {
  const { gl, scene, invalidate } = useThree();
  useEffect(() => {
    const pm = new THREE.PMREMGenerator(gl);
    const env = pm.fromScene(new RoomEnvironment(), 0.035).texture;
    scene.environment = env;
    invalidate();
    return () => { scene.environment = null; env.dispose(); pm.dispose(); };
  }, [gl, scene, invalidate]);
  return null;
}

// still = render one frame only (cheap, for the collection cards); interactive = drag to rotate
// Soft shadow under the piece: one blurred texture, instead of re-rendering a shadow every frame.
let shadowTex = null;
function Shadow() {
  if (!shadowTex) {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(20,30,70,0.42)'); g.addColorStop(0.55, 'rgba(20,30,70,0.14)'); g.addColorStop(1, 'rgba(20,30,70,0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    shadowTex = new THREE.CanvasTexture(c);
  }
  return (
    <mesh position={[0, -1.28, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[2.6, 1.3, 1]}>
      <planeGeometry args={[1.4, 1.4]} />
      <meshBasicMaterial map={shadowTex} transparent depthWrite={false} />
    </mesh>
  );
}

// still = render one frame only (cheap); interactive = drag to rotate; capture = allow saving the image
export default function Resin3D({ kind = 'letter', value = 'J', color = 'pink', glitter = 'gold-foil', placement = 'top', className = '', still = false, interactive = true, capture = false, warm }) {
  const font = useMoldFont();
  const lift = kind === 'pen' || kind === 'plate' ? 0 : -0.38;
  const box = useRef();
  const [visible, setVisible] = useState(true);

  // stop drawing when scrolled out of view — the page stays smooth while you scroll
  useEffect(() => {
    if (still || !box.current) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: '100px' });
    io.observe(box.current);
    return () => io.disconnect();
  }, [still]);
  useEffect(() => { if (warm?.length) prewarm(warm); }, [warm]);

  return (
    <div ref={box} className={`r3d ${interactive ? '' : 'r3d-static'} ${className}`}>
      <Canvas
        frameloop={still ? 'demand' : visible ? 'always' : 'never'}
        dpr={capture ? 2 : LITE ? [1, 1.3] : [1, 1.5]}
        camera={{ position: [0, 0, 5.9], fov: 32 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: capture }}
      >
        <Env />
        <ambientLight intensity={0.25} />
        <directionalLight position={[3, 4, 5]} intensity={1.5} />
        <directionalLight position={[-4, 1.5, -3]} intensity={0.6} />
        <group position={[0, lift, 0]}>
          <Piece kind={kind} value={value} color={color} glitter={glitter} placement={placement} font={font} still={still} />
        </group>
        <Shadow />
        {interactive && <OrbitControls enablePan={false} enableZoom={false} enableDamping minPolarAngle={Math.PI / 2 - 0.45} maxPolarAngle={Math.PI / 2 + 0.25} />}
      </Canvas>
    </div>
  );
}
