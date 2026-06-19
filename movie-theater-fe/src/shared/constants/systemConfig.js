export const SYSTEM_CONFIG_STORAGE_KEY = 'lorafilm_system_config';

export const DEFAULT_SYSTEM_CONFIG = {
  startTime: '08:00',
  endTime: '23:30',
  intervalMinutes: 15,
  trailerBuffer: 10,
  goldenHourWeight: 1.2,
  weekendWeight: 1.5,
  ratingWeight: 1.0,
  genreWeight: 1.1,
  basePrice: 60000,
  vipPrice: 90000,
  couplePrice: 120000,
  onlineStreamingPrice: 45000,
  seatLockMinutes: 5,
  pointsEarningRatio: 5,
  pointsToCashValue: 1000,
  sessionTimeoutHours: 24,
};
