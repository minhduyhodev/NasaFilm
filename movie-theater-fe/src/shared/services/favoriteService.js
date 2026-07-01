import { authService } from '../../features/auth/api/authService';

export const favoriteService = {
  async list() {
    const response = await authService.api.get('/api/favorites');
    return response.data.data ?? response.data ?? [];
  },

  async isFavorite(movieUuid) {
    const response = await authService.api.get(`/api/favorites/${movieUuid}/status`);
    return Boolean(response.data.data ?? response.data);
  },

  async add(movieUuid) {
    const response = await authService.api.post(`/api/favorites/${movieUuid}`);
    return response.data.data ?? response.data;
  },

  async remove(movieUuid) {
    const response = await authService.api.delete(`/api/favorites/${movieUuid}`);
    return response.data.data ?? response.data;
  },
};

export default favoriteService;
