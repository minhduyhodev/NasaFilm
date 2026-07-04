import React, { useMemo } from 'react';
import './HomeSpaceBackdrop.css';

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

const HomeSpaceBackdrop = ({ starCount = 36 }) => {
  const stars = useMemo(() => buildTwinkleStars(starCount), [starCount]);

  return (
    <div className="home-space-backdrop" aria-hidden>
      <div className="home-space-backdrop__base" />
      <div className="home-space-backdrop__ambient">
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
      <div className="home-space-backdrop__top-blend" />
    </div>
  );
};

export default HomeSpaceBackdrop;
