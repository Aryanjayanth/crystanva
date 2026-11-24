import rendered from '../renders.json';
import Preview from './Preview.jsx';

// Pre-rendered photo-real image of a piece (made once from the 3D model — see RenderStudio).
// Costs nothing at runtime. Falls back to the lightweight drawing if no image exists yet.
export const renderKey = ({ kind, value, color, glitter, placement = 'top' }) =>
  [kind, value, color, glitter, placement].join('_').replace(/[^a-zA-Z0-9_-]/g, '');

const available = new Set(rendered);

export default function ItemImage(props) {
  const key = renderKey(props);
  if (available.has(key)) {
    return <img className="item-img" src={`/renders/${key}.webp`} alt="" loading="lazy" decoding="async" draggable="false" />;
  }
  return <Preview {...props} float={false} />;
}
