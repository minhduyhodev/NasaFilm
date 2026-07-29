const TMDB_HOST = 'image.tmdb.org';
const CLOUDINARY_HOST = 'res.cloudinary.com';
const WSRV_PROXY = 'https://wsrv.nl/';

/** Host bucket mentor — đồng bộ với BE {@code S3MediaBorderUtils.DEFAULT_BUCKET_HOST}. */
export const AWS_S3_BUCKET_HOST = 'java-06.s3.ap-southeast-1.amazonaws.com';

export const FALLBACK_POSTER =
  'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?q=80&w=400';

/** URLs đã 404 — tránh spam request khi DomeGallery lặp lại cùng poster */
const failedPosterUrls = new Set();

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

const S3_KEY_PREFIX_RE = /^(movie|poster|trailer)\//i;

/** Key S3 dạng movie/... | poster/... | trailer/... (không phải full URL). */
export const isAwsS3Key = (url) => {
  if (!url?.trim()) return false;
  const trimmed = url.trim();
  return !trimmed.includes('://') && S3_KEY_PREFIX_RE.test(trimmed);
};

const toBorderFromKey = (key) =>
  `/api/media/border?key=${encodeURIComponent(key.replace(/^\/+/, ''))}`;

const toStreamFromKey = (key, token = null) => {
  let path = `/api/media/stream?key=${encodeURIComponent(key.replace(/^\/+/, ''))}`;
  if (token) {
    path += `&token=${encodeURIComponent(token)}`;
  }
  return path;
};

/** Lấy lại key S3 / URL gốc nếu đã bị bọc qua wsrv hoặc proxy/border/stream BE. */
export const unwrapMediaUrl = (url) => {
  if (!url?.trim()) {
    return '';
  }
  const trimmed = url.trim();
  if (isAwsS3Key(trimmed)) {
    return trimmed;
  }
  try {
    if (trimmed.includes('wsrv.nl')) {
      const inner = new URL(trimmed).searchParams.get('url');
      if (inner) {
        return decodeURIComponent(inner);
      }
    }
    if (
      trimmed.includes('/api/media/proxy')
      || trimmed.includes('/api/media/border')
      || trimmed.includes('/api/media/stream')
    ) {
      const parsed = trimmed.startsWith('http')
        ? new URL(trimmed)
        : new URL(trimmed, 'http://localhost');
      const key = parsed.searchParams.get('key');
      if (key) {
        return decodeURIComponent(key);
      }
      const inner = parsed.searchParams.get('url');
      if (inner) {
        return decodeURIComponent(inner);
      }
    }
    if (new RegExp(AWS_S3_BUCKET_HOST.replace(/\./g, '\\.'), 'i').test(trimmed)) {
      const key = new URL(trimmed).pathname.replace(/^\//, '');
      if (S3_KEY_PREFIX_RE.test(key)) {
        return key;
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
  const key = unwrapMediaUrl(url.trim()).toLowerCase();
  return key.startsWith('movie/');
};

/** Border S3 qua BE — giữ nguyên path relative để Vite proxy. */
export const isBorderMediaUrl = (url) =>
  typeof url === 'string' && url.includes('/api/media/border');

export const isStreamMediaUrl = (url) =>
  typeof url === 'string' && url.includes('/api/media/stream');

export const resolveMediaUrl = (url, width = 400) => {
  if (!url?.trim()) {
    return '';
  }

  const trimmed = url.trim();

  // Stream URL giữ nguyên; border trailer/movie → ép sang stream Range.
  if (isStreamMediaUrl(trimmed)) {
    return trimmed;
  }
  if (isBorderMediaUrl(trimmed)) {
    try {
      const parsed = trimmed.startsWith('http')
        ? new URL(trimmed)
        : new URL(trimmed, 'http://localhost');
      const key = decodeURIComponent(parsed.searchParams.get('key') || '');
      if (/^(movie|trailer)\//i.test(key)) {
        return toStreamFromKey(key);
      }
    } catch {
      // fall through — giữ border cho poster
    }
    return trimmed;
  }

  const unwrapped = unwrapMediaUrl(trimmed);

  if (isAwsS3Key(unwrapped)) {
    // movie/ + trailer/: stream Range same-origin. Poster: border redirect.
    const keyLower = unwrapped.toLowerCase();
    if (keyLower.startsWith('movie/') || keyLower.startsWith('trailer/')) {
      return toStreamFromKey(unwrapped);
    }
    return toBorderFromKey(unwrapped);
  }

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
      return toBorderFromKey(key);
    } catch {
      return unwrapped;
    }
  }

  return unwrapped;
};

/**
 * URL phát cho &lt;video&gt;: ưu tiên same-origin `/api/media/stream` (hỗ trợ Range),
 * tránh 302 sang S3 khiến player xoay/kẹt.
 * Trailer: stream công khai (không token). Movie full: stream + vé VOD.
 */
export const resolvePlayableMediaUrl = async (url) => {
  if (!url?.trim()) {
    return '';
  }
  const trimmed = url.trim();
  // Prefer cookie-authenticated stream URL without query token leakage.
  if (isStreamMediaUrl(trimmed)) {
    try {
      const parsed = trimmed.startsWith('http')
        ? new URL(trimmed)
        : new URL(trimmed, 'http://localhost');
      parsed.searchParams.delete('token');
      const path = `${parsed.pathname}${parsed.search}`;
      return trimmed.startsWith('http') ? parsed.toString() : path;
    } catch {
      return trimmed;
    }
  }
  const key = unwrapMediaUrl(trimmed);
  const keyLower = key.toLowerCase();
  if (keyLower.startsWith('movie/') || keyLower.startsWith('trailer/')) {
    return toStreamFromKey(key);
  }
  return resolveMediaUrl(trimmed) || trimmed;
};

export const markPosterUrlFailed = (url) => {
  const key = unwrapMediaUrl(url || '');
  if (key) failedPosterUrls.add(key);
};

export const isFailedPosterUrl = (url) => {
  const key = unwrapMediaUrl(url || '');
  return Boolean(key && failedPosterUrls.has(key));
};

export const handlePosterError = (event) => {
  const img = event?.target;
  if (!img) {
    return;
  }

  const originalUrl = unwrapMediaUrl(img.dataset.originalUrl || img.currentSrc || img.src || '');
  const attempt = parseInt(img.dataset.loadAttempt || '0', 10);
  const width = parseInt(img.dataset.width || '400', 10);

  if (!originalUrl) {
    img.onerror = null;
    if (img.src !== FALLBACK_POSTER) {
      img.src = FALLBACK_POSTER;
    }
    return;
  }

  // Cloudinary optimized transform 404 → thử URL gốc 1 lần (chưa mark failed)
  if (isCloudinaryUrl(originalUrl) && attempt < 1) {
    img.dataset.loadAttempt = '1';
    img.src = originalUrl;
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

  // Border/S3: thử lại raw width 1 lần rồi fallback
  if ((isBorderMediaUrl(originalUrl) || isAwsS3Key(originalUrl)) && attempt < 1) {
    img.dataset.loadAttempt = '1';
    img.src = resolveMediaUrl(originalUrl, width) || FALLBACK_POSTER;
    return;
  }

  markPosterUrlFailed(originalUrl);
  img.onerror = null;
  if (img.src !== FALLBACK_POSTER) {
    img.src = FALLBACK_POSTER;
  }
};

/** Resolve poster an toàn — URL hỏng / trống → fallback cinema */
export const resolveSafePosterUrl = (url, width = 400) => {
  if (!url?.trim()) return FALLBACK_POSTER;
  const raw = unwrapMediaUrl(url.trim());
  if (!raw || isFailedPosterUrl(raw)) return FALLBACK_POSTER;
  return resolveMediaUrl(raw, width) || FALLBACK_POSTER;
};

/**
 * Probe một URL ảnh (một lần). Resolve true nếu load được.
 * Dùng để lọc poster 404 trước khi nhồi vào DomeGallery.
 */
export const probeImageUrl = (url, timeoutMs = 4500) =>
  new Promise((resolve) => {
    if (!url?.trim()) {
      resolve(false);
      return;
    }
    if (isFailedPosterUrl(url)) {
      resolve(false);
      return;
    }
    const img = new Image();
    let settled = false;
    const finish = (ok) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      if (!ok) markPosterUrlFailed(url);
      resolve(ok);
    };
    const timer = window.setTimeout(() => finish(false), timeoutMs);
    img.onload = () => finish(true);
    img.onerror = () => finish(false);
    img.decoding = 'async';
    img.src = url;
  });

