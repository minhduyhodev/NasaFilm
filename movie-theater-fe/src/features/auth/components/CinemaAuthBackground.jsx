import { useEffect, useMemo, useRef, useState } from 'react';
import './CinemaAuthBackground.css';

import posterAetheria from '../../../shared/assets/movie_aetheria.png';
import posterKinetic from '../../../shared/assets/movie_kinetic_pulse.png';
import posterMidnight from '../../../shared/assets/movie_midnight_echo.png';
import posterStelar from '../../../shared/assets/movie_stelar_horizon.png';
import posterVelvet from '../../../shared/assets/movie_velvet_legacy.png';
import posterWhispers from '../../../shared/assets/movie_whispers_of_oak.png';

const HERO_SRC = '/landing/hero-theater.png?v=2';

const POSTER_SRCS = [
  posterAetheria,
  posterKinetic,
  posterMidnight,
  posterStelar,
  posterVelvet,
  posterWhispers,
];

const FALLBACK_SHAPES = [
  [
    [12, 42],
    [30, 28],
    [50, 32],
    [70, 48],
    [60, 68],
    [40, 72],
    [24, 56],
  ],
  [
    [22, 46],
    [42, 40],
    [62, 34],
    [48, 16],
    [74, 12],
    [50, 72],
    [78, 68],
  ],
  [
    [10, 52],
    [30, 28],
    [50, 54],
    [70, 26],
    [90, 50],
  ],
  [
    [50, 12],
    [50, 88],
    [22, 48],
    [78, 56],
  ],
];

const FALLBACK_LINKS = [
  [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 0]],
  [[0, 1], [1, 2], [1, 3], [2, 4], [1, 5], [2, 6]],
  [[0, 1], [1, 2], [2, 3], [3, 4]],
  [[0, 1], [2, 3]],
];

const rand = (min, max) => min + Math.random() * (max - min);

function pointsToPath(points, links) {
  return links
    .map(([a, b]) => {
      const p1 = points[a];
      const p2 = points[b];
      if (!p1 || !p2) return '';
      return `M ${p1[0]} ${p1[1]} L ${p2[0]} ${p2[1]}`;
    })
    .join(' ');
}

function nearestLinks(points, maxDist = 38) {
  const links = [];
  const used = new Set();
  for (let i = 0; i < points.length; i++) {
    const dists = [];
    for (let j = 0; j < points.length; j++) {
      if (i === j) continue;
      const d = Math.hypot(points[i][0] - points[j][0], points[i][1] - points[j][1]);
      dists.push({ j, d });
    }
    dists.sort((a, b) => a.d - b.d);
    let added = 0;
    for (const { j, d } of dists) {
      if (d > maxDist || added >= 2) break;
      const key = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (used.has(key)) continue;
      used.add(key);
      links.push([i, j]);
      added += 1;
    }
  }
  return links.length ? links : [[0, 1]];
}

/**
 * Sample a movie poster → constellation points in a 100×100 viewBox.
 * Bright patches become stars; nearest neighbors become edges.
 */
function posterToConstellation(img, targetPoints = 12) {
  const tw = 36;
  const th = 54;
  const canvas = document.createElement('canvas');
  canvas.width = tw;
  canvas.height = th;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  ctx.drawImage(img, 0, 0, tw, th);
  let data;
  try {
    data = ctx.getImageData(0, 0, tw, th).data;
  } catch {
    return null;
  }

  const cells = [];
  const step = 2;
  for (let y = 2; y < th - 2; y += step) {
    for (let x = 2; x < tw - 2; x += step) {
      const i = (y * tw + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      if (a < 40) continue;
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      // Prefer bright highlights + some mid contrast edges
      const score = lum + Math.abs(r - g) * 0.15;
      cells.push({ x, y, score, lum });
    }
  }

  cells.sort((a, b) => b.score - a.score);

  const picked = [];
  const minSep = 4.2;
  for (const cell of cells) {
    if (picked.length >= targetPoints) break;
    if (cell.lum < 42) continue;
    const tooClose = picked.some(
      (p) => Math.hypot(p.x - cell.x, p.y - cell.y) < minSep,
    );
    if (tooClose) continue;
    picked.push(cell);
  }

  if (picked.length < 5) return null;

  // Map poster pixels → centered constellation in 100×100
  const points = picked.map((p) => [
    8 + (p.x / (tw - 1)) * 84,
    6 + (p.y / (th - 1)) * 88,
  ]);
  const links = nearestLinks(points);
  return { points, links, d: pointsToPath(points, links) };
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function usePosterConstellations() {
  const [shapes, setShapes] = useState(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const results = [];
      for (const src of POSTER_SRCS) {
        try {
          const img = await loadImage(src);
          const shape = posterToConstellation(img, 11 + Math.floor(Math.random() * 4));
          if (shape) results.push(shape);
        } catch {
          // skip broken asset
        }
      }
      if (!cancelled) {
        setShapes(results.length ? results : null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return shapes;
}

function buildDriftItems(shapeCatalog, count) {
  return Array.from({ length: count }, (_, i) => {
    const shape = shapeCatalog[i % shapeCatalog.length];
    const duration = rand(12, 20);
    const startX = rand(6, 92);
    const startY = rand(8, 88);
    const driftX = rand(-22, 22);
    const driftY = rand(-16, 16);
    return {
      id: i,
      points: shape.points,
      d: shape.d,
      duration,
      delay: -rand(0, duration),
      startX,
      startY,
      endX: Math.min(96, Math.max(2, startX + driftX)),
      endY: Math.min(96, Math.max(4, startY + driftY)),
      startScale: rand(0.7, 1.2),
      endScale: rand(0.85, 1.45),
      startRot: rand(-10, 10),
      endRot: rand(-18, 18),
      opacity: rand(0.34, 0.58),
      size: rand(120, 230),
      fromPoster: Boolean(shape.fromPoster),
    };
  });
}

/** Poster-derived constellations drifting across the viewport. */
function ConstellationField() {
  const posterShapes = usePosterConstellations();

  const items = useMemo(() => {
    if (posterShapes?.length) {
      const catalog = posterShapes.map((s) => ({ ...s, fromPoster: true }));
      return buildDriftItems(catalog, 18);
    }

    const catalog = FALLBACK_SHAPES.map((points, i) => ({
      points,
      links: FALLBACK_LINKS[i],
      d: pointsToPath(points, FALLBACK_LINKS[i]),
      fromPoster: false,
    }));
    return buildDriftItems(catalog, 14);
  }, [posterShapes]);

  return (
    <div className="cinema-auth-bg__constellations">
      {items.map((item) => (
        <svg
          key={`${item.id}-${item.fromPoster ? 'p' : 'f'}`}
          className={`cinema-auth-bg__constellation${item.fromPoster ? ' cinema-auth-bg__constellation--poster' : ''}`}
          viewBox="0 0 100 100"
          width={item.size}
          height={item.size}
          style={{
            '--sx': `${item.startX}vw`,
            '--sy': `${item.startY}vh`,
            '--ex': `${item.endX}vw`,
            '--ey': `${item.endY}vh`,
            '--ss': item.startScale,
            '--es': item.endScale,
            '--sr': `${item.startRot}deg`,
            '--er': `${item.endRot}deg`,
            '--dur': `${item.duration}s`,
            '--delay': `${item.delay}s`,
            '--op': item.opacity,
          }}
        >
          <path
            d={item.d}
            fill="none"
            stroke="rgba(255,248,240,0.72)"
            strokeWidth="1.05"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          {item.points.map(([cx, cy], pi) => (
            <circle
              key={pi}
              cx={cx}
              cy={cy}
              r={pi % 3 === 0 ? 1.55 : 1.15}
              fill="rgba(255,255,255,0.88)"
            />
          ))}
        </svg>
      ))}
    </div>
  );
}

/** Soft full-screen starfield. */
function StarDustCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return undefined;

    let w = 0;
    let h = 0;
    let raf = 0;
    let alive = true;
    let last = performance.now();
    const start = performance.now();
    const stars = [];

    const layers = [
      { count: 90, speed: 6, size: [0.55, 1.15], alpha: 0.26 },
      { count: 70, speed: 11, size: [0.75, 1.65], alpha: 0.38 },
      { count: 45, speed: 17, size: [1.0, 2.0], alpha: 0.5 },
    ];

    const spawnStar = (layer, li) => {
      const angle = Math.random() * Math.PI * 2;
      const speed = layer.speed * (0.55 + Math.random() * 0.7);
      return {
        layer: li,
        x: Math.random() * Math.max(w, 1),
        y: Math.random() * Math.max(h, 1),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed * 0.65,
        size: layer.size[0] + Math.random() * (layer.size[1] - layer.size[0]),
        baseAlpha: layer.alpha * (0.65 + Math.random() * 0.35),
        tw: Math.random() * Math.PI * 2,
        twSpeed: 0.5 + Math.random() * 1.1,
      };
    };

    const rebuild = () => {
      stars.length = 0;
      layers.forEach((layer, li) => {
        for (let i = 0; i < layer.count; i++) {
          stars.push(spawnStar(layer, li));
        }
      });
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      rebuild();
    };

    const wrap = (s) => {
      if (s.x < -12) {
        s.x = w + 12;
        s.y = Math.random() * h;
      } else if (s.x > w + 12) {
        s.x = -12;
        s.y = Math.random() * h;
      }
      if (s.y < -12) {
        s.y = h + 12;
        s.x = Math.random() * w;
      } else if (s.y > h + 12) {
        s.y = -12;
        s.x = Math.random() * w;
      }
    };

    const frame = (now) => {
      if (!alive) return;
      const tSec = (now - start) / 1000;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      ctx.clearRect(0, 0, w, h);

      for (const s of stars) {
        s.x += s.vx * dt;
        s.y += s.vy * dt + Math.sin(tSec * 0.3 + s.tw) * 0.012 * (s.layer + 1);
        s.tw += dt * s.twSpeed;
        wrap(s);
      }

      for (let i = 0; i < stars.length; i++) {
        const a = stars[i];
        if (a.layer === 0) continue;
        const twA = 0.7 + Math.sin(a.tw) * 0.3;
        const aOp = a.baseAlpha * twA;
        if (aOp < 0.16) continue;

        for (let j = i + 1; j < Math.min(i + 5, stars.length); j++) {
          const b = stars[j];
          if (a.layer !== b.layer) continue;
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist > 85 || dist < 20) continue;
          const twB = 0.7 + Math.sin(b.tw) * 0.3;
          const op = (1 - dist / 85) * Math.min(aOp, b.baseAlpha * twB) * 0.32;
          if (op < 0.04) continue;
          ctx.strokeStyle = `rgba(255,245,235,${op})`;
          ctx.lineWidth = 0.7;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }

      for (const s of stars) {
        const tw = 0.65 + Math.sin(s.tw) * 0.35;
        const alpha = s.baseAlpha * tw;
        if (alpha < 0.04) continue;

        if (s.size > 1.15) {
          const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.size * 3);
          g.addColorStop(0, `rgba(255,255,255,${alpha * 0.35})`);
          g.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.size * 3, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(frame);
    };

    resize();
    window.addEventListener('resize', resize);
    raf = requestAnimationFrame(frame);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="cinema-auth-bg__canvas" />;
}

export const CinemaAuthBackground = () => (
  <div className="cinema-auth-bg" aria-hidden="true">
    <div className="cinema-auth-bg__void" />
    <div
      className="cinema-auth-bg__photo"
      style={{ backgroundImage: `url(${HERO_SRC})` }}
    />
    <div className="cinema-auth-bg__veil" />
    <StarDustCanvas />
    <ConstellationField />
  </div>
);

export default CinemaAuthBackground;
