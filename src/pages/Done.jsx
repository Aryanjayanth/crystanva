import { motion } from 'framer-motion';
import Resin from '../components/Resin.jsx';

export default function Done({ info, home }) {
  if (!info) return null;
  const first = info.name.split(' ')[0];
  return (
    <section className="done">
      <div className="done-burst">
        {Array.from({ length: 14 }).map((_, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0, x: 0, y: 0, scale: 0 }}
            animate={{ opacity: [0, 1, 0], x: Math.cos((i / 14) * Math.PI * 2) * 150, y: Math.sin((i / 14) * Math.PI * 2) * 150, scale: [0, 1, 0.6] }}
            transition={{ duration: 1.4, delay: 0.2 }}
          />
        ))}
        <Resin kind={info.item.kind} value={info.item.value} color={info.item.color} glitter={info.item.glitter} placement={info.item.placement} still interactive={false} />
      </div>
      <span className="eyebrow">Request received</span>
      <h1>Thank you, {first}!</h1>
      <p className="lead">
        We've got your request for {info.qty > 1 ? `${info.qty} pieces` : 'your piece'} (₹{info.total}).
        We'll reach out on <b>{info.phone}</b> soon to confirm the details.
      </p>
      <button className="btn primary" onClick={home}>Back to home</button>
    </section>
  );
}
