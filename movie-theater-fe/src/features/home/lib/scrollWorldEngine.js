/**
 * scroll-world engine — adapted as ES module for React integration.
 * Original: https://github.com/oso95/scroll-world (MIT)
 *
 * Key changes from upstream:
 * - ES module export instead of IIFE/global
 * - Returns a destroy() function for React cleanup
 * - Copy layer renders empty portal targets (data-sw-section-index) for React portals
 * - Exposes section DOM refs via onReady callback
 */

const el = (tag, cls) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  return n;
};
const pad = (n) => String(n).padStart(2, '0');
const esc = (s) =>
  String(s).replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]),
  );

function seedParticles(host, skip) {
  if (!host || skip) return;
  const kinds = ['dot', 'dot', 'ring'];
  const seeds = [7,23,41,58,71,88,12,34,52,66,83,95,18,29,47,63,77,91,5,38,55,69,82,97];
  for (let k = 0; k < 20; k++) {
    const s = document.createElement('span');
    s.className = 'sw-pt sw-pt--' + kinds[k % kinds.length];
    s.style.left = seeds[k % seeds.length] + 'vw';
    s.style.top = ((seeds[(k * 3) % seeds.length] * 1.3) % 100) + 'vh';
    s.style.setProperty('--sw-sc', (0.5 + ((seeds[(k * 5) % seeds.length] % 60) / 60) * 1.1).toFixed(2));
    const dur = 14 + (seeds[(k * 7) % seeds.length] % 22);
    s.style.animationDuration = dur + 's';
    s.style.animationDelay = (-(seeds[(k * 2) % seeds.length] % dur)) + 's';
    host.appendChild(s);
  }
}

function injectCSS() {
  if (document.getElementById('sw-css')) return;
  const css = `
.sw-root{--sw-bg:#000;--sw-ink:#fff;--sw-ink-soft:#a0a0a0;--sw-accent:#e50914;
--sw-font-display:"Inter","SF Pro Display","Segoe UI",system-ui,sans-serif;
--sw-font-body:"Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,system-ui,sans-serif;
color:var(--sw-ink);font-family:var(--sw-font-body);}
html,body{overflow-x:hidden;}
.sw-sky{position:fixed;inset:0;z-index:0;overflow:hidden;pointer-events:none;background:var(--sw-bg);}
.sw-sky__grad{position:absolute;inset:-10%;background:linear-gradient(178deg,color-mix(in srgb,var(--sw-accent) 12%,var(--sw-bg)) 0%,var(--sw-bg) 55%,color-mix(in srgb,var(--sw-accent) 6%,var(--sw-bg)) 100%);}
.sw-sky__glow{position:absolute;inset:0;background:radial-gradient(60% 42% at 74% 16%,color-mix(in srgb,var(--sw-accent) 22%,transparent),transparent 70%),radial-gradient(46% 34% at 50% 50%,color-mix(in srgb,#fff 8%,transparent),transparent 70%);}
.sw-particles{position:absolute;inset:-6% -2%;will-change:transform;}
.sw-pt{position:absolute;width:13px;height:13px;transform:scale(var(--sw-sc,1));opacity:0;animation:sw-drift linear infinite;}
.sw-pt::before{content:"";position:absolute;inset:0;border-radius:50%;}
.sw-pt--dot::before{background:radial-gradient(circle at 34% 30%,color-mix(in srgb,var(--sw-accent) 60%,#000),#000 82%);}
.sw-pt--ring::before{background:transparent;border:2px solid color-mix(in srgb,var(--sw-accent) 55%,transparent);}
@keyframes sw-drift{0%{opacity:0;transform:scale(var(--sw-sc)) translate(0,12vh) rotate(0)}12%{opacity:.5}88%{opacity:.45}100%{opacity:0;transform:scale(var(--sw-sc)) translate(4vw,-22vh) rotate(210deg)}}
.sw-scrollbar{position:fixed;top:0;left:0;right:0;height:3px;z-index:60;background:color-mix(in srgb,var(--sw-accent) 14%,transparent);}
.sw-scrollbar span{display:block;height:100%;width:100%;transform-origin:0 50%;transform:scaleX(0);background:var(--sw-accent);}
.sw-topbar{display:none;}
.sw-stage{position:fixed;inset:0;z-index:10;pointer-events:none;}
.sw-scene{position:absolute;inset:0;opacity:0;overflow:hidden;will-change:opacity;}
.sw-scene__video,.sw-scene__still{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center 42%;}
.sw-scene__still{will-change:transform;} .sw-scene.has-clip .sw-scene__still{opacity:0;} .sw-scene__video{z-index:1;}
.sw-copylayer{position:fixed;inset:0;z-index:20;pointer-events:none;display:flex;align-items:center;}
.sw-copylayer::before{content:"";position:absolute;inset:0;width:min(58vw,780px);background:linear-gradient(90deg,var(--sw-bg) 0%,color-mix(in srgb,var(--sw-bg) 82%,transparent) 34%,color-mix(in srgb,var(--sw-bg) 40%,transparent) 62%,transparent 100%);}
.sw-copy{position:absolute;left:clamp(18px,5vw,64px);top:50%;transform:translateY(-50%);width:min(46vw,520px);opacity:0;will-change:opacity,transform;pointer-events:none;}
.sw-copy.is-visible{pointer-events:auto;}
.sw-copy__num{font-family:ui-monospace,Menlo,monospace;font-size:.74rem;letter-spacing:.12em;color:var(--sw-ink-soft);}
.sw-copy__eyebrow{display:block;margin-top:18px;font-family:var(--sw-font-display);font-weight:700;font-size:.8rem;letter-spacing:.16em;text-transform:uppercase;color:var(--sw-accent);}
.sw-copy__title{font-family:var(--sw-font-display);font-weight:700;color:var(--sw-ink);font-size:clamp(2rem,4.4vw,3.5rem);line-height:1.03;margin:12px 0 0;letter-spacing:-.01em;text-shadow:0 2px 20px rgba(0,0,0,.7);}
.sw-copy__body{margin-top:18px;font-size:clamp(1rem,1.25vw,1.14rem);line-height:1.55;color:var(--sw-ink-soft);max-width:40ch;text-shadow:0 1px 12px rgba(0,0,0,.8);}
.sw-copy__tags{list-style:none;display:flex;flex-wrap:wrap;gap:8px;margin:24px 0 0;padding:0;}
.sw-copy__tags li{font-size:.82rem;font-weight:600;color:var(--sw-accent);padding:7px 14px;border-radius:999px;background:rgba(229,9,20,.12);border:1px solid rgba(229,9,20,.3);}
.sw-copy__cta{display:flex;flex-wrap:wrap;gap:12px;margin-top:28px;pointer-events:auto;}
.sw-btn{text-decoration:none;font-weight:600;font-size:.95rem;padding:13px 24px;border-radius:999px;transition:transform .2s;}
.sw-btn--primary{color:#fff;background:var(--sw-accent);} .sw-btn--primary:hover{transform:translateY(-2px);}
.sw-btn--ghost{color:var(--sw-ink);border:1.5px solid rgba(255,255,255,.25);} .sw-btn--ghost:hover{transform:translateY(-2px);}
.sw-copy__portal{margin-top:20px;pointer-events:auto;}
.sw-route{position:fixed;right:clamp(14px,2.4vw,30px);top:50%;z-index:40;transform:translateY(-50%);display:flex;flex-direction:column;gap:22px;padding:18px 10px;}
.sw-route::before{content:"";position:absolute;left:50%;top:22px;bottom:22px;width:2px;transform:translateX(-50%);background:var(--sw-accent);opacity:.28;}
.sw-route__dot{position:relative;border:0;background:transparent;cursor:pointer;width:14px;height:14px;display:grid;place-items:center;}
.sw-route__dot i{width:9px;height:9px;border-radius:50%;background:color-mix(in srgb,var(--sw-accent) 40%,transparent);transition:transform .3s,background .3s,box-shadow .3s;}
.sw-route__dot:hover i{transform:scale(1.25);background:var(--sw-accent);}
.sw-route__dot.is-active i{background:var(--sw-accent);transform:scale(1.4);box-shadow:0 0 0 5px color-mix(in srgb,var(--sw-accent) 22%,transparent);}
.sw-route__label{position:absolute;right:24px;top:50%;transform:translateY(-50%) translateX(6px);white-space:nowrap;font-size:.78rem;font-weight:600;color:var(--sw-ink);background:rgba(0,0,0,.7);backdrop-filter:blur(6px);padding:5px 11px;border-radius:999px;opacity:0;pointer-events:none;transition:opacity .25s,transform .25s;border:1px solid rgba(229,9,20,.14);}
.sw-route__dot:hover .sw-route__label,.sw-route__dot.is-active .sw-route__label{opacity:1;transform:translateY(-50%) translateX(0);}
.sw-hint{position:fixed;left:50%;bottom:26px;z-index:30;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:10px;font-size:.76rem;letter-spacing:.14em;text-transform:uppercase;color:var(--sw-ink-soft);transition:opacity .3s;}
.sw-hint i{width:22px;height:34px;border-radius:12px;border:2px solid rgba(255,255,255,.28);position:relative;}
.sw-hint i::after{content:"";position:absolute;left:50%;top:7px;width:4px;height:7px;border-radius:2px;background:var(--sw-accent);transform:translateX(-50%);animation:sw-wheel 1.7s ease-in-out infinite;}
@keyframes sw-wheel{0%{opacity:0;top:6px}40%{opacity:1}100%{opacity:0;top:17px}}
.sw-track{position:relative;z-index:1;width:100%;pointer-events:none;}
@media (max-width:860px){
.sw-copylayer::before{width:100%;height:60%;top:auto;bottom:0;background:linear-gradient(0deg,var(--sw-bg) 8%,color-mix(in srgb,var(--sw-bg) 70%,transparent) 46%,transparent 100%);}
.sw-copy{left:clamp(18px,5vw,64px);right:clamp(18px,5vw,64px);top:auto;bottom:clamp(64px,14vh,120px);transform:none;width:auto;max-width:560px;}
.sw-copy{bottom:calc(clamp(56px,12dvh,110px) + env(safe-area-inset-bottom));}
.sw-copy__title{font-size:clamp(1.9rem,7.5vw,2.7rem);}
.sw-copy__body{max-width:none;font-size:clamp(.98rem,3.6vw,1.1rem);}
.sw-scene__video,.sw-scene__still{object-position:center 46%;}
.sw-hint{bottom:calc(20px + env(safe-area-inset-bottom));}
.sw-route{gap:16px;right:6px;} .sw-route__label{display:none;}
}
@media (max-width:860px) and (orientation:portrait){
.sw-scene__video,.sw-scene__still{object-position:center 44%;}
}
@media (hover:none) and (pointer:coarse){
.sw-route{padding:14px 6px;} .sw-route__dot{width:28px;height:28px;} .sw-btn{padding:15px 26px;}
}
@media (prefers-reduced-motion:reduce){ .sw-hint i::after{animation:none;} .sw-pt{display:none;} }
  `;
  const style = document.createElement('style');
  style.id = 'sw-css';
  style.textContent = '@layer sw {\n' + css + '\n}';
  document.head.appendChild(style);
}

function ctaBtns(cta) {
  let h = '';
  if (cta.primary)
    h += `<a class="sw-btn sw-btn--primary" href="${esc(cta.primary.href || '#')}">${esc(cta.primary.label)}</a>`;
  if (cta.secondary)
    h += `<a class="sw-btn sw-btn--ghost" href="${esc(cta.secondary.href || '#')}">${esc(cta.secondary.label)}</a>`;
  return h;
}

/**
 * Mount the scroll-world engine into a container element.
 * Returns { destroy, copyEls, jumpTo, getActiveIndex }
 */
export function mountScrollWorld(container, config) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  const smallMQ = window.matchMedia('(max-width: 860px)');
  const isMobile = () => coarse || smallMQ.matches;
  const SECTIONS = config.sections || [];
  const CONNECTORS = config.connectors || [];
  const CONNECTORS_M = config.connectorsMobile || [];
  const DIVE_W = config.diveScroll || 1.3;
  const CONN_W = config.connScroll || 0.9;
  const CROSSFADE = config.crossfade != null ? config.crossfade : 0.12;
  const N = SECTIONS.length;
  if (!N) return null;

  injectCSS();
  container.classList.add('sw-root');

  const SEGMENTS = [];
  SECTIONS.forEach((s, i) => {
    const dive = {
      kind: 'dive', si: i, clip: s.clip, clipM: s.clipMobile,
      still: s.still, stillM: s.stillMobile,
      accent: s.accent, w: s.scroll || DIVE_W, linger: s.linger || 0,
    };
    SEGMENTS.push(dive);
    s._seg = dive;
    if (i < N - 1 && CONNECTORS[i]) {
      SEGMENTS.push({
        kind: 'conn', si: i, clip: CONNECTORS[i], clipM: CONNECTORS_M[i],
        still: SECTIONS[i + 1].still, stillM: SECTIONS[i + 1].stillMobile,
        accent: SECTIONS[i + 1].accent, w: CONN_W,
      });
    }
  });
  const NSEG = SEGMENTS.length;

  // DOM
  const sky = el('div', 'sw-sky');
  if (config.atmosphere !== false) {
    sky.appendChild(el('div', 'sw-sky__grad'));
    sky.appendChild(el('div', 'sw-sky__glow'));
  }
  const particles = el('div', 'sw-particles');
  sky.appendChild(particles);

  const scrollbar = el('div', 'sw-scrollbar');
  const scrollbarFill = el('span');
  scrollbar.appendChild(scrollbarFill);

  const stage = el('div', 'sw-stage');
  const copylayer = el('div', 'sw-copylayer');
  const route = el('div', 'sw-route');
  const hint = el('div', 'sw-hint');
  const hintText = el('span');
  hintText.textContent = config.hint || 'cuộn để khám phá';
  hint.appendChild(hintText);
  hint.appendChild(el('i'));
  const track = el('div', 'sw-track');

  [sky, scrollbar, stage, copylayer, route, hint, track].forEach((n) =>
    container.appendChild(n),
  );

  // Scenes
  SEGMENTS.forEach((s) => {
    const scene = el('div', 'sw-scene');
    scene.style.setProperty('--sw-accent', s.accent || '');
    const img = el('img', 'sw-scene__still');
    img.alt = '';
    img.decoding = 'async';
    img.loading = 'lazy';
    const poster = isMobile() && s.stillM ? s.stillM : s.still;
    if (poster) img.src = poster;
    scene.appendChild(img);
    stage.appendChild(scene);
    s.el = scene;
    s.img = img;
    s.video = null;
    s.hasClip = false;
    s.loading = false;
    s.ready = false;
    s.cur = 0;
    s.target = 0;
    s.visible = false;
  });

  // Copy + route + portal targets
  const copies = [];
  const portalEls = [];
  const dots = [];
  SECTIONS.forEach((s, i) => {
    const c = el('article', 'sw-copy');
    c.style.setProperty('--sw-accent', s.accent || '');
    c.setAttribute('data-sw-section-index', String(i));

    let html = `<span class="sw-copy__num">${pad(i + 1)} / ${pad(N)}</span>`;
    if (s.eyebrow) html += `<span class="sw-copy__eyebrow">${esc(s.eyebrow)}</span>`;
    if (s.title) html += `<h2 class="sw-copy__title">${esc(s.title)}</h2>`;
    if (s.body) html += `<p class="sw-copy__body">${esc(s.body)}</p>`;
    if (s.tags?.length)
      html += `<ul class="sw-copy__tags">${s.tags.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>`;
    if (s.cta) html += `<div class="sw-copy__cta">${ctaBtns(s.cta)}</div>`;

    c.innerHTML = html;
    copylayer.appendChild(c);
    copies.push(c);
    portalEls.push(null);

    const dot = el('button', 'sw-route__dot');
    dot.style.setProperty('--sw-accent', s.accent || '');
    dot.innerHTML = `<i></i><span class="sw-route__label">${esc(s.label || '')}</span>`;
    dot.addEventListener('click', () => jumpTo(i));
    route.appendChild(dot);
    dots.push(dot);
  });

  // Math
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
  const lingerEase = (x, L) => { L = clamp(L); const c = x - 0.5; return (1 - L) * x + L * (4 * c * c * c + 0.5); };
  let vh = window.innerHeight, stageX = 0, totalW = 0, activeIndex = -1, ticking = false;
  let laidOutW = window.innerWidth;
  let destroyed = false;

  function layout() {
    if (destroyed) return;
    vh = window.innerHeight;
    laidOutW = window.innerWidth;
    stageX = window.innerWidth > 860 ? 4 : 0;
    let off = 0;
    SEGMENTS.forEach((s) => { s.start = off * vh; off += s.w; s.end = off * vh; });
    totalW = off;
    track.style.height = totalW * vh + vh + 'px';
    read();
  }

  function jumpTo(i) {
    const seg = SECTIONS[i]._seg;
    window.scrollTo({
      top: seg.start + (seg.end - seg.start) * 0.5,
      behavior: reduce ? 'auto' : 'smooth',
    });
  }

  function loadClip(s) {
    if (reduce || s.loading || !s.clip) return;
    s.loading = true;
    const url = isMobile() && s.clipM ? s.clipM : s.clip;
    fetch(url)
      .then((r) => (r.ok ? r.blob() : Promise.reject(new Error('404'))))
      .then((blob) => {
        if (destroyed) return;
        const v = document.createElement('video');
        v.className = 'sw-scene__video';
        v.muted = true;
        v.playsInline = true;
        v.preload = 'auto';
        v.setAttribute('muted', '');
        v.setAttribute('playsinline', '');
        v.src = URL.createObjectURL(blob);
        v.addEventListener('loadedmetadata', () => { s.ready = true; read(); });
        v.addEventListener('seeked', () => { s.el.classList.add('has-clip'); }, { once: true });
        v.addEventListener('loadeddata', () => { try { v.pause(); } catch (_) {} if (userReady) primeVideo(v); });
        s.el.appendChild(v);
        s.video = v;
        s.hasClip = true;
      })
      .catch(() => { s.loading = false; });
  }

  // Track active section for external consumers (e.g. DomeGallery pause)
  let onActiveChangeCallback = config.onActiveChange || null;

  function read() {
    if (destroyed) return;
    const y = window.scrollY || window.pageYOffset;
    const fade = CROSSFADE * vh;
    let ci = 0;
    for (let i = 0; i < NSEG; i++) if (y >= SEGMENTS[i].start) ci = i;

    for (let i = 0; i < NSEG; i++) {
      const s = SEGMENTS[i];
      if (y > s.start - 1.6 * vh && y < s.end + 1.6 * vh) loadClip(s);
      const local = clamp((y - s.start) / (s.end - s.start), 0, 1);
      s.target = s.linger ? lingerEase(local, s.linger) : local;
      let outside = 0;
      if (y < s.start) outside = s.start - y;
      else if (y > s.end) outside = y - s.end;
      const op = smooth(1 - outside / fade);
      s.el.style.opacity = op;
      s.visible = op > 0.001;
      s.el.style.zIndex = i === ci ? '120' : String(100 + Math.round(op * 10));
      if (!s.hasClip || !s.ready) {
        const sc = reduce ? 1 : 1.03 + local * 0.14;
        s.img.style.transform = `translateX(${stageX - 2}vw) scale(${sc.toFixed(3)})`;
      }
    }

    for (let i = 0; i < N; i++) {
      const seg = SECTIONS[i]._seg;
      const pr = clamp((y - seg.start) / (seg.end - seg.start), 0, 1);
      const before = y < seg.start, after = y > seg.end;
      let cop;
      if (i === 0) cop = after ? 0 : smooth(1 - pr / 0.62);
      else if (i === N - 1) cop = before ? 0 : smooth(pr / 0.4);
      else cop = before || after ? 0 : smooth(1 - Math.abs(pr - 0.5) / 0.5);
      const c = copies[i];
      c.style.opacity = cop;
      c.style.transform = reduce ? 'none' : `translateY(${(0.5 - pr) * 4}vh)`;
      c.classList.toggle('is-visible', cop > 0.5);
    }

    const cur = SEGMENTS[ci];
    const near = clamp(
      cur.kind === 'dive' ? cur.si : ((y - cur.start) / (cur.end - cur.start) > 0.5 ? cur.si + 1 : cur.si),
      0, N - 1,
    );
    if (near !== activeIndex) {
      activeIndex = near;
      dots.forEach((d, k) => d.classList.toggle('is-active', k === near));
      container.style.setProperty('--sw-accent', SECTIONS[near].accent || '');
      if (onActiveChangeCallback) onActiveChangeCallback(near);
    }
    scrollbarFill.style.transform = `scaleX(${clamp(y / (totalW * vh))})`;
    hint.style.opacity = clamp(1 - y / (0.5 * vh));
    if (particles) particles.style.transform = `translate3d(0, ${-y * 0.05}px, 0)`;
    ticking = false;
  }

  function raf() {
    if (destroyed) return;
    const eps = isMobile() ? 0.02 : 0.008;
    for (let i = 0; i < NSEG; i++) {
      const s = SEGMENTS[i];
      if (!s.hasClip || !s.ready || !s.video) continue;
      if (s.video.seeking) continue;
      if (!s.visible && Math.abs(s.cur - s.target) < 0.002) continue;
      s.cur += (s.target - s.cur) * (reduce ? 1 : 0.18);
      const dur = s.video.duration || 1;
      const t = clamp(s.cur, 0, 0.999) * dur;
      if (Math.abs(s.video.currentTime - t) > eps) {
        try { s.video.currentTime = t; } catch (_) {}
      }
    }
    requestAnimationFrame(raf);
  }

  let userReady = false;
  function primeVideo(v) {
    if (!isMobile() || !v) return;
    try {
      const p = v.play();
      if (p?.then) p.then(() => { try { v.pause(); } catch (_) {} }).catch(() => {});
    } catch (_) {}
  }
  function onFirstGesture() {
    if (userReady) return;
    userReady = true;
    SEGMENTS.forEach((s) => primeVideo(s.video));
  }
  window.addEventListener('pointerdown', onFirstGesture, { once: true, passive: true });
  window.addEventListener('touchstart', onFirstGesture, { once: true, passive: true });

  seedParticles(particles, reduce || coarse);

  const onScroll = () => {
    if (!ticking) { ticking = true; requestAnimationFrame(read); }
  };
  window.addEventListener('scroll', onScroll, { passive: true });

  function onResize() {
    if (coarse && window.innerWidth === laidOutW) return;
    layout();
  }
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', layout);
  window.addEventListener('load', layout);
  layout();
  if (onActiveChangeCallback) onActiveChangeCallback(0);
  requestAnimationFrame(raf);

  function destroy() {
    destroyed = true;
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('orientationchange', layout);
    window.removeEventListener('load', layout);
    container.classList.remove('sw-root');
    [sky, scrollbar, stage, copylayer, route, hint, track].forEach((n) => {
      if (n.parentElement) n.remove();
    });
    SEGMENTS.forEach((s) => {
      if (s.video?.src) URL.revokeObjectURL(s.video.src);
    });
  }

  return { destroy, portalEls, jumpTo, getActiveIndex: () => activeIndex };
}
