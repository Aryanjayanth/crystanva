import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Splash from './components/Splash.jsx';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import Home from './pages/Home.jsx';
import Builder from './pages/Builder.jsx';
import Order from './pages/Order.jsx';
import Done from './pages/Done.jsx';
import Cart from './pages/Cart.jsx';
import { defaultItem } from './data';
import { preload3D } from './components/Resin.jsx';

const RenderStudio = lazy(() => import('./components/RenderStudio.jsx'));

export default function App() {
  // intro plays once per visit, not on every reload
  const [splash, setSplash] = useState(() => !sessionStorage.getItem('crystanva-intro'));
  useEffect(() => { sessionStorage.setItem('crystanva-intro', '1'); preload3D(); }, []);
  const [page, setPage] = useState('home');
  const [item, setItem] = useState(null);
  const [done, setDone] = useState(null);
  const [name, setName] = useState(() => localStorage.getItem('crystanva-name') || '');

  useEffect(() => { localStorage.setItem('crystanva-name', name); }, [name]);

  // cart (kept on this device) and the pieces being checked out
  const [cart, setCart] = useState(() => { try { return JSON.parse(localStorage.getItem('crystanva-cart') || '[]'); } catch { return []; } });
  useEffect(() => { localStorage.setItem('crystanva-cart', JSON.stringify(cart)); }, [cart]);
  const [history, setHistory] = useState(() => { try { return JSON.parse(localStorage.getItem('crystanva-orders') || '[]'); } catch { return []; } });
  useEffect(() => { localStorage.setItem('crystanva-orders', JSON.stringify(history)); }, [history]);
  const [editing, setEditing] = useState(null); // id of the cart line being edited in the builder
  const [lines, setLines] = useState([]);
  const [fromCart, setFromCart] = useState(false);

  const go = useCallback((next, { scrollTo } = {}) => {
    window.history.pushState({ page: next }, '');
    setPage(next);
    if (scrollTo) setTimeout(() => document.getElementById(scrollTo)?.scrollIntoView({ behavior: 'smooth' }), 80);
    else window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    window.history.replaceState({ page: 'home' }, '');
    const onPop = (e) => setPage(e.state?.page || 'home');
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // personalized keychains start with the first letter of the visitor's name
  const start = (categoryId) => { setEditing(null); setItem(defaultItem(categoryId, name)); go('builder'); };

  const addToCart = () => {
    if (editing) setCart((c) => c.map((l) => (l.id === editing ? { ...l, item } : l)));
    else setCart((c) => [...c, { id: `${Date.now()}${c.length}`, item, qty: 1 }]);
    setEditing(null);
    go('cart');
  };
  const editLine = (l) => { setItem(l.item); setEditing(l.id); go('builder'); };
  const reorder = (o) => { setCart((c) => [...c, ...o.lines.map((l, i) => ({ id: `${Date.now()}${c.length}${i}`, item: l.item, qty: l.qty }))]); window.scrollTo(0, 0); };
  const buyNow = () => { setLines([{ item, qty: 1 }]); setFromCart(false); go('order'); };
  const checkout = () => { setLines(cart.map(({ item: it, qty }) => ({ item: it, qty }))); setFromCart(true); go('order'); };

  // guard: builder needs an item, order needs pieces
  const view = (page === 'builder' && !item) || (page === 'order' && !lines.length) ? 'home' : page;

  if (import.meta.env.DEV && window.location.hash === '#render') {
    return <Suspense fallback={null}><RenderStudio /></Suspense>;
  }

  return (
    <>
      <AnimatePresence>{splash && <Splash onDone={() => setSplash(false)} />}</AnimatePresence>
      <Navbar page={view} go={go} cartCount={cart.reduce((s, l) => s + l.qty, 0)} />
      <main>
        <AnimatePresence mode="wait">
          <motion.div key={view} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, transition: { duration: 0.12 } }} transition={{ duration: 0.25, ease: 'easeOut' }}>
            {view === 'home' && <Home name={name} setName={setName} start={start} />}
            {view === 'builder' && <Builder item={item} setItem={setItem} onAdd={addToCart} onBuy={buyNow} editing={Boolean(editing)} back={() => window.history.back()} />}
            {view === 'cart' && <Cart cart={cart} setCart={setCart} history={history} reorder={reorder} edit={editLine} addMore={() => go('home', { scrollTo: 'collections' })} checkout={checkout} />}
            {view === 'order' && <Order lines={lines} name={name} setName={setName} back={() => window.history.back()} onSent={(d) => { if (fromCart) setCart([]); setHistory((h) => [{ no: d.no, date: new Date().toISOString(), total: d.total, lines: d.lines }, ...h].slice(0, 20)); setDone(d); go('done'); }} />}
            {view === 'done' && <Done info={done} home={() => go('home')} />}
          </motion.div>
        </AnimatePresence>
      </main>
      <Footer />
    </>
  );
}
