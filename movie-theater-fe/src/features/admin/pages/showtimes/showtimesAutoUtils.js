import { formatDateShort, formatTimeOnly } from './showtimesConstants';

export const PUBLISH_MODES = [
  {
    value: 'DRAFT',
    label: 'Lưu nháp',
    hint: 'Suất được tạo ở trạng thái Nháp — chỉnh sửa trước khi công bố.',
  },
  {
    value: 'SCHEDULED',
    label: 'Đưa lên lịch',
    hint: 'Chuyển sang Sắp chiếu — hiển thị lịch nhưng chưa mở bán vé.',
  },
  {
    value: 'OPEN_FOR_BOOKING',
    label: 'Mở bán vé ngay',
    hint: 'Tự động mở bán sau khi tạo — phù hợp khi đã sẵn sàng xuất vé.',
  },
];

export const buildAutoFormFromConfig = (config = {}, cinemas = []) => {
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 6);
  const toInputDate = (d) => d.toISOString().split('T')[0];

  return {
    startDate: toInputDate(today),
    endDate: toInputDate(tomorrow),
    cinemaUuid: cinemas[0]?.uuid || '',
    roomUuids: [],
    movieUuids: [],
    startTime: config.startTime ?? '08:00',
    endTime: config.endTime ?? '23:30',
    basePrice: config.basePrice ?? 60000,
    vipPrice: config.vipPrice ?? 90000,
    couplePrice: config.couplePrice ?? 120000,
    intervalMinutes: config.intervalMinutes ?? 15,
    trailerBuffer: config.trailerBuffer ?? 10,
    goldenHourWeight: config.goldenHourWeight ?? 1.2,
    weekendWeight: config.weekendWeight ?? 1.5,
    ratingWeight: config.ratingWeight ?? 1.0,
    genreWeight: config.genreWeight ?? 1.1,
    publishStatus: 'OPEN_FOR_BOOKING',
  };
};

export const getPreviewScoreClass = (score, config = {}) => {
  const high = config.previewScoreHigh ?? 25;
  const mid = config.previewScoreMid ?? 15;
  if (score >= high) {
    return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
  }
  if (score >= mid) {
    return 'bg-blue-500/10 border-blue-500/30 text-blue-400';
  }
  return 'bg-zinc-500/10 border-zinc-500/30 text-zinc-400';
};

export const groupPreviewByDate = (preview = []) => {
  const groups = new Map();
  preview.forEach((item, index) => {
    const key = formatDateShort(new Date(item.startTime));
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push({ ...item, _index: index });
  });
  return [...groups.entries()];
};

export const summarizePreview = (preview = [], selected = new Set()) => {
  const selectedItems = preview.filter((_, idx) => selected.has(idx));
  const movies = new Set(selectedItems.map((p) => p.movieUuid));
  const rooms = new Set(selectedItems.map((p) => p.cinemaRoomUuid));
  const dates = new Set(selectedItems.map((p) => formatDateShort(new Date(p.startTime))));

  return {
    total: preview.length,
    selectedCount: selectedItems.length,
    movieCount: movies.size,
    roomCount: rooms.size,
    dayCount: dates.size,
    avgScore: selectedItems.length
      ? (selectedItems.reduce((sum, p) => sum + (p.priorityScore || 0), 0) / selectedItems.length).toFixed(1)
      : '0',
  };
};

export const formatPreviewSlot = (item) =>
  `${formatTimeOnly(item.startTime)} → ${formatTimeOnly(item.endTime)}`;

export const MOVIE_STATUS_LABELS = {
  NOW_SHOWING: 'Đang chiếu',
  COMING_SOON: 'Sắp chiếu',
  ENDED: 'Đã kết thúc',
  DRAFT: 'Nháp',
};

export const AUTO_MOVIE_STATUS_FILTERS = [
  { value: 'SHOWING', label: 'Đang & sắp chiếu' },
  { value: 'NOW_SHOWING', label: 'Đang chiếu' },
  { value: 'COMING_SOON', label: 'Sắp chiếu' },
  { value: 'ALL', label: 'Tất cả' },
];

export const AUTO_MOVIE_SORT_OPTIONS = [
  { value: 'rating', label: 'Điểm cao' },
  { value: 'title', label: 'Tên A–Z' },
  { value: 'duration', label: 'Thời lượng' },
  { value: 'release', label: 'Ngày phát hành' },
];

export const getMovieStatusLabel = (status) =>
  MOVIE_STATUS_LABELS[String(status || '').toUpperCase()] || status || '—';

export const isTheaterEligibleMovie = (movie) => {
  const status = String(movie?.status || '').toUpperCase();
  if (!['NOW_SHOWING', 'COMING_SOON'].includes(status)) return false;
  const mode = String(movie?.screeningMode || 'BOTH').toUpperCase();
  return mode === 'THEATER_ONLY' || mode === 'BOTH';
};

export const getMoviePosterUrl = (movie) =>
  movie?.primaryMediaUrl || movie?.posterUrl || movie?.moviePosterUrl || '';

export const filterAutoScheduleMovies = (movies = [], { search = '', statusFilter = 'SHOWING' } = {}) => {
  const keyword = search.trim().toLowerCase();
  return movies.filter((movie) => {
    const status = String(movie.status || '').toUpperCase();
    if (statusFilter === 'SHOWING') {
      if (!['NOW_SHOWING', 'COMING_SOON'].includes(status)) return false;
    } else if (statusFilter !== 'ALL' && status !== statusFilter) {
      return false;
    }

    if (!keyword) return true;
    const haystack = [
      movie.title,
      ...(movie.genres || []),
      movie.ageRestriction,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(keyword);
  });
};

export const sortAutoScheduleMovies = (movies = [], sortKey = 'rating') => {
  const list = [...movies];
  list.sort((a, b) => {
    if (sortKey === 'title') {
      return String(a.title || '').localeCompare(String(b.title || ''), 'vi');
    }
    if (sortKey === 'duration') {
      return (b.durationMinutes || 0) - (a.durationMinutes || 0);
    }
    if (sortKey === 'release') {
      const aDate = a.releaseDate ? new Date(a.releaseDate).getTime() : 0;
      const bDate = b.releaseDate ? new Date(b.releaseDate).getTime() : 0;
      return bDate - aDate;
    }
    return (Number(b.rating) || 0) - (Number(a.rating) || 0);
  });
  return list;
};

export const selectShowingMovies = (movies = []) =>
  movies.filter(isTheaterEligibleMovie).map((m) => m.uuid);
