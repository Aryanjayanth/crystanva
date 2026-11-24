// ─────────────────────────────────────────────────────────────
//  Everything you might want to edit lives in this file.
//  • price        – set on each collection below (and optionally per shape/plate)
//  • inStock      – set to false and the option shows as "sold out"
//  • reviews      – approved customer reviews (empty until you add real ones)
// ─────────────────────────────────────────────────────────────
// default price (₹) for anything without its own price
export const PRICE = 149;
// extra charge (₹) when the customer adds dried flowers (floral add-on)
export const FLORAL_PRICE = 0;

export const colors = [
  { id: 'white', name: 'Snow White', hex: '#F4F3EF', inStock: true },
  { id: 'clear', name: 'Crystal Clear', hex: '#EEF3F5', clear: true, inStock: true }, // no colour: see-through resin
  { id: 'peach', name: 'Peach Coral', hex: '#F28C70', inStock: true },
  { id: 'pink', name: 'Blush Pink', hex: '#F4A6C5', inStock: true },
  { id: 'champagne', name: 'Champagne', hex: '#E5D5BA', inStock: true },
  { id: 'pearl', name: 'Silver Pearl', hex: '#D9DBE3', inStock: true },
];

export const glitters = [
  { id: 'none', name: 'Plain (no glitter)', hex: '#ffffff', kind: 'none', inStock: true },
  { id: 'rosegold-foil', name: 'Rose Gold Foil', hex: '#E0957F', kind: 'foil', inStock: true },
  { id: 'gold-foil', name: 'Gold Foil', hex: '#D8B04B', kind: 'foil', inStock: true },
  { id: 'silver-foil', name: 'Silver Foil', hex: '#C9D0DB', kind: 'foil', inStock: true },
  { id: 'gold-glitter', name: 'Gold Glitter', hex: '#E2B63F', kind: 'glitter', inStock: true },
  { id: 'silver-glitter', name: 'Silver Glitter', hex: '#BFC4CE', kind: 'glitter', inStock: true },
  { id: 'purple-glitter', name: 'Purple Glitter', hex: '#8B3FB8', kind: 'glitter', inStock: true },
  { id: 'teal-glitter', name: 'Teal Glitter', hex: '#18A6A0', kind: 'glitter', inStock: true },
  { id: 'blue-glitter', name: 'Blue Glitter', hex: '#1E62CC', kind: 'glitter', inStock: true },
];

// 5-point star path helper
function starPath(cx, cy, R, r) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? R : r;
    pts.push(`${(cx + rad * Math.cos(a)).toFixed(1)} ${(cy + rad * Math.sin(a)).toFixed(1)}`);
  }
  return `M${pts.join(' L')} Z`;
}

// Small keychain shapes (from the little shapes mold)
export const shapes = [
  { id: 'circle', name: 'Circle', price: 89, d: 'M200 50 A150 150 0 1 1 199.9 50 Z', hole: [200, 92], inStock: true },
  { id: 'square', name: 'Square', price: 89, d: 'M90 60 H310 Q340 60 340 90 V310 Q340 340 310 340 H90 Q60 340 60 310 V90 Q60 60 90 60 Z', hole: [200, 102], inStock: true },
  { id: 'rectangle', name: 'Rectangle', price: 99, d: 'M125 30 H275 Q300 30 300 55 V345 Q300 370 275 370 H125 Q100 370 100 345 V55 Q100 30 125 30 Z', hole: [200, 72], inStock: true },
  { id: 'halfmoon', name: 'Half Moon', price: 49, d: 'M302 60 A150 150 0 1 0 302 340 A160 160 0 0 1 302 60 Z', hole: [168, 112], inStock: true },
  { id: 'diamond', name: 'Diamond', price: 49, d: 'M200 38 L342 200 L200 362 L58 200 Z', hole: [200, 112], inStock: true },
  // special: only in the two-sided Special Keychains collection
  { id: 'heart', name: 'Heart', price: 199, special: true, d: 'M200 350 C60 250 38 150 88 104 C135 62 192 84 200 130 C208 84 265 62 312 104 C362 150 340 250 200 350 Z', hole: [132, 126], inStock: true },
];

// Big moulds: coasters & platters (no keyring)
export const plates = [
  { id: 'hexagon', name: 'Hexagon Coaster', d: 'M50 200 L125 70 L275 70 L350 200 L275 330 L125 330 Z', inStock: true },
  { id: 'heart', name: 'Heart Platter', d: 'M200 350 C60 250 38 150 88 104 C135 62 192 84 200 130 C208 84 265 62 312 104 C362 150 340 250 200 350 Z', inStock: true },
];

export const bookmarkShape = 'M130 36 Q130 30 138 30 H262 Q270 30 270 36 V366 L200 322 L130 366 Z';
export const penBarrel = { x: 168, y: 92, w: 64, h: 186, r: 18 };

export const categories = [
  {
    id: 'personal',
    title: 'Personalized Keychains',
    blurb: 'Pick your letter, your colour, your sparkle.',
    tag: 'Most loved',
    kind: 'letter',
    price: 119,
    sample: { value: 'M', color: 'clear', glitter: 'gold-glitter' },
  },
  {
    id: 'special',
    title: 'Special Keychains',
    blurb: 'A heart you design on both sides — front and back.',
    tag: 'Both sides',
    kind: 'shape',
    twoSided: true,
    price: 199,
    sample: { value: 'heart', color: 'pink', glitter: 'gold-foil', back: { color: 'clear', glitter: 'silver-glitter', placement: 'top' } },
  },
  {
    id: 'shapes',
    title: 'Shaped Keychains',
    blurb: 'Circles, half moons, diamonds and more.',
    kind: 'shape',
    price: 89,
    sample: { value: 'halfmoon', color: 'pink', glitter: 'gold-foil' },
  },
  {
    id: 'pens',
    title: 'Resin Pens',
    blurb: 'Write with a little sparkle.',
    kind: 'pen',
    price: 149,
    sample: { value: 'pen', color: 'clear', glitter: 'gold-glitter' },
  },
];

// first letter of the customer's name (A–Z), or J if there isn't one
export const initialOf = (name = '') => {
  const ch = name.trim().charAt(0).toUpperCase();
  return /^[A-Z]$/.test(ch) ? ch : 'J';
};

export const defaultItem = (categoryId, name = '') => {
  const c = categories.find((x) => x.id === categoryId);
  return {
    category: categoryId,
    kind: c.kind,
    value: c.kind === 'letter' ? initialOf(name) : c.twoSided ? 'heart' : c.kind === 'shape' ? 'circle' : c.kind === 'plate' ? 'hexagon' : c.kind,
    ...(c.twoSided ? { back: { color: 'clear', glitter: 'silver-glitter', placement: 'top' } } : {}),
    color: 'pink',
    glitter: 'gold-foil',
    placement: 'top',
    floral: false,
  };
};

export const placements = [
  { id: 'top', name: 'Fade from top' },
  { id: 'all', name: 'All over' },
  { id: 'bottom', name: 'Fade from bottom' },
];

// Price of one piece: a shape/plate's own price if it has one, else its collection's price.
// e.g. give the Heart Platter its own price:  { id: 'heart', name: 'Heart Platter', price: 299, ... }
export const priceOf = (item) => {
  const own = item.kind === 'plate' ? plates.find((p) => p.id === item.value)?.price
    : item.kind === 'shape' ? shapes.find((p) => p.id === item.value)?.price : undefined;
  const base = own ?? categories.find((c) => c.id === item.category)?.price ?? PRICE;
  return base + (item.floral ? FLORAL_PRICE : 0);
};
// lowest price in a collection (for "from ₹…" on the cards)
export const fromPrice = (c) => {
  // special collections (e.g. the two-sided heart) only use their special shapes; others skip them
  const opts = c.kind === 'plate' ? plates : c.kind === 'shape' ? shapes.filter((x) => Boolean(x.special) === Boolean(c.twoSided)) : [];
  return Math.min(c.price ?? PRICE, ...opts.map((o) => o.price ?? c.price ?? PRICE));
};
export const lowestPrice = () => Math.min(...categories.map(fromPrice));

export const describe = (item) => {
  const c = categories.find((x) => x.id === item.category);
  const details = [];
  if (item.kind === 'letter') details.push({ label: 'Letter', value: item.value });
  if (item.kind === 'shape') details.push({ label: 'Shape', value: shapes.find((s) => s.id === item.value)?.name });
  if (item.kind === 'plate') details.push({ label: 'Shape', value: plates.find((s) => s.id === item.value)?.name });
  const side = (label, look) => {
    const lc = colors.find((x) => x.id === look.color);
    const lg = glitters.find((x) => x.id === look.glitter);
    details.push({ label: `${label}Colour`, value: lc?.name });
    details.push({ label: `${label}Glitter`, value: lg?.name });
    if (lg && lg.kind !== 'none') details.push({ label: `${label}Glitter style`, value: placements.find((p) => p.id === (look.placement || 'top'))?.name });
  };
  if (item.back) {
    side('Front · ', item);
    side('Back · ', item.back);
  } else {
    side('', item);
  }
  details.push({ label: 'Floral add-on', value: item.floral ? 'Yes — dried flowers' : 'No' });
  return { title: c.title, details };
};

// Approved customer reviews shown to everyone. Add real ones here when customers send them
// (they arrive in your Telegram), e.g.:
// { name: 'Ananya R.', rating: 5, text: 'Loved it!', item: { kind: 'letter', value: 'A', color: 'white', glitter: 'rosegold-foil' } },
export const reviews = [];
