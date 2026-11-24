import { Component, lazy, Suspense } from 'react';
import Preview from './Preview.jsx';

// Shows the live 3D model; falls back to the 2D drawing while loading,
// or if the device can't do WebGL.
const load3D = () => import('./Resin3D.jsx');
const Resin3D = lazy(load3D);
// start downloading the 3D engine early (during the intro) so it's ready when needed
export const preload3D = () => { load3D().catch(() => {}); };

const hasWebGL = (() => {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
})();

class Boundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

export default function Resin(props) {
  const fallback = <Preview {...props} float={false} />;
  if (!hasWebGL) return fallback;
  return (
    <Boundary fallback={fallback}>
      <Suspense fallback={fallback}><Resin3D {...props} /></Suspense>
    </Boundary>
  );
}
