import { useEffect } from 'react';
import { motion } from 'framer-motion';

// Logo fades in, flickers like a loading screen, then the site is revealed.
export default function Splash({ onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2100);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <motion.div className="splash" onClick={onDone} exit={{ opacity: 0, scale: 1.03 }} transition={{ duration: 0.45, ease: 'easeInOut' }}>
      <motion.img
        src="/logo-full.webp"
        alt="Crystanva"
        className="splash-logo"
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: [0, 1, 0.25, 1, 0.5, 1, 0.8, 1], scale: [0.94, 1, 1, 1, 1, 1, 1, 1.02] }}
        transition={{ duration: 1.6, times: [0, 0.14, 0.24, 0.36, 0.46, 0.58, 0.68, 1], ease: 'easeOut' }}
      />
      <motion.p className="splash-tag" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.0, duration: 0.6 }}>
        Made for you
      </motion.p>
      <div className="splash-bar"><motion.span initial={{ width: '0%' }} animate={{ width: '100%' }} transition={{ duration: 1.9, ease: 'easeInOut' }} /></div>
    </motion.div>
  );
}
