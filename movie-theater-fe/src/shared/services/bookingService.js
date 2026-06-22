import { authService } from '../../features/auth/api/authService';

class BookingService {
  async getSeatMap(showtimeUuid, selectedSeatUuids = []) {
    try {
      const params = {};
      if (selectedSeatUuids && selectedSeatUuids.length > 0) {
        params.selectedSeatUuids = selectedSeatUuids.join(',');
      }
      const response = await authService.api.get(`/api/showtimes/${showtimeUuid}/seat-map`, { params });
      const serverTime = response.headers.date ? new Date(response.headers.date).getTime() : (response.data.timestamp ? new Date(response.data.timestamp).getTime() : Date.now());
      const data = response.data.data ?? response.data;
      if (data) {
        data._serverTimeOffset = serverTime - Date.now();
      }
      return data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async syncSeatLocks(showtimeUuid, seatUuids) {
    try {
      const response = await authService.api.put('/api/showtimes/locks', {
        showtimeUuid,
        seatUuids
      });
      const serverTime = response.headers.date ? new Date(response.headers.date).getTime() : (response.data.timestamp ? new Date(response.data.timestamp).getTime() : Date.now());
      const data = response.data.data ?? response.data;
      if (data) {
        data._serverTimeOffset = serverTime - Date.now();
      }
      return data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async confirmBooking(showtimeUuid, seatUuids, combos = [], promotionCode = null) {
    try {
      const payload = {
        showtimeUuid,
        seatUuids,
        combos
      };
      if (promotionCode) {
        payload.promotionCode = promotionCode;
      }
      const response = await authService.api.post('/api/bookings/confirm', payload);
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async getMyBookings() {
    try {
      const response = await authService.api.get('/api/bookings/my-bookings');
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async getAdminBookings(keyword = '') {
    try {
      const params = {};
      if (keyword) {
        params.keyword = keyword;
      }
      const response = await authService.api.get('/api/bookings/admin', { params });
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async cancelBooking(bookingUuid) {
    try {
      const response = await authService.api.post(`/api/bookings/${bookingUuid}/cancel`);
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async checkInTicket(ticketCode) {
    try {
      const response = await authService.api.put(`/api/bookings/tickets/${ticketCode}/check-in`);
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async confirmOnlineBooking(movieUuid, promotionCode = null) {
    try {
      const payload = { movieUuid };
      if (promotionCode) {
        payload.promotionCode = promotionCode;
      }
      const response = await authService.api.post('/api/bookings/confirm-online', payload);
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async getVodStatus(movieUuid) {
    try {
      const response = await authService.api.get(`/api/vod/status/${movieUuid}`);
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async activateVodPlay(movieUuid) {
    try {
      const response = await authService.api.post(`/api/vod/play/${movieUuid}`);
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async vodHeartbeat(movieUuid, streamToken) {
    try {
      const response = await authService.api.post(`/api/vod/heartbeat/${movieUuid}?streamToken=${encodeURIComponent(streamToken)}`);
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async resendVodTicketEmail(movieUuid) {
    try {
      const response = await authService.api.post(`/api/vod/resend-ticket/${movieUuid}`);
      return response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }
}

/**
 * BE VOD API surface (keep in sync with VodController + BookingController):
 * - POST /api/bookings/confirm-online
 * - GET  /api/vod/status/{movieUuid}
 * - POST /api/vod/play/{movieUuid}
 * - POST /api/vod/heartbeat/{movieUuid}?streamToken=
 * - POST /api/vod/resend-ticket/{movieUuid}
 * - GET  /api/bookings/my-bookings (bookingType ONLINE, movieUuid)
 */

export const bookingService = new BookingService();
export default bookingService;
