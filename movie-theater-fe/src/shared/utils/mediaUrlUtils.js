const TMDB_HOST = 'image.tmdb.org';
const CLOUDINARY_HOST = 'res.cloudinary.com';
const WSRV_PROXY = 'https://wsrv.nl/';

/** Host bucket mentor — đồng bộ với BE {@code S3MediaBorderUtils.DEFAULT_BUCKET_HOST}. */
export const AWS_S3_BUCKET_HOST = 'java-06.s3.ap-southeast-1.amazonaws.com';

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

/** Khởi tạo routing ảnh — giữ API tương thích, poster luôn qua wsrv trước. */
export const initMediaUrlRouting = () => {
  if (!initPromise) {
    initPromise = Promise.resolve('cdn');
  }
  return initPromise;
};

/** Lấy lại URL TMDB/S3 gốc nếu đã bị bọc qua wsrv hoặc proxy/border BE. */
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
    if (trimmed.includes('/api/media/proxy') || trimmed.includes('/api/media/border')) {
      const parsed = trimmed.startsWith('http')
        ? new URL(trimmed)
        : new URL(trimmed, 'http://localhost');
      const key = parsed.searchParams.get('key');
      if (key) {
        return `https://${AWS_S3_BUCKET_HOST}/${decodeURIComponent(key)}`;
      }
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

/** Link file phim đầy đủ trên S3 (prefix movie/). */
export const isAwsMovieStreamingUrl = (url) => {
  if (!url?.trim()) return false;
  const lower = url.trim().toLowerCase();
  if (lower.includes('/api/media/border')) {
    try {
      const parsed = lower.startsWith('http') ? new URL(url.trim()) : new URL(url.trim(), 'http://localhost');
      const key = decodeURIComponent(parsed.searchParams.get('key') || '');
      return key.toLowerCase().startsWith('movie/');
    } catch {
      return false;
    }
  }
  return lower.includes(AWS_S3_BUCKET_HOST) && lower.includes('/movie/');
};

/** Border S3 qua BE — giữ nguyên path relative để Vite proxy. */
export const isBorderMediaUrl = (url) =>
  typeof url === 'string' && url.includes('/api/media/border');

export const resolveMediaUrl = (url, width = 400) => {
  if (!url?.trim()) {
    return '';
  }

  const trimmed = url.trim();

  // FE luôn dùng link border của BE (không unwrap ra S3).
  if (isBorderMediaUrl(trimmed)) {
    return trimmed.startsWith('http') ? trimmed : trimmed;
  }

  const unwrapped = unwrapMediaUrl(trimmed);

  if (isCloudinaryUrl(unwrapped)) {
    return toCloudinaryOptimizedUrl(unwrapped, width);
  }

  if (isTmdbUrl(unwrapped)) {
    return toWsrvProxyUrl(unwrapped, width);
  }

  // Object URL S3 thô → bọc border
  if (new RegExp(AWS_S3_BUCKET_HOST.replace(/\./g, '\\.'), 'i').test(unwrapped)) {
    try {
      const key = new URL(unwrapped).pathname.replace(/^\//, '');
      return `/api/media/border?key=${encodeURIComponent(key)}`;
    } catch {
      return unwrapped;
    }
  }

  return unwrapped;
};

export const handlePosterError = (event) => {
  const img = event?.target;
  if (!img) {
    return;
  }

  const originalUrl = unwrapMediaUrl(img.dataset.originalUrl || '');
  const attempt = parseInt(img.dataset.loadAttempt || '0', 10);
  const _width = parseInt(img.dataset.width || '400', 10);

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
