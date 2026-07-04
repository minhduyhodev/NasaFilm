import { authService } from '../../auth/api/authService';

class AdminDiscoverService {
  async getAnalytics() {
    try {
      const response = await authService.api.get('/api/admin/discover/analytics');
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }
}

export const adminDiscoverService = new AdminDiscoverService();

export default adminDiscoverService;
