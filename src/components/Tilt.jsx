import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

// Tilts its child in 3D toward the pointer, like turning a piece in your hand.
export default function Tilt({ children, max = 16, className = '' }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 140, damping: 16 });
  const sy = useSpring(y, { stiffness: 140, damping: 16 });
  const rotateY = useTransform(sx, [-0.5, 0.5], [-max, max]);
  const rotateX = useTransform(sy, [-0.5, 0.5], [max, -max]);

  const move = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - r.left) / r.width - 0.5);
    y.set((e.clientY - r.top) / r.height - 0.5);
  };
  const reset = () => { x.set(0); y.set(0); };

  return (
    <div className={`tilt ${className}`} onPointerMove={move} onPointerLeave={reset}>
      <motion.div style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}>{children}</motion.div>
    </div>
  );
}
