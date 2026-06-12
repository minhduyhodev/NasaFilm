import { authService } from '../../features/auth/api/authService';

class BookingService {
  async getSeatMap(showtimeUuid, selectedSeatUuids = []) {
    try {
      const params = {};
      if (selectedSeatUuids && selectedSeatUuids.length > 0) {
        params.selectedSeatUuids = selectedSeatUuids.join(',');
      }
      const response = await authService.api.get(`/api/showtimes/${showtimeUuid}/seat-map`, { params });
      return response.data.data ?? response.data;
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
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async confirmBooking(showtimeUuid, seatUuids, combos = []) {
    try {
      const response = await authService.api.post('/api/bookings/confirm', {
        showtimeUuid,
        seatUuids,
        combos
      });
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
