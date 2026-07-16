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

  async watchSeatMap(showtimeUuid) {
    try {
      await authService.api.post(`/api/showtimes/${showtimeUuid}/seat-map/watch`);
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async unwatchSeatMap(showtimeUuid) {
    try {
      await authService.api.delete(`/api/showtimes/${showtimeUuid}/seat-map/watch`);
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

  async confirmBooking(showtimeUuid, seatUuids, combos = [], promotionCode = null, paymentMethod = null, orbitRoomUuid = null, paymentIntentId = null) {
    try {
      const payload = {
        showtimeUuid,
        seatUuids,
        combos
      };
      if (promotionCode) {
        payload.promotionCode = promotionCode;
      }
      if (paymentMethod) {
        payload.paymentMethod = paymentMethod;
      }
      if (orbitRoomUuid) {
        payload.orbitRoomUuid = orbitRoomUuid;
      }
      if (paymentIntentId) {
        payload.paymentIntentId = paymentIntentId;
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

  async getPurchaseHistory() {
    try {
      const response = await authService.api.get('/api/bookings/purchase-history');
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async getAdminBookings(keyword = '', {
    page,
    size,
    unpaged = true,
    status,
    cinema,
    startDate,
    endDate,
  } = {}) {
    try {
      const params = {
        unpaged: unpaged ? true : undefined,
        page: unpaged ? undefined : page,
        size: unpaged ? undefined : size,
        status: status && status !== 'ALL' ? status : undefined,
        cinema: cinema || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      };
      if (keyword) {
        params.keyword = keyword;
      }
      const response = await authService.api.get('/api/bookings/admin', { params });
      const data = response.data.data ?? response.data;
      if (Array.isArray(data)) {
        return data;
      }
      return data?.content ?? [];
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async cancelBooking(bookingUuid, reason = null) {
    try {
      const payload = reason ? { reason } : {};
      const response = await authService.api.post(`/api/bookings/${bookingUuid}/cancel`, payload);
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async getCancellationPreview(bookingUuid) {
    try {
      const response = await authService.api.get(`/api/bookings/${bookingUuid}/cancellation-preview`);
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async getRefundStatus(bookingUuid) {
    try {
      const response = await authService.api.get(`/api/bookings/${bookingUuid}/refund-status`);
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async getAdminPendingRefunds() {
    try {
      const response = await authService.api.get('/api/admin/refunds');
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async getAdminRefundHistory() {
    try {
      const response = await authService.api.get('/api/admin/refunds/history');
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async approveRefund(refundUuid) {
    try {
      const response = await authService.api.post(`/api/admin/refunds/${refundUuid}/approve`);
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async checkInTicket(ticketCode) {
    try {
      const response = await authService.api.put(
        `/api/staff/tickets/${encodeURIComponent(ticketCode)}/check-in`,
      );
      return {
        data: response.data.data ?? response.data,
        message: response.data.message,
      };
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async confirmOnlineBooking(movieUuid, promotionCode = null, paymentMethod = null, paymentIntentId = null) {
    try {
      const payload = { movieUuid };
      if (promotionCode) {
        payload.promotionCode = promotionCode;
      }
      if (paymentMethod) {
        payload.paymentMethod = paymentMethod;
      }
      if (paymentIntentId) {
        payload.paymentIntentId = paymentIntentId;
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

  async getVodStatusBatch(movieUuids = []) {
    const unique = [...new Set((movieUuids || []).filter(Boolean))];
    if (unique.length === 0) return {};
    try {
      const response = await authService.api.post('/api/vod/status/batch', {
        movieUuids: unique.slice(0, 50),
      });
      return response.data.data ?? response.data ?? {};
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async activateVodPlay(movieUuid, bookingUuid = null) {
    try {
      const params = bookingUuid ? `?bookingUuid=${encodeURIComponent(bookingUuid)}` : '';
      const response = await authService.api.post(`/api/vod/play/${movieUuid}${params}`);
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async vodHeartbeat(movieUuid, streamToken, positionSeconds = null, durationSeconds = null) {
    try {
      const params = new URLSearchParams({ streamToken });
      if (positionSeconds != null) params.set('positionSeconds', String(Math.floor(positionSeconds)));
      if (durationSeconds != null) params.set('durationSeconds', String(Math.floor(durationSeconds)));
      const response = await authService.api.post(`/api/vod/heartbeat/${movieUuid}?${params.toString()}`);
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async getVodHistory() {
    try {
      const response = await authService.api.get('/api/vod/history');
      return response.data.data ?? response.data ?? [];
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async resendVodTicketEmail(movieUuid) {
    try {
      const response = await authService.api.post(`/api/vod/resend-ticket/${movieUuid}`);
      return response.data.data ?? response.data;
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
