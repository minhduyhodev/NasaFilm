import { authService } from '../../features/auth/api/authService';

export const discoverService = {
  async getConfig() {
    const response = await authService.api.get('/api/discover/config');
    return response.data.data ?? response.data;
  },

  async match(payload) {
    const response = await authService.api.post('/api/discover/match', payload);
    return response.data.data ?? response.data;
  },
};

export default discoverService;
