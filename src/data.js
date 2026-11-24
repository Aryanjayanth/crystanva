// ─────────────────────────────────────────────────────────────
//  Everything you might want to edit lives in this file.
//  • PRICE        – price of one item (₹)
//  • inStock      – set to false and the option shows as "sold out"
//  • reviews      – PLACEHOLDER testimonials: swap in real ones
// ─────────────────────────────────────────────────────────────
export const PRICE = 149;

export const colors = [
  { id: 'white', name: 'Snow White', hex: '#F4F3EF', inStock: true },
  { id: 'black', name: 'Midnight Black', hex: '#1B1B20', inStock: true },
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
  { id: 'circle', name: 'Circle', d: 'M200 50 A150 150 0 1 1 199.9 50 Z', hole: [200, 92], inStock: true },
  { id: 'square', name: 'Square', d: 'M90 60 H310 Q340 60 340 90 V310 Q340 340 310 340 H90 Q60 340 60 310 V90 Q60 60 90 60 Z', hole: [200, 102], inStock: true },
  { id: 'star', name: 'Star', d: starPath(200, 205, 165, 72), hole: [200, 112], inStock: true },
  { id: 'diamond', name: 'Diamond', d: 'M200 38 L342 200 L200 362 L58 200 Z', hole: [200, 112], inStock: true },
  { id: 'drop', name: 'Teardrop', d: 'M200 40 C272 140 332 200 332 255 C332 325 272 362 200 362 C128 362 68 325 68 255 C68 200 128 140 200 40 Z', hole: [200, 118], inStock: true },
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
    sample: { value: 'M', color: 'black', glitter: 'gold-glitter' },
  },
  {
    id: 'shapes',
    title: 'Shaped Keychains',
    blurb: 'Stars, drops, diamonds and more.',
    kind: 'shape',
    sample: { value: 'star', color: 'white', glitter: 'rosegold-foil' },
  },
  {
    id: 'pens',
    title: 'Resin Pens',
    blurb: 'Write with a little sparkle.',
    kind: 'pen',
    sample: { value: 'pen', color: 'black', glitter: 'gold-glitter' },
  },
  {
    id: 'plates',
    title: 'Coasters & Platters',
    blurb: 'Hexagon coasters and heart platters for your table.',
    kind: 'plate',
    sample: { value: 'hexagon', color: 'white', glitter: 'gold-foil' },
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
    value: c.kind === 'letter' ? initialOf(name) : c.kind === 'shape' ? 'star' : c.kind === 'plate' ? 'hexagon' : c.kind,
    color: 'pink',
    glitter: 'gold-foil',
    placement: 'top',
  };
};

export const placements = [
  { id: 'top', name: 'Fade from top' },
  { id: 'all', name: 'All over' },
  { id: 'bottom', name: 'Fade from bottom' },
];

export const describe = (item) => {
  const c = categories.find((x) => x.id === item.category);
  const col = colors.find((x) => x.id === item.color);
  const gl = glitters.find((x) => x.id === item.glitter);
  const details = [];
  if (item.kind === 'letter') details.push({ label: 'Letter', value: item.value });
  if (item.kind === 'shape') details.push({ label: 'Shape', value: shapes.find((s) => s.id === item.value)?.name });
  if (item.kind === 'plate') details.push({ label: 'Shape', value: plates.find((s) => s.id === item.value)?.name });
  details.push({ label: 'Colour', value: col?.name });
  details.push({ label: 'Glitter', value: gl?.name });
  if (gl && gl.kind !== 'none') details.push({ label: 'Glitter style', value: placements.find((p) => p.id === (item.placement || 'top'))?.name });
  return { title: c.title, details };
};

// PLACEHOLDER reviews — replace with real feedback from your first customers.
export const reviews = [
  { name: 'Ananya R.', text: 'The letter keychain looks even better in person. The glitter catches the light like crazy!', item: { kind: 'letter', value: 'A', color: 'white', glitter: 'rosegold-foil' } },
  { name: 'Rohan K.', text: 'Ordered a pen for my sister — she has not stopped using it. Super smooth ordering too.', item: { kind: 'pen', value: 'pen', color: 'black', glitter: 'gold-glitter' } },
  { name: 'Meghana S.', text: 'Loved that I could pick everything myself. It genuinely feels made for me.', item: { kind: 'letter', value: 'M', color: 'peach', glitter: 'gold-foil' } },
  { name: 'Farhan A.', text: 'Gifted the star keychain and it was a hit. The finish is so glossy and clean.', item: { kind: 'shape', value: 'star', color: 'pink', glitter: 'silver-foil' } },
  { name: 'Divya P.', text: 'The teal glitter coaster is gorgeous. Feels like a tiny piece of art on my desk.', item: { kind: 'plate', value: 'hexagon', color: 'champagne', glitter: 'teal-glitter' } },
  { name: 'Sai T.', text: 'Fast replies and a beautiful result. Already planning my next order!', item: { kind: 'letter', value: 'S', color: 'pearl', glitter: 'purple-glitter' } },
];
