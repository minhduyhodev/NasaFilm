import { authService } from '../../features/auth/api/authService';

export const showtimeRadarService = {
  async getPreference() {
    const response = await authService.api.get('/api/user/showtime-radar');
    return response.data.data ?? response.data;
  },

  async updatePreference(payload) {
    const response = await authService.api.put('/api/user/showtime-radar', payload);
    return response.data.data ?? response.data;
  },

  async getSuggestions() {
    const response = await authService.api.get('/api/user/showtime-radar/suggestions');
    return response.data.data ?? response.data ?? [];
  },

  async deletePreference() {
    const response = await authService.api.delete('/api/user/showtime-radar');
    return response.data.data ?? response.data;
  },
};

export default showtimeRadarService;
