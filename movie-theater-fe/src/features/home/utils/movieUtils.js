import { getVideoSource, getHeroBackgroundSource } from './videoSourceUtils';
import { movieService } from '../../../shared/services/movieService';
import { resolveMediaUrl, unwrapMediaUrl } from '../../../shared/utils/mediaUrlUtils';

export const isOnlineMovie = (movie) =>
  movie?.screeningMode === 'ONLINE_ONLY' || movie?.screeningMode === 'BOTH';

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

  if (movie.streamingUrl?.trim()) return movie.streamingUrl.trim();

  const medias = movie.medias || [];
  const streamTypes = ['STREAM', 'FULL_MOVIE', 'VIDEO', 'ONLINE'];
  const streamMedia = medias.find((m) => streamTypes.includes(m.mediaType))?.mediaUrl;
  if (streamMedia?.trim()) return streamMedia.trim();

  const trailerMedia = medias.find((m) => m.mediaType === 'TRAILER')?.mediaUrl;
  return trailerMedia?.trim() || '';
};

export const getMovieTrailerUrl = (movie) => {
  if (!movie) return '';

  const medias = movie.medias || [];
  const trailerMedia = medias.find((m) => m.mediaType === 'TRAILER')?.mediaUrl;
  return trailerMedia?.trim() || '';
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

export const getMovieDetailPath = (uuid, { online = false } = {}) =>
  uuid ? (online ? `/movie/${uuid}?from=online` : `/movie/${uuid}`) : '/movies';

export const getOnlineActivatePath = (uuid) =>
  uuid ? `/online/activate/${uuid}` : '/online';

export const getOnlineWatchPath = (uuid) =>
  uuid ? `/watch/${uuid}` : '/online';

import { VOD_PLAYBACK_STATE } from '../../../shared/constants/vod';

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

export const getOnlineMoviePath = (uuid, vodStatus = null) => {
  if (!uuid) return '/online';
  if (canWatchOnlineDirectly(vodStatus)) return getOnlineWatchPath(uuid);
  return getOnlineActivatePath(uuid);
};

export const getOnlineActionLabel = (vodStatus, fallback = 'Xem ngay') => {
  if (canWatchOnlineDirectly(vodStatus)) return 'Tiếp tục xem';
  if (isVodTicketExpired(vodStatus)) return 'Vé xem online';
  if (vodStatus?.hasPurchased && vodStatus?.playbackState === VOD_PLAYBACK_STATE.WAITING_FOR_PLAY) {
    return 'Kích hoạt vé';
  }
  return fallback;
};

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
  const code = normalizeBookingCode(input);
  if (!code) return false;

  const ticketCode = normalizeBookingCode(booking?.id || '');
  const bookingUuid = normalizeBookingCode(booking?.bookingUuid || '');

  return (
    ticketCode === code ||
    bookingUuid === code ||
    (code.length >= 8 && bookingUuid.startsWith(code)) ||
    (code.length >= 8 && ticketCode.includes(code))
  );
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

/** Vé hết hạn / đã hủy / đã dùng — đẩy xuống cuối danh sách. */
export const sortBookingsForDisplay = (bookings = []) =>
  [...bookings].sort((a, b) => {
    const aLive = isLiveTicket(a) ? 0 : 1;
    const bLive = isLiveTicket(b) ? 0 : 1;
    return aLive - bLive;
  });

export const enrichBookingsWithMovieMeta = async (bookings = []) => {
  const needsFetch = bookings.filter((b) => b.movieUuid && !b.moviePosterUrl);
  const movieIds = [...new Set(needsFetch.map((b) => b.movieUuid))];
  const metaByMovie = new Map();

  if (movieIds.length > 0) {
    await Promise.all(
      movieIds.map(async (uuid) => {
        try {
          const detail = await movieService.getMovieDetail(uuid);
          metaByMovie.set(uuid, {
            poster: getMoviePosterUrl(detail),
            ageRestriction: detail.ageRestriction || '',
          });
        } catch {
          /* skip */
        }
      })
    );
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
