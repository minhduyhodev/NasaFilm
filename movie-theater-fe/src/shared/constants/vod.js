/** Khớp BookingService.getVodStatus — playbackState */
export const VOD_PLAYBACK_STATE = {
  NONE: 'NONE',
  WAITING_FOR_PLAY: 'WAITING_FOR_PLAY',
  STREAMING: 'STREAMING',
  EXPIRED: 'EXPIRED',
};

/** Khớp BE activateVodPlay: expiresAt = firstPlayedAt + durationMinutes × 2 */
export const VOD_TICKET_WINDOW_MULTIPLIER = 2;
export const VOD_DEFAULT_DURATION_MINUTES = 120;

export const calcVodTicketWindowMinutes = (durationMinutes) =>
  (durationMinutes || VOD_DEFAULT_DURATION_MINUTES) * VOD_TICKET_WINDOW_MULTIPLIER;
