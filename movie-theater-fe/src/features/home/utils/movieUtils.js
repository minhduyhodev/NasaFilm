export const isOnlineMovie = (movie) =>
  movie?.screeningMode === 'ONLINE_ONLY' || movie?.screeningMode === 'BOTH';

export const getMoviePosterUrl = (movie) => {
  if (!movie) return '';

  if (movie.primaryMediaUrl) return movie.primaryMediaUrl;
  if (movie.poster) return movie.poster;

  const medias = movie.medias || [];
  const primaryMedia = medias.find((m) => m.isPrimary)?.mediaUrl;
  if (primaryMedia) return primaryMedia;

  const posterMedia = medias.find((m) => m.mediaType === 'POSTER')?.mediaUrl;
  if (posterMedia) return posterMedia;

  const backdropMedia = medias.find((m) => m.mediaType === 'BACKDROP')?.mediaUrl;
  return backdropMedia || '';
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
    if (!isDisplayableImageUrl(url) || seen.has(url)) return;
    seen.add(url);
    urls.push(url);
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
    const posterUrl = getMoviePosterUrl(m);
    return {
      ...m,
      primaryMediaUrl: posterUrl,
      poster: posterUrl,
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

export const getMovieDetailPath = (uuid, { online = false } = {}) =>
  uuid ? (online ? `/movie/${uuid}?from=online` : `/movie/${uuid}`) : '/movies';

export const getOnlineActivatePath = (uuid) =>
  uuid ? `/online/activate/${uuid}` : '/online';

export const getOnlineWatchPath = (uuid) =>
  uuid ? `/watch/${uuid}` : '/online';

/** BE playbackState: NONE | WAITING_FOR_PLAY | STREAMING | EXPIRED */
export const canWatchOnlineDirectly = (vodStatus) =>
  Boolean(
    vodStatus?.hasPurchased &&
      vodStatus?.playbackState === 'STREAMING' &&
      vodStatus?.firstPlayedAt
  );

export const getOnlineMoviePath = (uuid, vodStatus = null) => {
  if (!uuid) return '/online';
  if (canWatchOnlineDirectly(vodStatus)) return getOnlineWatchPath(uuid);
  return getOnlineActivatePath(uuid);
};

export const getOnlineActionLabel = (vodStatus, fallback = 'Xem ngay') => {
  if (canWatchOnlineDirectly(vodStatus)) return 'Tiếp tục xem';
  if (vodStatus?.hasPurchased && vodStatus?.playbackState === 'WAITING_FOR_PLAY') {
    return 'Kích hoạt vé';
  }
  return fallback;
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
