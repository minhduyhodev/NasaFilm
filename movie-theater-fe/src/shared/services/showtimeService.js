import { authService } from '../../features/auth/api/authService';

class ShowtimeService {
  async getAdminShowtimes({ page, size, unpaged = true } = {}) {
    try {
      const params = unpaged
        ? { unpaged: true }
        : { unpaged: false, page: page ?? 0, size: size ?? 50 };
      const response = await authService.api.get('/api/admin/showtimes', { params });
      const data = response.data.data ?? response.data;
      if (Array.isArray(data)) return data;
      return data?.content ?? [];
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async getPublicShowtimes({ cinemaUuid, date } = {}) {
    try {
      const params = {};
      if (cinemaUuid) params.cinemaUuid = cinemaUuid;
      if (date) params.date = date;
      const response = await authService.api.get('/api/showtimes', { params });
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

  async saveAutoShowtimes(showtimes, publishStatus = 'DRAFT') {
    try {
      const response = await authService.api.post('/api/admin/showtimes/auto-generate/save', {
        showtimes,
        publishStatus: publishStatus === 'DRAFT' ? null : publishStatus,
      });
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async cleanupDraftShowtimes() {
    try {
      const response = await authService.api.post('/api/admin/showtimes/cleanup-drafts');
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }
}

export const showtimeService = new ShowtimeService();
export default showtimeService;
