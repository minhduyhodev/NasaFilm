import { authService } from '../../auth/api/authService';

class AdminShowtimeRadarService {
  async getPreferences({ query = '', enabled } = {}) {
    try {
      const params = {};
      if (query) params.query = query;
      if (enabled !== undefined && enabled !== null && enabled !== '') {
        params.enabled = enabled;
      }
      const response = await authService.api.get('/api/admin/showtime-radar/preferences', { params });
      return response.data.data ?? response.data ?? [];
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async updatePreference(userUuid, payload) {
    try {
      const response = await authService.api.put(
        `/api/admin/showtime-radar/preferences/${userUuid}`,
        payload,
      );
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async deletePreference(userUuid) {
    try {
      const response = await authService.api.delete(
        `/api/admin/showtime-radar/preferences/${userUuid}`,
      );
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }
}

export const adminShowtimeRadarService = new AdminShowtimeRadarService();
export default adminShowtimeRadarService;
