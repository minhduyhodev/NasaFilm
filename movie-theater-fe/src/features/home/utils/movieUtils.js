import { getVideoSource, getHeroBackgroundSource } from './videoSourceUtils';
import { movieService } from '../../../shared/services/movieService';
import { vodService } from '../../../shared/services/vodService';
import { resolveMediaUrl, unwrapMediaUrl, isAwsMovieStreamingUrl } from '../../../shared/utils/mediaUrlUtils';
import {
  VOD_DEFAULT_DURATION_MINUTES,
  VOD_PLAYBACK_STATE,
  VOD_TICKET_WINDOW_MULTIPLIER,
} from '../../../shared/constants/vod';

export const isOnlineMovie = (movie) =>
  movie?.screeningMode === 'ONLINE_ONLY' || movie?.screeningMode === 'BOTH';

/** Nhãn tuổi ngắn gọn cho badge poster (vd: 0+, 13+, 18+). */
export const formatAgeRestrictionBadge = (ageRestriction) => {
  const age = (ageRestriction || '').trim().toUpperCase();
  if (!age) return '';
  if (age === 'P') return '3+';
  if (age === 'K') return '<13';
  const match = age.match(/T?(\d{1,2})/);
  if (match) {
    const years = parseInt(match[1], 10);
    if (years === 0) return '3+';
    return `${years}+`;
  }
  return age;
};

export const resolveAgeRestrictionClass = (ageRestriction, prefix = 'movie-card__age') => {
  const age = (ageRestriction || '').trim().toUpperCase();
  if (age === 'P') return `${prefix} ${prefix}--p`;
  if (age === 'K') return `${prefix} ${prefix}--k`;
  if (age.includes('18')) return `${prefix} ${prefix}--t18`;
  if (age.includes('16')) return `${prefix} ${prefix}--t16`;
  if (age.includes('13')) return `${prefix} ${prefix}--t13`;
  return `${prefix} ${prefix}--default`;
};

/** URL poster gốc từ API (chưa qua CDN/proxy). */
const isPosterImageUrl = (url) => {
  if (!url?.trim()) return false;
  const trimmed = url.trim();
  if (/\.(mp4|webm|m3u8|m3u|mov|avi|mkv|flv)(\?.*)?$/i.test(trimmed)) return false;
  if (/youtube\.com|youtu\.be|vimeo\.com/i.test(trimmed)) return false;
  return true;
};

export const pickPosterMediaUrl = (movie) => {
  if (!movie) return '';

  if (movie.posterRaw?.trim() && isPosterImageUrl(movie.posterRaw)) {
    return unwrapMediaUrl(movie.posterRaw);
  }

  const medias = movie.medias || [];

  const posterMedia = medias.find((m) => m.mediaType === 'POSTER')?.mediaUrl;
  if (posterMedia?.trim() && isPosterImageUrl(posterMedia)) {
    return unwrapMediaUrl(posterMedia);
  }

  const primaryMedia = medias.find((m) => m.isPrimary)?.mediaUrl;
  if (primaryMedia?.trim() && isPosterImageUrl(primaryMedia)) {
    return unwrapMediaUrl(primaryMedia);
  }

  const backdropMedia = medias.find((m) => m.mediaType === 'BACKDROP')?.mediaUrl;
  if (backdropMedia?.trim() && isPosterImageUrl(backdropMedia)) {
    return unwrapMediaUrl(backdropMedia);
  }

  const fallback = movie.primaryMediaUrl || movie.poster;
  if (fallback?.trim() && isPosterImageUrl(fallback)) {
    return unwrapMediaUrl(fallback);
  }

  return '';
};

export const getMoviePosterUrl = (movie) => {
  const raw = pickPosterMediaUrl(movie);
  return raw ? resolveMediaUrl(raw) : '';
};

export const getMovieStreamingUrl = (movie) => {
  if (!movie) return '';

  const candidates = [];
  if (movie.streamingUrl?.trim()) {
    candidates.push(movie.streamingUrl.trim());
  }

  const medias = movie.medias || [];
  const streamTypes = ['STREAM', 'FULL_MOVIE', 'VIDEO', 'ONLINE', 'MOVIE'];
  for (const media of medias) {
    if (streamTypes.includes(media.mediaType) && media.mediaUrl?.trim()) {
      candidates.push(media.mediaUrl.trim());
    }
  }

  // Online watch chỉ chấp nhận S3 movie/ — không fallback trailer YouTube
  for (const url of candidates) {
    if (isAwsMovieStreamingUrl(url)) {
      return url;
    }
  }
  return '';
};

export const getMovieTrailerUrl = (movie) => {
  if (!movie) return '';

  const medias = movie.medias || [];
  const trailerMedia = medias.find((m) => m.mediaType === 'TRAILER')?.mediaUrl;
  const raw = trailerMedia?.trim() || '';
  if (!raw) return '';
  // Resolve border/key → stream so TrailerModal plays S3 trailers without a ticket.
  return resolveMediaUrl(raw) || raw;
};

/** Prefer direct/HLS trailer for hero autoplay; fall back to any trailer (e.g. YouTube). */
export const getHeroTrailerUrl = (movie) => {
  if (!movie) return '';

  const medias = movie.medias || [];
  const trailers = medias
    .filter((m) => m.mediaType === 'TRAILER' && m.mediaUrl?.trim())
    .map((m) => m.mediaUrl.trim());

  if (!trailers.length) return '';

  const directTrailer = trailers.find((url) => {
    const source = getVideoSource(url);
    return source.type === 'direct' || source.type === 'hls';
  });

  return directTrailer || trailers[0];
};

const preloadImageUrl = (url) =>
  new Promise((resolve) => {
    if (!url) {
      resolve();
      return;
    }
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = url;
  });

/** Preload hero backdrop (trailer thumbnail or poster) to avoid flash on /online entry. */
export const preloadHeroBackground = async (movie) => {
  if (!movie) return;

  const trailerUrl = getHeroTrailerUrl(movie);
  const heroSource = trailerUrl ? getHeroBackgroundSource(trailerUrl) : { type: 'none' };

  if (heroSource.type === 'image') {
    await preloadImageUrl(heroSource.url);
    return;
  }

  if (heroSource.type === 'none') {
    await preloadImageUrl(getMoviePosterUrl(movie));
  }
};

const GALLERY_MEDIA_TYPES = new Set(['POSTER', 'BACKDROP', 'BANNER', 'STILL']);

const isDisplayableImageUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (/\.(mp4|webm|m3u8|m3u|mov|avi|mkv|flv)(\?.*)?$/i.test(trimmed)) return false;
  if (/youtube\.com|youtu\.be|vimeo\.com/i.test(trimmed)) return false;
  return true;
};

export const getMovieGalleryImages = (movie, limit = 4) => {
  if (!movie) return [];

  const seen = new Set();
  const urls = [];

  const addUrl = (url) => {
    if (!isDisplayableImageUrl(url)) return;
    const resolved = resolveMediaUrl(unwrapMediaUrl(url.trim()));
    if (!resolved || seen.has(resolved)) return;
    seen.add(resolved);
    urls.push(resolved);
  };

  addUrl(getMoviePosterUrl(movie));

  for (const media of movie.medias || []) {
    const type = (media.mediaType || '').toUpperCase();
    if (!GALLERY_MEDIA_TYPES.has(type)) continue;
    addUrl(media.mediaUrl);
  }

  return urls.slice(0, limit);
};

export const mapApiMovies = (content = []) =>
  content.map((m) => {
    const rawPoster = pickPosterMediaUrl(m);
    return {
      ...m,
      posterRaw: rawPoster,
      primaryMediaUrl: rawPoster,
      poster: rawPoster,
      hoverDetails: {
        fullTitle: m.title,
        genre: m.genres ? m.genres.join(', ') : '',
        duration: m.durationMinutes ? `${m.durationMinutes}'` : '',
        country: m.countries ? m.countries.join(', ') : '',
        language: 'Phụ đề / Lồng tiếng',
      },
    };
  });

export const filterOnlineMovies = (movies = []) => movies.filter(isOnlineMovie);

export const sortMoviesByReleaseDate = (movies = []) =>
  [...movies].sort((a, b) => {
    const dateA = a.releaseDate ? new Date(a.releaseDate).getTime() : 0;
    const dateB = b.releaseDate ? new Date(b.releaseDate).getTime() : 0;
    return dateB - dateA;
  });

/** UUID hoặc slug — ưu tiên slug cho URL đẹp, UUID vẫn dùng được. */
export const getMoviePathId = (movieOrId) => {
  if (!movieOrId) return '';
  if (typeof movieOrId === 'string') return movieOrId;
  return movieOrId.slug || movieOrId.uuid || '';
};

export const getMovieDetailPath = (movieOrId, { online = false } = {}) => {
  const id = getMoviePathId(movieOrId);
  return id ? (online ? `/movie/${id}?from=online` : `/movie/${id}`) : '/movies';
};

export const getOnlineActivatePath = (movieOrId) => {
  const id = getMoviePathId(movieOrId);
  return id ? `/online/activate/${id}` : '/online';
};

export const getOnlineWatchPath = (movieOrId) => {
  const id = getMoviePathId(movieOrId);
  return id ? `/watch/${id}` : '/online';
};

/** Ước tính thời điểm hết hạn xem VOD (khớp BE: duration × lockMultiplier). */
export const estimateVodExpiresAt = (
  movie,
  lockMultiplier = VOD_TICKET_WINDOW_MULTIPLIER
) => {
  const durationMinutes = movie?.durationMinutes || VOD_DEFAULT_DURATION_MINUTES;
  const totalMinutes = Math.round(durationMinutes * lockMultiplier);
  return new Date(Date.now() + totalMinutes * 60 * 1000).toISOString();
};

/** BE playbackState: NONE | WAITING_FOR_PLAY | STREAMING | EXPIRED */
export const isVodTicketExpired = (vodStatus) =>
  Boolean(vodStatus?.hasPurchased && vodStatus?.playbackState === VOD_PLAYBACK_STATE.EXPIRED);

export const isVodTicketActive = (vodStatus) =>
  Boolean(
    vodStatus?.hasPurchased &&
      vodStatus?.playbackState !== VOD_PLAYBACK_STATE.EXPIRED &&
      vodStatus?.playbackState !== VOD_PLAYBACK_STATE.NONE
  );

export const canPurchaseVodTicket = (vodStatus) =>
  !vodStatus?.hasPurchased || isVodTicketExpired(vodStatus);

export const canWatchOnlineDirectly = (vodStatus) =>
  Boolean(
    vodStatus?.hasPurchased &&
      vodStatus?.playbackState === VOD_PLAYBACK_STATE.STREAMING &&
      vodStatus?.firstPlayedAt
  );

export const getOnlineMoviePath = (movieOrId, vodStatus = null) => {
  const id = getMoviePathId(movieOrId);
  if (!id) return '/online';
  if (canWatchOnlineDirectly(vodStatus)) return getOnlineWatchPath(id);
  return getOnlineActivatePath(id);
};

export const getOnlineActionLabel = (vodStatus, fallback = 'Xem ngay') => {
  if (canWatchOnlineDirectly(vodStatus)) return 'Tiếp tục xem';
  if (isVodTicketExpired(vodStatus)) return 'Vé xem online';
  if (vodStatus?.hasPurchased && vodStatus?.playbackState === VOD_PLAYBACK_STATE.WAITING_FOR_PLAY) {
    return 'Kích hoạt vé';
  }
  return fallback;
};

/** Phim online đã mua vé nhưng chưa bấm phát lần đầu (WAITING_FOR_PLAY). */
export async function fetchPendingActivationMovies({ excludeMovieUuid, limit = 6 } = {}) {
  try {
    const bookings = await vodService.getMyBookings();
    const movieUuids = [...new Set(
      (bookings || [])
        .filter((booking) => isOnlineBooking(booking) && booking.movieUuid)
        .map((booking) => booking.movieUuid)
    )].filter((uuid) => uuid && uuid !== excludeMovieUuid);

    if (movieUuids.length === 0) return [];

    const [statusBatch, summaries] = await Promise.all([
      vodService.getStatusBatch(movieUuids),
      movieService.getMovieSummaries(movieUuids),
    ]);
    const summaryByUuid = new Map((summaries || []).map((s) => [s.uuid, s]));

    const pending = movieUuids
      .map((movieUuid) => {
        const status = statusBatch?.[movieUuid];
        const summary = summaryByUuid.get(movieUuid);
        if (
          !status?.hasPurchased ||
          status?.playbackState !== VOD_PLAYBACK_STATE.WAITING_FOR_PLAY ||
          !summary
        ) {
          return null;
        }
        return mapApiMovies([{
          uuid: summary.uuid,
          title: summary.title,
          ageRestriction: summary.ageRestriction,
          primaryMediaUrl: summary.primaryMediaUrl,
        }])[0];
      })
      .filter(Boolean);

    return pending.slice(0, limit);
  } catch {
    return [];
  }
}

export const formatVodTicketCode = (bookingUuid) => {
  if (!bookingUuid) return '';
  const raw = String(bookingUuid);
  const prefix = raw.length >= 8 ? raw.substring(0, 8) : raw;
  return `VOD-${prefix}`;
};

/** Che 3 ký tự cuối mã vé trên profile — mã đầy đủ chỉ có trong email. */
export const maskTicketCode = (code) => {
  if (!code) return '—';
  const str = String(code).trim();
  if (str.length <= 3) return '*'.repeat(str.length);
  return `${str.slice(0, -3)}***`;
};

/** Hiển thị gọn mã vé trên màn hình xác nhận — tránh tràn ô. */
export const formatCompactTicketCode = (code) => {
  if (!code) return '—';
  const str = String(code).trim();
  if (str.length <= 14) return maskTicketCode(str);
  return `${str.slice(0, 8)}···${str.slice(-4)}`;
};

/** Mã nhiệm vụ ngắn từ booking UUID (đồng bộ boarding pass). */
export const formatMissionCode = (bookingUuid) => {
  if (!bookingUuid) return '—';
  const raw = String(bookingUuid).replace(/-/g, '');
  return `NF-${raw.slice(0, 8).toUpperCase()}`;
};

export const formatDisplayTicketCode = (booking) => {
  if (!booking) return '—';
  const raw = booking.id || booking.ticketCode || '';
  if (raw) return maskTicketCode(raw);
  if (booking.bookingUuid) return maskTicketCode(formatVodTicketCode(booking.bookingUuid));
  return '—';
};

export const normalizeBookingCode = (value) =>
  (value || '').trim().toUpperCase().replace(/[\s-]/g, '');

export const matchBookingCode = (booking, input, movieUuid = null) => {
  if (movieUuid && booking?.movieUuid && booking.movieUuid !== movieUuid) {
    return false;
  }
  const status = (booking?.status || '').toLowerCase();
  if (status === 'cancelled' || status === 'expired' || status === 'used') {
    return false;
  }
  const code = normalizeBookingCode(input);
  if (!code) return false;

  const ticketCode = normalizeBookingCode(booking?.id || '');
  const bookingUuid = normalizeBookingCode(booking?.bookingUuid || '');

  return ticketCode === code || bookingUuid === code;
};

/** Chuẩn hóa hiển thị suất chiếu từ chuỗi BE `HH:mm | dd/MM/yyyy` hoặc ISO. */
export const formatShowtimeDisplay = (value, mode = 'full') => {
  if (!value) return '—';
  const raw = String(value).trim();
  if (raw.includes(' | ')) {
    const [timePart, datePart] = raw.split(' | ').map((s) => s.trim());
    if (mode === 'time') return timePart || raw;
    if (mode === 'date') return datePart || raw;
    return `${timePart} · ${datePart}`;
  }
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  if (mode === 'time') {
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  }
  if (mode === 'date') {
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const VOD_VERIFIED_KEY = (movieUuid) => `vodVerified:${movieUuid}`;

export const setTemporaryVodToken = (movieUuid, bookingUuid) => {
  const item = {
    value: bookingUuid,
    expiry: Date.now() + 10 * 60 * 1000 // 10 minutes
  };
  localStorage.setItem(VOD_VERIFIED_KEY(movieUuid), JSON.stringify(item));
};

export const getTemporaryVodToken = (movieUuid) => {
  const str = localStorage.getItem(VOD_VERIFIED_KEY(movieUuid));
  if (!str) return null;
  try {
    const item = JSON.parse(str);
    if (Date.now() > item.expiry) {
      localStorage.removeItem(VOD_VERIFIED_KEY(movieUuid));
      return null;
    }
    return item.value;
  } catch {
    localStorage.removeItem(VOD_VERIFIED_KEY(movieUuid));
    return null;
  }
};

export const removeTemporaryVodToken = (movieUuid) => {
  localStorage.removeItem(VOD_VERIFIED_KEY(movieUuid));
};

export const isOnlineBooking = (booking) =>
  booking?.bookingType === 'ONLINE' ||
  (booking?.cinema || '').toLowerCase().includes('vod');

/** Vé còn hiệu lực (chưa hết hạn, chưa hủy, chưa sử dụng). */
export const isLiveTicket = (booking) => {
  const status = (booking?.status || '').toLowerCase();
  if (status === 'cancelled' || status === 'used') return false;
  if (status === 'active') return true;
  // VOD chưa kích hoạt vẫn sáng (kể cả khi BE gán nhầm expired)
  if (isOnlineBooking(booking) && booking?.vodActivated !== true) return true;
  return false;
};

/** Nhãn trạng thái cho vé không còn hiệu lực. */
export const getTicketArchiveMeta = (booking) => {
  const status = (booking?.status || '').toLowerCase();
  const bookingStatus = (booking?.bookingStatus || '').toUpperCase();
  if (status === 'cancelled') {
    if (bookingStatus === 'REFUND_PENDING') {
      return { label: 'Đã hủy · Chờ hoàn tiền', tone: 'cancelled' };
    }
    if (bookingStatus === 'REFUNDED' || bookingStatus === 'REFUND_PROCESSING') {
      return { label: 'Đã hủy · Đã hoàn tiền', tone: 'cancelled' };
    }
    return { label: 'Đã hủy', tone: 'cancelled' };
  }
  if (status === 'used') return { label: 'Đã sử dụng', tone: 'used' };
  if (status === 'expired') return { label: 'Hết hạn', tone: 'expired' };
  return { label: 'Không còn hiệu lực', tone: 'expired' };
};

export const partitionBookingsByLive = (bookings = []) => {
  const live = [];
  const archived = [];
  bookings.forEach((b) => {
    if (isLiveTicket(b)) live.push(b);
    else archived.push(b);
  });
  return { live, archived };
};

/** Vé hết hạn / đã hủy / đã dùng — đẩy xuống cuối danh sách. */
export const sortBookingsForDisplay = (bookings = []) =>
  [...bookings].sort((a, b) => {
    const aLive = isLiveTicket(a) ? 0 : 1;
    const bLive = isLiveTicket(b) ? 0 : 1;
    return aLive - bLive;
  });

export const enrichBookingsWithMovieMeta = async (bookings = []) => {
  const needsFetch = bookings.filter(
    (b) => b.movieUuid && (!b.moviePosterUrl || !b.movieAgeRestriction)
  );
  const movieIds = [...new Set(needsFetch.map((b) => b.movieUuid))];
  const metaByMovie = new Map();

  if (movieIds.length > 0) {
    try {
      const summaries = await movieService.getMovieSummaries(movieIds);
      summaries.forEach((summary) => {
        metaByMovie.set(summary.uuid, {
          poster: summary.primaryMediaUrl || '',
          ageRestriction: summary.ageRestriction || '',
        });
      });
    } catch {
      /* skip */
    }
  }

  return bookings.map((booking) => {
    const posterFromApi = booking.moviePosterUrl || booking.moviePoster;
    const meta = booking.movieUuid ? metaByMovie.get(booking.movieUuid) : null;
    return {
      ...booking,
      moviePoster: posterFromApi || meta?.poster || '',
      movieAgeRestriction: booking.movieAgeRestriction || meta?.ageRestriction || '',
    };
  });
};
