const TMDB_HOST = 'image.tmdb.org';
const CLOUDINARY_HOST = 'res.cloudinary.com';
const WSRV_PROXY = 'https://wsrv.nl/';

export const FALLBACK_POSTER =
  'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?q=80&w=400';

let initPromise = null;

export const isTmdbUrl = (url) =>
  typeof url === 'string' && url.includes(TMDB_HOST);

export const isCloudinaryUrl = (url) =>
  typeof url === 'string' && url.includes(CLOUDINARY_HOST);

/** Cloudinary auto-format (WebP/AVIF) + quality + width transform. */
export const toCloudinaryOptimizedUrl = (url, width = 400) => {
  const trimmed = url.trim();
  const marker = '/upload/';
  const markerIndex = trimmed.indexOf(marker);
  if (markerIndex === -1) {
    return trimmed;
  }

  const afterUpload = trimmed.slice(markerIndex + marker.length);
  if (/^(f_auto|w_\d)/.test(afterUpload)) {
    return trimmed;
  }

  const transform = `f_auto,q_auto,w_${width}`;
  return `${trimmed.slice(0, markerIndex + marker.length)}${transform}/${afterUpload}`;
};

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

/** Khởi tạo routing ảnh — giữ API tương thích, poster luôn qua wsrv trước. */
export const initMediaUrlRouting = () => {
  if (!initPromise) {
    initPromise = Promise.resolve('cdn');
  }
  return initPromise;
};

export const resolveMediaUrl = (url, width = 400) => {
  if (!url?.trim()) {
    return '';
  }

  const trimmed = unwrapMediaUrl(url);

  if (isCloudinaryUrl(trimmed)) {
    return toCloudinaryOptimizedUrl(trimmed, width);
  }

  if (isTmdbUrl(trimmed)) {
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

  if (!originalUrl) {
    img.onerror = null;
    if (img.src !== FALLBACK_POSTER) {
      img.src = FALLBACK_POSTER;
    }
    return;
  }

  if (isTmdbUrl(originalUrl) && attempt < 2) {
    img.dataset.loadAttempt = String(attempt + 1);

    if (attempt === 0) {
      img.src = originalUrl;
      return;
    }

    if (attempt === 1) {
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
