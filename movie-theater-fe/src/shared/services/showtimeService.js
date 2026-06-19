import { authService } from '../../features/auth/api/authService';

class ShowtimeService {
  async getAdminShowtimes() {
    try {
      const response = await authService.api.get('/api/admin/showtimes');
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async getPublicShowtimes() {
    try {
      const response = await authService.api.get('/api/showtimes');
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async createShowtime(data) {
    try {
      const response = await authService.api.post('/api/admin/showtimes', data);
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async updateShowtimeStatus(showtimeUuid, status) {
    try {
      const response = await authService.api.put(`/api/admin/showtimes/${showtimeUuid}/status`, null, {
        params: { status }
      });
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async getAutoShowtimesPreview(data) {
    try {
      const response = await authService.api.post('/api/admin/showtimes/auto-generate/preview', data);
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async saveAutoShowtimes(requests) {
    try {
      const response = await authService.api.post('/api/admin/showtimes/auto-generate/save', requests);
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }
}

export const showtimeService = new ShowtimeService();
export default showtimeService;
