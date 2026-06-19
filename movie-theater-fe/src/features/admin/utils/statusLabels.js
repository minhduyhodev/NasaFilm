export const MOVIE_STATUS_LABELS = {
  NOW_SHOWING: 'Đang chiếu',
  COMING_SOON: 'Sắp chiếu',
  DRAFT: 'Bản nháp',
  ENDED: 'Đã kết thúc',
  INACTIVE: 'Tạm ngưng',
};

export const getMovieStatusLabel = (status) =>
  MOVIE_STATUS_LABELS[status] || status || '—';
