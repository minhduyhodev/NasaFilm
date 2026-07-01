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
    const data = response.data.data ?? response.data ?? {};
    if (Array.isArray(data)) {
      return { suggestions: data, upcomingShowtimeCount: 0 };
    }
    return {
      suggestions: data.suggestions ?? [],
      upcomingShowtimeCount: data.upcomingShowtimeCount ?? 0,
    };
  },

  async deletePreference() {
    const response = await authService.api.delete('/api/user/showtime-radar');
    return response.data.data ?? response.data;
  },
};

export default showtimeRadarService;
