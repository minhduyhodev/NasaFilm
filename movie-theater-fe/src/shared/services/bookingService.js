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
}

export const bookingService = new BookingService();
export default bookingService;
