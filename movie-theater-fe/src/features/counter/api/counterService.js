import { authService } from '../../auth/api/authService';

class CounterService {
  async getMovies(params = {}) {
    try {
      const response = await authService.api.get('/api/movies', {
        params: { ...params, requireBookableShowtime: true }
      });
      const data = response.data.data ?? response.data;
      return data?.content ?? data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async getShowtimes({ cinemaUuid, date } = {}) {
    try {
      const params = {};
      if (cinemaUuid) params.cinemaUuid = cinemaUuid;
      if (date) params.date = date;
      const response = await authService.api.get('/api/showtimes', { params });
      const data = response.data.data ?? response.data;
      return data?.content ?? data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async getWalkInCustomer() {
    try {
      const response = await authService.api.get('/api/staff/customers/walk-in');
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async createCustomer(customerData) {
    try {
      const response = await authService.api.post('/api/staff/customers', customerData);
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async searchCustomer(email) {
    try {
      // Backend doesn't have a separate search endpoint, but quick customer creation
      // returns existingAccount=true if phone/email matches, so we can use that behavior
      // or staff can just register the customer.
      // Wait, can we fetch user detail or search by phone? Let's check.
      const response = await authService.api.get('/api/admin/users', {
        params: { query: email, page: 0, size: 10 }
      });
      const rawData = response.data.data ?? response.data;
      return rawData?.content ?? (Array.isArray(rawData) ? rawData : []);
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async confirmCounterBooking(payload) {
    try {
      const response = await authService.api.post('/api/staff/bookings/confirm', payload);
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async checkInTicket(ticketCode, currentRoomId = null) {
    try {
      const params = {};
      if (currentRoomId) {
        params.currentRoomId = currentRoomId;
      }
      const response = await authService.api.put(`/api/bookings/tickets/${ticketCode}/check-in`, null, { params });
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }
}

export const counterService = new CounterService();
export default counterService;
