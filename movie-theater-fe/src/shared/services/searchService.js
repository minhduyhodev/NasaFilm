import { authService } from '../../features/auth/api/authService';

export const searchService = {
  async search(query, type = 'all') {
    const response = await authService.api.get('/api/search', {
      params: { q: query, type },
    });
    return response.data.data ?? response.data;
  },
};

export default searchService;
