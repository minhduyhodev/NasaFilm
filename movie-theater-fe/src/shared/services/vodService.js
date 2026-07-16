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

  getStatusBatch(movieUuids) {
    return bookingService.getVodStatusBatch(movieUuids);
  },

  activatePlay(movieUuid, bookingUuid = null) {
    return bookingService.activateVodPlay(movieUuid, bookingUuid);
  },

  heartbeat(movieUuid, streamToken, positionSeconds = null, durationSeconds = null) {
    return bookingService.vodHeartbeat(movieUuid, streamToken, positionSeconds, durationSeconds);
  },

  getHistory() {
    return bookingService.getVodHistory();
  },

  resendTicketEmail(movieUuid) {
    return bookingService.resendVodTicketEmail(movieUuid);
  },

  confirmOnlineBooking(movieUuid, promotionCode = null, paymentMethod = null, paymentIntentId = null) {
    return bookingService.confirmOnlineBooking(movieUuid, promotionCode, paymentMethod, paymentIntentId);
  },

  getMyBookings() {
    return bookingService.getMyBookings();
  },
};

export default vodService;
