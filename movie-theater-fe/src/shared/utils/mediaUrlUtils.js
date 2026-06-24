const TMDB_HOST = 'image.tmdb.org';
const ROUTING_CACHE_KEY = 'tmdb_poster_routing';
const WSRV_PROXY = 'https://wsrv.nl/';

export const FALLBACK_POSTER =
  'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?q=80&w=400';

/** unknown | proxy | cdn */
let routingMode = 'cdn';
let initPromise = null;

try {
  const cached = sessionStorage.getItem(ROUTING_CACHE_KEY);
  if (cached === 'proxy' || cached === 'cdn') {
    routingMode = cached;
  } else if (cached === 'fallback') {
    routingMode = 'cdn';
  }
} catch {
  // ignore storage errors
}

export const isTmdbUrl = (url) =>
  typeof url === 'string' && url.includes(TMDB_HOST);

export const toWsrvProxyUrl = (url, width = 400) =>
  `${WSRV_PROXY}?url=${encodeURIComponent(url.trim())}&w=${width}&fit=cover&output=webp`;

/** Lấy lại URL TMDB gốc nếu đã bị bọc qua wsrv hoặc proxy BE. */
export const unwrapMediaUrl = (url) => {
  if (!url?.trim()) {
    return '';
  }
  const trimmed = url.trim();
  try {
    if (trimmed.includes('wsrv.nl')) {
      const inner = new URL(trimmed).searchParams.get('url');
      if (inner) {
        return decodeURIComponent(inner);
      }
    }
    if (trimmed.includes('/api/media/proxy')) {
      const parsed = trimmed.startsWith('http')
        ? new URL(trimmed)
        : new URL(trimmed, 'http://localhost');
      const inner = parsed.searchParams.get('url');
      if (inner) {
        return decodeURIComponent(inner);
      }
    }
  } catch {
    // ignore parse errors
  }
  return trimmed;
};

const applyRoutingMode = (mode) => {
  const normalized = mode === 'fallback' ? 'cdn' : mode;
  const changed = routingMode !== normalized;
  routingMode = normalized;
  try {
    sessionStorage.setItem(ROUTING_CACHE_KEY, normalized);
  } catch {
    // ignore storage errors
  }
  if (changed && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('media-routing-ready', { detail: { mode: normalized } }));
  }
};

export const initMediaUrlRouting = () => {
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    try {
      const cached = sessionStorage.getItem(ROUTING_CACHE_KEY);
      if (cached === 'proxy' || cached === 'cdn') {
        routingMode = cached;
        return routingMode;
      }
      if (cached === 'fallback') {
        applyRoutingMode('cdn');
        return routingMode;
      }
    } catch {
      // ignore storage errors
    }

    try {
      const apiBase = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${apiBase}/api/media/tmdb-status`);
      if (!response.ok) {
        applyRoutingMode('cdn');
        return routingMode;
      }

      const payload = await response.json();
      const available = payload?.data?.available === true;
      applyRoutingMode(available ? 'proxy' : 'cdn');
    } catch {
      applyRoutingMode('cdn');
    }

    return routingMode;
  })();

  return initPromise;
};

export const resolveMediaUrl = (url, width = 400) => {
  if (!url?.trim()) {
    return '';
  }

  const trimmed = unwrapMediaUrl(url);

  if (isTmdbUrl(trimmed)) {
    if (routingMode === 'proxy') {
      const apiBase = import.meta.env.VITE_API_URL || '';
      return `${apiBase}/api/media/proxy?url=${encodeURIComponent(trimmed)}`;
    }
    return toWsrvProxyUrl(trimmed, width);
  }

  return trimmed;
};

export const handlePosterError = (event) => {
  const img = event?.target;
  if (!img) {
    return;
  }

  const originalUrl = unwrapMediaUrl(img.dataset.originalUrl || '');
  const attempt = parseInt(img.dataset.loadAttempt || '0', 10);
  const width = parseInt(img.dataset.width || '400', 10);

  if (originalUrl && isTmdbUrl(originalUrl) && attempt < 2) {
    img.dataset.loadAttempt = String(attempt + 1);
    const currentSrc = img.src || '';

    if (attempt === 0 && !currentSrc.includes('wsrv.nl')) {
      img.src = toWsrvProxyUrl(originalUrl, width);
      return;
    }

    if (attempt === 1 && !currentSrc.includes('/api/media/proxy')) {
      const apiBase = import.meta.env.VITE_API_URL || '';
      img.src = `${apiBase}/api/media/proxy?url=${encodeURIComponent(originalUrl)}`;
      return;
    }
  }

  img.onerror = null;
  if (img.src !== FALLBACK_POSTER) {
    img.src = FALLBACK_POSTER;
  }
};
