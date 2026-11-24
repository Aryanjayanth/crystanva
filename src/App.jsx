import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Splash from './components/Splash.jsx';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import Home from './pages/Home.jsx';
import Builder from './pages/Builder.jsx';
import Order from './pages/Order.jsx';
import Done from './pages/Done.jsx';
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
  const start = (categoryId) => { setItem(defaultItem(categoryId, name)); go('builder'); };

  // guard: builder / order need an item
  const view = (page === 'builder' || page === 'order') && !item ? 'home' : page;

  if (import.meta.env.DEV && window.location.hash === '#render') {
    return <Suspense fallback={null}><RenderStudio /></Suspense>;
  }

  return (
    <>
      <AnimatePresence>{splash && <Splash onDone={() => setSplash(false)} />}</AnimatePresence>
      <Navbar page={view} go={go} />
      <main>
        <AnimatePresence mode="wait">
          <motion.div key={view} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, transition: { duration: 0.12 } }} transition={{ duration: 0.25, ease: 'easeOut' }}>
            {view === 'home' && <Home name={name} setName={setName} start={start} />}
            {view === 'builder' && <Builder item={item} setItem={setItem} next={() => go('order')} back={() => window.history.back()} />}
            {view === 'order' && <Order item={item} name={name} setName={setName} back={() => window.history.back()} onSent={(d) => { setDone(d); go('done'); }} />}
            {view === 'done' && <Done info={done} home={() => go('home')} />}
          </motion.div>
        </AnimatePresence>
      </main>
      <Footer />
    </>
  );
}
