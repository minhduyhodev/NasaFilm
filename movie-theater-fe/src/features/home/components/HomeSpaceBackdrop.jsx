import { useEffect, useMemo, useRef } from 'react';
import './HomeSpaceBackdrop.css';

const UNIVERSE_BG =
  'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?q=80&w=1920&auto=format&fit=crop';

const buildTwinkleStars = (count) =>
  Array.from({ length: count }, (_, i) => {
    const seed = (salt) => ((i * 7919 + salt * 104729) % 1000) / 1000;
    return {
      id: i,
      top: `${2 + seed(1) * 96}%`,
      left: `${2 + seed(2) * 96}%`,
      size: seed(3) > 0.58 ? 2 : 1,
      delay: `${seed(4) * 5}s`,
      duration: `${2 + seed(5) * 3.5}s`,
    };
  });

/** Nền vũ trụ NASAFilm dùng chung toàn homepage */
const HomeSpaceBackdrop = ({ starCount = 42 }) => {
  const rootRef = useRef(null);
  const stars = useMemo(() => buildTwinkleStars(starCount), [starCount]);

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return undefined;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return undefined;

    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const scrollY = window.scrollY;
        const imageShift = Math.min(scrollY * 0.14, 140);
        const nebulaShift = Math.min(scrollY * 0.08, 80);
        const glowShift = Math.min(scrollY * 0.05, 50);
        node.style.setProperty('--parallax-image', `${imageShift}px`);
        node.style.setProperty('--parallax-nebula', `${nebulaShift}px`);
        node.style.setProperty('--parallax-glow', `${glowShift}px`);
      });
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={rootRef} className="home-space-backdrop" aria-hidden>
      <div className="home-space-backdrop__base" />
      <img
        className="home-space-backdrop__image home-space-backdrop__layer--image"
        src={UNIVERSE_BG}
        alt=""
        decoding="async"
        fetchPriority="low"
      />
      <div className="home-space-backdrop__nebula home-space-backdrop__layer--nebula" />
      <div className="home-space-backdrop__ambient home-space-backdrop__layer--glow">
        <span className="home-space-backdrop__glow home-space-backdrop__glow--top-right" />
        <span className="home-space-backdrop__glow home-space-backdrop__glow--mid-left" />
        <span className="home-space-backdrop__glow home-space-backdrop__glow--bottom-right" />
      </div>
      <div className="home-space-backdrop__cosmos" />
      <div className="home-space-backdrop__stars">
        {stars.map((star) => (
          <span
            key={star.id}
            className="home-space-backdrop__star"
            style={{
              top: star.top,
              left: star.left,
              width: `${star.size}px`,
              height: `${star.size}px`,
              '--star-delay': star.delay,
              '--star-duration': star.duration,
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default HomeSpaceBackdrop;
