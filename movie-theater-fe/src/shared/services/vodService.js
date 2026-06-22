import { bookingService } from './bookingService';

/**
 * Lớp service VOD/streaming — đồng bộ VodController + BookingService (BE).
 *
 * Endpoints:
 * - GET  /api/vod/status/{movieUuid}
 * - POST /api/vod/play/{movieUuid}
 * - POST /api/vod/heartbeat/{movieUuid}?streamToken=
 * - POST /api/vod/resend-ticket/{movieUuid}
 * - POST /api/bookings/confirm-online
 * - GET  /api/bookings/my-bookings
 */
export const vodService = {
  getStatus(movieUuid) {
    return bookingService.getVodStatus(movieUuid);
  },

  activatePlay(movieUuid) {
    return bookingService.activateVodPlay(movieUuid);
  },

  heartbeat(movieUuid, streamToken) {
    return bookingService.vodHeartbeat(movieUuid, streamToken);
  },

  resendTicketEmail(movieUuid) {
    return bookingService.resendVodTicketEmail(movieUuid);
  },

  confirmOnlineBooking(movieUuid, promotionCode = null) {
    return bookingService.confirmOnlineBooking(movieUuid, promotionCode);
  },

  getMyBookings() {
    return bookingService.getMyBookings();
  },
};

export default vodService;
