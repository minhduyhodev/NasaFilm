export const queryKeys = {
  wallet: ['wallet', 'summary'],
  myBookings: ['bookings', 'mine'],
  movies: (params) => ['movies', 'list', params],
  movieFilterOptions: ['movies', 'filterOptions'],
  onlineSpotlight: ['online', 'spotlight'],
  onlineCatalog: (params) => ['online', 'catalog', params],
  adminShowtimes: ['admin', 'showtimes'],
  boardingPass: (bookingUuid) => ['pre-show', 'boarding', bookingUuid],
};
