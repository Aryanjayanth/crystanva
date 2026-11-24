import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { categories, reviews } from '../data';
import { renderKey } from './ItemImage.jsx';

// Dev-only tool: open http://localhost:5173/#render while `npm run dev` is running.
// It renders every collection card + review piece with the real 3D model and saves
// them to public/renders/*.webp, so the home page shows photo-real images without running 3D.
const Resin3D = lazy(() => import('./Resin3D.jsx'));

const items = [
  ...categories.map((c) => ({ kind: c.kind, ...c.sample })),
  ...reviews.map((r) => r.item),
].map((it) => ({ placement: 'top', ...it }));
const unique = [...new Map(items.map((it) => [renderKey(it), it])).values()];

export default function RenderStudio() {
  const [i, setI] = useState(0);
  const [log, setLog] = useState([]);
  const [tick, setTick] = useState(0);
  const box = useRef();

  useEffect(() => {
    if (i >= unique.length) return;
    const t = setTimeout(async () => {
      const canvas = box.current?.querySelector('canvas');
      // not ready yet (font still loading / canvas not sized): try again shortly
      if (!canvas || canvas.width < 600) { setLog((l) => [...l, `… waiting for ${renderKey(unique[i])}`]); setI((n) => n); setTick((t) => t + 1); return; }
      const data = canvas.toDataURL('image/webp', 0.9);
      const res = await fetch('/__render', { method: 'POST', body: JSON.stringify({ key: renderKey(unique[i]), data }) });
      setLog((l) => [...l, `${res.ok ? '✓' : '✗'} ${renderKey(unique[i])}`]);
      setI(i + 1);
    }, 3000);
    return () => clearTimeout(t);
  }, [i, tick]);

  return (
    <div style={{ padding: 30, fontFamily: 'monospace' }}>
      <h2>Render studio — {Math.min(i, unique.length)}/{unique.length}{i >= unique.length ? ' · done, reload the site' : ''}</h2>
      {i < unique.length && (
        <div ref={box} style={{ width: 640, height: 640 }}>
          <Suspense fallback={null}><Resin3D key={i} {...unique[i]} still interactive={false} capture /></Suspense>
        </div>
      )}
      <pre>{log.join('\n')}</pre>
    </div>
  );
}
